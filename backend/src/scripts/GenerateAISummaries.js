#!/usr/bin/env node

/**
 * Generate AI Summaries for Proposals - Configurable Script
 * Only processes proposals that are enabled for reviewing (status: 'active' and reviewingEnabled: true)
 * 
 * Usage: node GenerateAISummaries.js [config-file]
 * Example: node GenerateAISummaries.js ./configs/ai-summary-config.json
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

// Import models
const Proposal = require('../models/Proposal');

// Predefined configurations
const CONFIGS = {
  // Default: Standard processing for review-enabled proposals
  default: {
    onlyReviewEnabled: true,
    requiredStatus: ['active'],
    forceRegenerate: false,
    aiModel: "claude-3-haiku-20240307",
    maxTokens: 250,
    temperature: 0.2,
    batchSize: 10,
    delayBetweenRequests: 1500,
    verbose: true,
    dryRun: false
  },
  
  // Fast: Higher batch size, less delay
  fast: {
    onlyReviewEnabled: true,
    requiredStatus: ['active'],
    forceRegenerate: false,
    aiModel: "claude-3-haiku-20240307",
    maxTokens: 250,
    temperature: 0.2,
    batchSize: 15,
    delayBetweenRequests: 1000,
    verbose: true,
    dryRun: false
  },
  
  // Conservative: Smaller batches, more delay
  conservative: {
    onlyReviewEnabled: true,
    requiredStatus: ['active'],
    forceRegenerate: false,
    aiModel: "claude-3-haiku-20240307",
    maxTokens: 250,
    temperature: 0.2,
    batchSize: 3,
    delayBetweenRequests: 3000,
    verbose: true,
    dryRun: false
  },
  
  // Dry run: Testing without API calls
  dryrun: {
    onlyReviewEnabled: true,
    requiredStatus: ['active'],
    forceRegenerate: false,
    aiModel: "claude-3-haiku-20240307",
    maxTokens: 250,
    temperature: 0.2,
    batchSize: 10,
    delayBetweenRequests: 0,
    verbose: true,
    dryRun: true
  },
  
  // Force: Regenerate all existing summaries
  force: {
    onlyReviewEnabled: true,
    requiredStatus: ['active'],
    forceRegenerate: true,
    aiModel: "claude-3-haiku-20240307",
    maxTokens: 250,
    temperature: 0.2,
    batchSize: 5,
    delayBetweenRequests: 2500,
    verbose: true,
    dryRun: false
  },
  
  // All: Process all proposals regardless of status (for migration)
  all: {
    onlyReviewEnabled: false,
    requiredStatus: ['active', 'inactive', 'completed'],
    forceRegenerate: false,
    aiModel: "claude-3-haiku-20240307",
    maxTokens: 250,
    temperature: 0.2,
    batchSize: 8,
    delayBetweenRequests: 2000,
    verbose: true,
    dryRun: false
  }
};

const DEFAULT_CONFIG = CONFIGS.default;

/**
 * Load configuration from predefined configs, file, or use defaults
 */
function loadConfig(configName) {
  if (!configName) {
    return DEFAULT_CONFIG;
  }
  
  // Check if it's a predefined config
  if (CONFIGS[configName]) {
    console.log(`✅ Using predefined config: "${configName}"`);
    return CONFIGS[configName];
  }
  
  // Check if it's a file path
  if (configName.includes('.') || configName.includes('/')) {
    try {
      const fullPath = path.resolve(configName);
      const config = require(fullPath);
      console.log(`✅ Loaded config from file: ${configName}`);
      return { ...DEFAULT_CONFIG, ...config };
    } catch (error) {
      console.error(`❌ Failed to load config file: ${configName}`);
      console.error(error.message);
      process.exit(1);
    }
  }
  
  // Unknown config name
  console.error(`❌ Unknown config: "${configName}"`);
  console.log('\n📋 Available predefined configs:');
  Object.keys(CONFIGS).forEach(name => {
    console.log(`   - ${name}`);
  });
  console.log('\nOr specify a JSON file path.');
  process.exit(1);
}

/**
 * AI Summary Generation Class
 */
class AISummaryGenerator {
  constructor(config) {
    this.config = config;
    
    // Initialize Anthropic only if API key is present and not in dry-run mode
    if (process.env.ANTHROPIC_API_KEY && !config.dryRun) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    }
  }

  /**
   * Check if AI service is configured
   */
  isConfigured() {
    return !!this.anthropic || this.config.dryRun;
  }

  /**
   * Format proposal data for AI processing
   */
  formatProposalForAI(proposal) {
    const sections = [];
    
    // Budget information for context
    sections.push(`Requested Budget: ₳${proposal.budget?.total?.toLocaleString() || '0'}`);
    
    // Challenge context
    if (proposal.challengeId?.name) {
      sections.push(`Challenge: ${proposal.challengeId.name}`);
    }
    
    // Problem statement
    if (proposal.content?.problemStatement) {
      sections.push(`\nProblem Statement:\n${proposal.content.problemStatement}`);
    }
    
    // Solution summary
    if (proposal.content?.solutionSummary) {
      sections.push(`\nSolution Summary:\n${proposal.content.solutionSummary}`);
    }
    
    // Full proposal content (main content)
    if (proposal.content?.solution) {
      sections.push(`\nDetailed Solution:\n${proposal.content.solution}`);
    }
    
    return sections.join('\n');
  }

  /**
   * Generate AI summary for a single proposal
   */
  async generateProposalSummary(proposal) {
    if (!this.anthropic) {
      if (this.config.dryRun) {
        return '[DRY RUN] AI summary would be generated here';
      }
      throw new Error('AI service not configured. Please add ANTHROPIC_API_KEY to environment variables.');
    }

    try {
      // Prepare the proposal content for summarization
      const proposalText = this.formatProposalForAI(proposal);
      
      // Generate summary using Claude
      const response = await this.anthropic.messages.create({
        model: this.config.aiModel,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [{
          role: "user",
          content: `Analyze this Cardano Project Catalyst proposal. Be COMPLETELY NEUTRAL - no judgments or evaluations.

FORBIDDEN WORDS: promising, strong, weak, qualified, good, bad, impressive, concerning, appears, seems, potential, significant, robust, comprehensive

Write 2-3 SHORT paragraphs (140 words max total):

Technical Components: The proposal includes [list components]. Dependencies include [list dependencies].

Impact & Evidence: The proposal claims [state specific claims]. Reviewers should examine whether metrics, past results, or similar implementations support these impact claims.

Review Points: Reviewers should verify if the team has capability to [specific technical requirements].

Use ONLY factual statements. No opinions. DO NOT use markdown formatting like ** or ###.

Proposal Details:
${proposalText}`
        }]
      });

      return response.content[0].text;
    } catch (error) {
      console.error('Error generating AI summary:', error);
      throw new Error(`Failed to generate summary: ${error.message}`);
    }
  }
}

/**
 * Build query for proposals to process
 */
function buildProposalQuery(config) {
  const query = {};
  
  // Filter by review-enabled status
  if (config.onlyReviewEnabled) {
    query.reviewingEnabled = true;
  }
  
  // Filter by proposal status
  if (config.requiredStatus && config.requiredStatus.length > 0) {
    query.status = { $in: config.requiredStatus };
  }
  
  // Filter by existing summaries
  if (!config.forceRegenerate) {
    query.$or = [
      { aiSummary: { $exists: false } },
      { aiSummary: null },
      { aiSummary: '' }
    ];
  }
  
  return query;
}

/**
 * Main generation function
 */
async function generateAISummaries(config) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    if (config.verbose) {
      console.log('✅ Connected to MongoDB');
    }

    // Initialize AI generator
    const generator = new AISummaryGenerator(config);
    
    // Check if AI service is configured
    if (!generator.isConfigured()) {
      console.error('❌ AI service not configured. Please add ANTHROPIC_API_KEY to .env file or use --dry-run');
      process.exit(1);
    }

    // Build query
    const query = buildProposalQuery(config);
    
    // Count total proposals
    const totalCount = await Proposal.countDocuments(query);
    
    console.log('\n📋 Generation Configuration:');
    console.log(`   Only Review-Enabled: ${config.onlyReviewEnabled}`);
    console.log(`   Required Status: [${config.requiredStatus.join(', ')}]`);
    console.log(`   Force Regenerate: ${config.forceRegenerate}`);
    console.log(`   AI Model: ${config.aiModel}`);
    console.log(`   Dry Run: ${config.dryRun}`);
    console.log(`   Found ${totalCount} proposals to process`);
    console.log('');
    
    if (totalCount === 0) {
      console.log('✅ No proposals need AI summaries!');
      return { processed: 0, successful: 0, failed: 0 };
    }

    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    // Process in batches
    while (processedCount < totalCount) {
      const proposals = await Proposal.find(query)
        .skip(processedCount)
        .limit(config.batchSize)
        .populate('challengeId');
      
      if (proposals.length === 0) break;
      
      if (config.verbose) {
        console.log(`\n📦 Processing batch ${Math.floor(processedCount / config.batchSize) + 1}...`);
      }
      
      for (const proposal of proposals) {
        try {
          if (config.verbose) {
            console.log(`  🔄 [${processedCount + 1}/${totalCount}] Processing: ${proposal.proposalTitle}`);
            console.log(`     Status: ${proposal.status} | Review Enabled: ${proposal.reviewingEnabled}`);
            console.log(`     Budget: ₳${proposal.budget?.total?.toLocaleString() || '0'}`);
          }
          
          // Generate summary
          const summary = await generator.generateProposalSummary(proposal);
          
          if (!config.dryRun) {
            // Save to database
            proposal.aiSummary = summary;
            proposal.aiSummaryGeneratedAt = new Date();
            await proposal.save();
          }
          
          if (config.verbose) {
            const wordCount = summary.split(' ').length;
            console.log(`  ✅ Success: Generated summary (${wordCount} words)`);
          }
          successCount++;
          
          // Rate limiting
          if (processedCount < totalCount - 1 && !config.dryRun) {
            await new Promise(resolve => setTimeout(resolve, config.delayBetweenRequests));
          }
          
        } catch (error) {
          console.error(`  ❌ Error processing "${proposal.proposalTitle}": ${error.message}`);
          errorCount++;
        }
        
        processedCount++;
      }
      
      // Progress update
      if (config.verbose) {
        const percentComplete = Math.round((processedCount / totalCount) * 100);
        console.log(`\n📊 Progress: ${percentComplete}% (${processedCount}/${totalCount})`);
        console.log(`   ✅ Success: ${successCount} | ❌ Errors: ${errorCount}`);
      }
    }
    
    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 AI SUMMARY GENERATION COMPLETE!');
    console.log('='.repeat(50));
    console.log(`Total processed: ${processedCount}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
    if (processedCount > 0) {
      console.log(`Success rate: ${Math.round((successCount / processedCount) * 100)}%`);
    }
    
    return { 
      processed: processedCount, 
      successful: successCount, 
      failed: errorCount 
    };
    
  } catch (error) {
    console.error('❌ AI summary generation failed:', error.message);
    if (config.verbose) {
      console.error(error.stack);
    }
    throw error;
  } finally {
    await mongoose.connection.close();
  }
}

// CLI execution
async function main() {
  const configName = process.argv[2];
  
  console.log('🤖 AI Summary Generator');
  console.log('='.repeat(50));
  
  if (!configName) {
    console.log('ℹ️  Using default configuration.');
    console.log('\n📋 Available predefined configs:');
    Object.keys(CONFIGS).forEach(name => {
      const config = CONFIGS[name];
      let description = '';
      if (name === 'default') description = 'Standard processing';
      else if (name === 'fast') description = 'Faster processing (higher batch, less delay)';
      else if (name === 'conservative') description = 'Slower processing (smaller batch, more delay)';
      else if (name === 'dryrun') description = 'Test mode (no API calls)';
      else if (name === 'force') description = 'Regenerate all existing summaries';
      else if (name === 'all') description = 'Process all proposals (any status)';
      
      console.log(`   - ${name.padEnd(12)} ${description}`);
    });
    console.log('\nUsage examples:');
    console.log('   node GenerateAISummaries.js fast');
    console.log('   node GenerateAISummaries.js dryrun');
    console.log('   node GenerateAISummaries.js ./my-config.json');
    console.log('');
  }
  
  const config = loadConfig(configName);
  
  try {
    await generateAISummaries(config);
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

// Handle interruption
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Script interrupted by user');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
});

// Execute if run directly
if (require.main === module) {
  main();
}

// Export for programmatic use
module.exports = { 
  generateAISummaries, 
  AISummaryGenerator, 
  DEFAULT_CONFIG 
};