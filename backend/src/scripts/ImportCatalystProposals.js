#!/usr/bin/env node

/**
 * Import Catalyst Proposals - Configurable Bulk Import
 * Store complete API responses from CatalystExplorer.com for later processing
 * 
 * Usage: node ImportCatalystProposals.js [config-file]
 * Example: node ImportCatalystProposals.js ./configs/f14-partners.json
 */

const mongoose = require('mongoose');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

// Raw import schema for storing unprocessed Catalyst data
const catalystImportSchema = new mongoose.Schema({
  catalystExplorerData: mongoose.Schema.Types.Mixed,  // Complete API response
  challenge: String,
  budget: Number,
  currency: String,
  title: String,
  importedAt: { type: Date, default: Date.now },
  processed: { type: Boolean, default: false },
  importConfig: {
    challengeName: String,
    minBudget: Number,
    maxBudget: Number,
    currency: String,
    importDate: Date
  }
});

const CatalystImport = mongoose.model('CatalystImport', catalystImportSchema);

// Default configuration
const DEFAULT_CONFIG = {
  // Target criteria
  challengeName: "F14: Cardano Use Case: Partners & Products",
  minBudget: 500000,
  maxBudget: null, // null = no limit
  currency: "ADA",
  
  // API settings
  apiBaseUrl: "https://www.catalystexplorer.com/api/v1/proposals",
  includeParams: "campaign,team,schedule.milestones",
  perPage: 100,
  maxPages: 50,
  rateLimitMs: 200,
  
  // Output settings
  verbose: true
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
 * Check if proposal matches import criteria
 */
function matchesCriteria(proposal, config) {
  // Check challenge name
  if (proposal.campaign?.title !== config.challengeName) {
    return false;
  }
  
  // Check minimum budget
  if (config.minBudget && proposal.amount_requested < config.minBudget) {
    return false;
  }
  
  // Check maximum budget
  if (config.maxBudget && proposal.amount_requested > config.maxBudget) {
    return false;
  }
  
  // Check currency (if specified)
  if (config.currency && proposal.currency !== config.currency) {
    return false;
  }
  
  return true;
}

/**
 * Main import function
 */
async function importCatalystProposals(config) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    if (config.verbose) {
      console.log('🔗 Connected to MongoDB');
    }

    let imported = 0;
    let totalChecked = 0;
    const importDate = new Date();

    console.log('\n📋 Import Configuration:');
    console.log(`   Challenge: ${config.challengeName}`);
    console.log(`   Budget Range: ${config.minBudget?.toLocaleString()} - ${config.maxBudget?.toLocaleString() || 'unlimited'} ${config.currency}`);
    console.log(`   Max Pages: ${config.maxPages}`);
    console.log('');

    // Search through multiple pages
    for (let page = 1; page <= config.maxPages; page++) {
      if (config.verbose) {
        console.log(`🔍 Checking page ${page}...`);
      }
      
      const url = `${config.apiBaseUrl}?include=${config.includeParams}&per_page=${config.perPage}&page=${page}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`⚠️  API Error on page ${page}: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      const apiProposals = data.data || [];
      totalChecked += apiProposals.length;
      
      if (apiProposals.length === 0) {
        if (config.verbose) {
          console.log(`📄 Empty page ${page}, ending search...`);
        }
        break;
      }

      // Filter and store matching proposals
      for (const apiProposal of apiProposals) {
        if (matchesCriteria(apiProposal, config)) {
          
          if (config.verbose) {
            console.log(`\n🎯 Found: "${apiProposal.title}"`);
            console.log(`   Budget: ${apiProposal.amount_requested?.toLocaleString()} ${apiProposal.currency}`);
            console.log(`   Team: ${apiProposal.team?.length || 0} members`);
          }
          
          // Validate essential data
          if (!apiProposal.id || !apiProposal.title) {
            console.warn(`⚠️  Skipping invalid proposal: missing ID or title`);
            continue;
          }

          // Check for duplicates
          const existingImport = await CatalystImport.findOne({
            'catalystExplorerData.id': apiProposal.id
          });

          if (existingImport) {
            if (config.verbose) {
              console.log(`⏭️  Skipping duplicate: "${apiProposal.title}"`);
            }
            continue;
          }

          // Store complete raw data
          const importRecord = new CatalystImport({
            catalystExplorerData: apiProposal,  // Complete API response
            challenge: config.challengeName,
            budget: apiProposal.amount_requested,
            currency: apiProposal.currency,
            title: apiProposal.title,
            processed: false,
            importConfig: {
              challengeName: config.challengeName,
              minBudget: config.minBudget,
              maxBudget: config.maxBudget,
              currency: config.currency,
              importDate: importDate
            }
          });
          
          await importRecord.save();
          imported++;
          
          if (config.verbose) {
            console.log(`✅ Stored raw data: ${importRecord._id}`);
          }
        }
      }

      // Rate limiting
      if (config.rateLimitMs > 0) {
        await new Promise(resolve => setTimeout(resolve, config.rateLimitMs));
      }
    }
    
    console.log(`\n🎉 Import completed!`);
    console.log(`📊 Results:`);
    console.log(`   - Total proposals checked: ${totalChecked}`);
    console.log(`   - Matching proposals imported: ${imported}`);
    console.log(`   - Challenge: ${config.challengeName}`);
    
    // Show summary of imported proposals
    if (imported > 0) {
      const importedProposals = await CatalystImport.find({ 
        'importConfig.importDate': importDate,
        processed: false 
      });
      
      console.log(`\n📋 Imported Proposals:`);
      importedProposals.forEach((record, index) => {
        const teamCount = record.catalystExplorerData?.team?.length || 0;
        const contentLength = record.catalystExplorerData?.content?.length || 0;
        console.log(`   ${index + 1}. "${record.title}"`);
        console.log(`      Budget: ${record.budget?.toLocaleString()} ${record.currency}`);
        console.log(`      Team: ${teamCount} members`);
        console.log(`      Content: ${contentLength} chars`);
      });
    }
    
    return { imported, totalChecked };
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
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
    console.log('   node ImportCatalystProposals.js ./configs/my-config.json');
    console.log('');
  }
  
  try {
    await importCatalystProposals(config);
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
  importCatalystProposals, 
  CatalystImport, 
  DEFAULT_CONFIG 
};