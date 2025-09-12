#!/usr/bin/env node

/**
 * Process Catalyst Proposals - Configurable Processing
 * Convert raw CatalystExplorer data into our Proposal model
 * 
 * Usage: node ProcessCatalystProposals.js [config-file]
 * Example: node ProcessCatalystProposals.js ./configs/f14-processing.json
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Import models
const Proposal = require('../models/Proposal');
const Challenge = require('../models/Challenge');
const Fund = require('../models/Fund');

// Raw import schema (must match ImportCatalystProposals.js)
const catalystImportSchema = new mongoose.Schema({
  catalystExplorerData: mongoose.Schema.Types.Mixed,
  challenge: String,
  budget: Number,
  currency: String,
  title: String,
  importedAt: Date,
  processed: Boolean,
  importConfig: {
    challengeName: String,
    minBudget: Number,
    maxBudget: Number,
    currency: String,
    importDate: Date
  }
});

const CatalystImport = mongoose.model('CatalystImport', catalystImportSchema);

// Catalyst Explorer API Tag Mapping - Maps raw Catalyst tags to our simplified categories
const TAG_MAPPING = {
  governance: new Set(['governance', 'dao']),
  education: new Set(['education', 'learn_to_earn', 'training', 'translation']),
  community_outreach: new Set(['connected_community', 'community', 'community_outreach', 'social_media']),
  development_tools: new Set(['developer_tools', 'l2', 'infrastructure', 'analytics', 'ai', 'research', 'utxo', 'p2p']),
  identity_security: new Set(['identity_verification', 'cybersecurity', 'security', 'authentication', 'privacy']),
  defi: new Set(['defi', 'payments', 'stablecoin', 'risk_management', 'yield', 'staking', 'lending']),
  real_world_applications: new Set(['wallet', 'marketplace', 'manufacturing', 'iot', 'financial_services', 'ecommerce', 
                                   'business_services', 'supply_chain', 'real_estate', 'healthcare', 'tourism', 
                                   'entertainment', 'rwa', 'music', 'tokenization']),
  events_marketing: new Set(['events', 'marketing', 'hackathons', 'accelerator', 'incubator']),
  interoperability: new Set(['cross_chain', 'interoperability', 'off_chain', 'legal', 'policy_advocacy', 'standards']),
  sustainability: new Set(['sustainability', 'environment', 'agriculture']),
  smart_contracts: new Set(['smart_contract', 'smart_contracts', 'audit', 'oracles']),
  gamefi: new Set(['gaming', 'gamefi', 'entertainment', 'metaverse']),
  nft: new Set(['nft', 'cnft', 'collectibles', 'digital_twin'])
};

/**
 * Map raw Catalyst API tags to our simplified interest categories
 * @param {string[]} catalystTags - Raw tags from Catalyst API
 * @returns {string[]} - Mapped interest tags that match INTEREST_TAGS
 */
function mapCatalystTagsToInterests(catalystTags) {
  if (!catalystTags || !Array.isArray(catalystTags)) {
    return [];
  }
  
  const mappedTags = new Set();
  
  catalystTags.forEach(rawTag => {
    const normalizedTag = rawTag.toLowerCase().replace(/\s+/g, '_');
    
    // Find which category this tag belongs to
    for (const [category, tags] of Object.entries(TAG_MAPPING)) {
      if (tags.has(normalizedTag)) {
        mappedTags.add(category);
        break; // Tag found, no need to check other categories
      }
    }
  });
  
  return Array.from(mappedTags);
}

// Default configuration
const DEFAULT_CONFIG = {
  // Target Fund & Challenge
  fundNumber: 14,
  challengeName: "F14: Cardano Use Case: Partners & Products",
  
  // Processing options
  proposalStatus: 'inactive', // 'inactive', 'active', 'completed'
  skipDuplicates: true,
  overwriteExisting: false,
  
  // Data mapping options
  includeTeamData: true,
  includeContent: true,
  includeMilestones: false, // Most API data doesn't have good milestone structure
  mapTags: true, // Enable tag mapping to our interest categories
  
  // Output settings
  verbose: true,
  dryRun: false // Set to true to simulate without creating proposals
};

/**
 * Load configuration from file or use defaults
 */
function loadConfig(configPath) {
  if (configPath) {
    try {
      const fullPath = path.resolve(configPath);
      const config = require(fullPath);
      return { ...DEFAULT_CONFIG, ...config };
    } catch (error) {
      console.error(`❌ Failed to load config file: ${configPath}`);
      console.error(error.message);
      process.exit(1);
    }
  }
  return DEFAULT_CONFIG;
}

/**
 * Map API team data to our team format
 */
function mapTeamData(apiTeam) {
  if (!apiTeam || !Array.isArray(apiTeam)) {
    return [];
  }
  
  return apiTeam.map(member => ({
    name: member.name || 'Unknown',
    role: member.role || 'Team Member',
    bio: member.bio || '',
    linkedin: member.linkedin || '',
    github: member.github || '',
    twitter: member.twitter || ''
  }));
}

/**
 * Extract proposer info from team data (first team member or separate proposer field)
 */
function extractProposer(apiProposal) {
  // Try to get proposer from dedicated field first
  if (apiProposal.proposer) {
    return {
      name: apiProposal.proposer.name || 'Unknown',
      entity: apiProposal.proposer.entity || null,
      previousProjects: apiProposal.proposer.previousProjects || []
    };
  }
  
  // Fallback: use first team member
  if (apiProposal.team && apiProposal.team.length > 0) {
    const firstMember = apiProposal.team[0];
    return {
      name: firstMember.name || 'Unknown',
      entity: firstMember.role || null,
      previousProjects: []
    };
  }
  
  // Default empty proposer
  return {
    name: null,
    entity: null,
    previousProjects: []
  };
}

/**
 * Map milestone data (basic implementation)
 */
function mapMilestones(apiProposal) {
  // CatalystExplorer API doesn't have standardized milestone data
  // This is a placeholder for when better milestone data becomes available
  if (apiProposal.schedule?.milestones) {
    return apiProposal.schedule.milestones.map((milestone, index) => ({
      title: milestone.title || `Milestone ${index + 1}`,
      description: milestone.description || '',
      deliverables: milestone.deliverables || [],
      acceptanceCriteria: milestone.acceptanceCriteria || '',
      budget: milestone.budget || 0,
      duration: {
        months: milestone.duration?.months || null,
        hours: milestone.duration?.hours || null
      }
    }));
  }
  
  return [];
}

/**
 * Convert raw Catalyst data to our Proposal format
 */
function mapToProposal(apiProposal, fundId, challengeId, config) {
  const proposalData = {
    // Identifiers
    CatalystId: apiProposal.id?.toString() || null,
    fundId: fundId,
    challengeId: challengeId,
    
    // Basic info
    proposalTitle: apiProposal.title,
    
    // Proposer information
    proposer: extractProposer(apiProposal),
    
    // Content mapping
    content: {
      problemStatement: apiProposal.problem || '',
      solutionSummary: apiProposal.solution || '',
      solution: config.includeContent ? (apiProposal.content || '') : '',
      impact: apiProposal.impact || '',
      feasibility: apiProposal.feasibility || '',
      supportingDocs: [
        apiProposal.website,
        apiProposal.link,
        ...(apiProposal.links || [])
      ].filter(Boolean),
      dependencies: apiProposal.dependencies || '',
      openSource: {
        isOpen: apiProposal.openSource?.isOpen || false,
        license: apiProposal.openSource?.license || null
      }
    },
    
    // Budget information
    budget: {
      total: apiProposal.amount_requested || 0,
      currency: apiProposal.currency || 'ADA',
      duration: {
        months: apiProposal.duration?.months || null,
        hours: apiProposal.duration?.hours || null
      },
      valueForMoney: apiProposal.valueForMoney || ''
    },
    
    // Team information
    team: config.includeTeamData ? mapTeamData(apiProposal.team) : [],
    
    // Milestones
    milestones: config.includeMilestones ? mapMilestones(apiProposal) : [],
    
    // Metadata
    metadata: {
      theme: apiProposal.campaign?.title || config.challengeName,
      subtheme: apiProposal.subtheme || '',
      tags: config.mapTags ? mapCatalystTagsToInterests(apiProposal.tags || []) : [],
      rawCatalystTags: apiProposal.tags || [],
      language: apiProposal.language || 'en',
      translation: {
        needed: false,
        originalLanguage: apiProposal.language || 'en'
      }
    },
    
    // Status - configurable
    status: config.proposalStatus,
    reviewingEnabled: config.proposalStatus === 'active'
  };
  
  return proposalData;
}

/**
 * Main processing function
 */
async function processCatalystProposals(config) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    if (config.verbose) {
      console.log('🔗 Connected to MongoDB');
    }

    // Find Fund and Challenge
    const fund = await Fund.findOne({ fundNumber: config.fundNumber });
    const challenge = await Challenge.findOne({ name: config.challengeName });

    if (!fund) {
      throw new Error(`Fund ${config.fundNumber} not found in database`);
    }
    if (!challenge) {
      throw new Error(`Challenge "${config.challengeName}" not found in database`);
    }
    
    if (config.verbose) {
      console.log(`✅ Found Fund: "${fund.name}" (${fund._id})`);
      console.log(`✅ Found Challenge: "${challenge.name}" (${challenge._id})`);
    }

    // Get unprocessed raw imports
    const rawImports = await CatalystImport.find({ 
      challenge: config.challengeName,
      processed: false 
    });

    console.log('\n📋 Processing Configuration:');
    console.log(`   Challenge: ${config.challengeName}`);
    console.log(`   Target Status: ${config.proposalStatus}`);
    console.log(`   Skip Duplicates: ${config.skipDuplicates}`);
    console.log(`   Dry Run: ${config.dryRun}`);
    console.log(`   Raw Imports to Process: ${rawImports.length}`);
    console.log('');

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const rawImport of rawImports) {
      const apiProposal = rawImport.catalystExplorerData;
      
      if (config.verbose) {
        console.log(`\n🔄 Processing: "${apiProposal.title}"`);
        console.log(`   Budget: ${apiProposal.amount_requested?.toLocaleString()} ${apiProposal.currency}`);
        console.log(`   Team members: ${apiProposal.team?.length || 0}`);
      }
      
      try {
        // Validate required data
        if (!apiProposal.title || !apiProposal.amount_requested) {
          console.warn(`⚠️  Skipping invalid proposal: missing title or budget`);
          skipped++;
          continue;
        }
        
        // Check for duplicates in proposals collection
        if (config.skipDuplicates) {
          const existingProposal = await Proposal.findOne({
            proposalTitle: apiProposal.title,
            'budget.total': apiProposal.amount_requested
          });
          
          if (existingProposal) {
            if (!config.overwriteExisting) {
              if (config.verbose) {
                console.log(`⏭️  Skipping duplicate: "${apiProposal.title}"`);
              }
              skipped++;
              // Mark as processed even if skipped
              if (!config.dryRun) {
                await CatalystImport.findByIdAndUpdate(rawImport._id, { processed: true });
              }
              continue;
            } else {
              if (config.verbose) {
                console.log(`🔄 Updating existing proposal: "${apiProposal.title}"`);
              }
            }
          }
        }
        
        // Map to our Proposal model
        const proposalData = mapToProposal(apiProposal, fund._id, challenge._id, config);
        
        // Log tag mapping if enabled and verbose
        if (config.mapTags && config.verbose && apiProposal.tags && apiProposal.tags.length > 0) {
          const mappedTags = mapCatalystTagsToInterests(apiProposal.tags);
          console.log(`   📋 Tag mapping: [${apiProposal.tags.join(', ')}] → [${mappedTags.join(', ')}]`);
        }
        
        if (!config.dryRun) {
          // Create or update proposal
          let proposal;
          if (config.overwriteExisting) {
            proposal = await Proposal.findOneAndUpdate(
              { proposalTitle: apiProposal.title, 'budget.total': apiProposal.amount_requested },
              proposalData,
              { new: true, upsert: true }
            );
          } else {
            proposal = new Proposal(proposalData);
            await proposal.save();
          }
          
          // Mark raw import as processed
          await CatalystImport.findByIdAndUpdate(rawImport._id, { processed: true });
          
          if (config.verbose) {
            console.log(`✅ ${config.overwriteExisting ? 'Updated' : 'Created'} Proposal: ${proposal._id}`);
            console.log(`   Status: ${proposal.status}`);
            console.log(`   Reviewing Enabled: ${proposal.reviewingEnabled}`);
          }
        } else {
          if (config.verbose) {
            console.log(`🧪 DRY RUN - Would create proposal with:`);
            console.log(`   Title: ${proposalData.proposalTitle}`);
            console.log(`   Budget: ${proposalData.budget.total} ${proposalData.budget.currency}`);
            console.log(`   Status: ${proposalData.status}`);
          }
        }
        
        processed++;
        
      } catch (error) {
        console.error(`❌ Error processing "${apiProposal.title}":`, error.message);
        errors++;
        if (config.verbose) {
          console.error(error.stack);
        }
      }
    }

    console.log(`\n🎉 Processing completed!`);
    console.log(`📊 Results:`);
    console.log(`   - Raw imports processed: ${rawImports.length}`);
    console.log(`   - Proposals ${config.dryRun ? 'would be ' : ''}created/updated: ${processed}`);
    console.log(`   - Skipped: ${skipped}`);
    console.log(`   - Errors: ${errors}`);
    console.log(`   - Challenge: ${config.challengeName}`);
    console.log(`   - Target Status: ${config.proposalStatus}`);
    
    return { processed, skipped, errors, total: rawImports.length };
    
  } catch (error) {
    console.error('❌ Processing failed:', error.message);
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
  const configPath = process.argv[2];
  const config = loadConfig(configPath);
  
  if (!configPath) {
    console.log('ℹ️  Using default configuration. You can specify a config file:');
    console.log('   node ProcessCatalystProposals.js ./configs/my-processing-config.json');
    console.log('');
  }
  
  try {
    await processCatalystProposals(config);
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

// Export for programmatic use
module.exports = { 
  processCatalystProposals, 
  CatalystImport, 
  DEFAULT_CONFIG,
  mapToProposal
};