// Fund14_analysis/3_miss_penalty_analysis.js

// Miss penalty calculation - extends reviewer_data.json with miss penalty stats

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');
const Review = require('../src/models/Review');
const PeerReview = require('../src/models/PeerReview');

async function calculateMissPenalties() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🎯 Calculating Miss Penalties\n');

    // Step 1: Find all reviews with "low-quality"-flag
    const flaggedReviews = await Review.find({
      isDemo: { $ne: true },
      'reviewerAssessment.temperatureCheck': 'low-quality'
    })
    .populate('reviewerId');

    console.log(`📊 Found ${flaggedReviews.length} flagged proposals`);

    // Step 2: Group reviews with "low-quality"-flag by proposal to find consensus low-quality proposals
    const proposalFlags = {};

    for (const flaggedReview of flaggedReviews) {
      const proposalId = flaggedReview.proposalId.toString();
      if (!proposalFlags[proposalId]) {
        proposalFlags[proposalId] = [];
      }
      proposalFlags[proposalId].push(flaggedReview);
    }

    // Step 3: Identify consensus low-quality proposals (60%+ of reviewers flagged it)
    const consensusLowQualityProposals = [];

    for (const [proposalId, flaggedReviews] of Object.entries(proposalFlags)) {
      // Get total number of reviews for this proposal
      const totalReviews = await Review.countDocuments({
        proposalId: proposalId,
        isDemo: { $ne: true },
        status: { $in: ['submitted', 'completed'] }
      });

      if (totalReviews >= 3) { // Need at least 3 reviews to determine consensus
        const flagRate = flaggedReviews.length / totalReviews;

        if (flagRate >= 0.6) { // 60% consensus that proposal is low-quality
          consensusLowQualityProposals.push({
            proposalId: proposalId,
            totalReviews: totalReviews,
            flaggedReviews: flaggedReviews.length,
            flagRate: Math.round(flagRate * 100) / 100
          });
        }
      }
    }

    console.log(`🎯 Found ${consensusLowQualityProposals.length} consensus low-quality proposals`);

    // Step 4: For each consensus low-quality proposal, find reviewers who didn't flag it
    const reviewerMisses = {};
    let totalOpportunities = 0;

    for (const consensusProposal of consensusLowQualityProposals) {
      // Find ALL reviews of this consensus-"low-quality" proposal
      const allReviews = await Review.find({
        proposalId: consensusProposal.proposalId,
        isDemo: { $ne: true },
        status: { $in: ['submitted', 'completed'] }
      })
      .populate('reviewerId', 'username email');

      // Check each reviewer - did they flag this bad proposal?
      allReviews.forEach(review => {
        const reviewerId = review.reviewerId._id.toString();
        const reviewerName = review.reviewerId.username || review.reviewerId.email;

        if (!reviewerMisses[reviewerId]) {
          reviewerMisses[reviewerId] = {
            name: reviewerName,
            missedFlags: 0,
            flagOpportunities: 0
          };
        }

        reviewerMisses[reviewerId].flagOpportunities++;

        // Check if they flagged this proposal as low-quality
        const didFlagProposal = review.reviewerAssessment?.temperatureCheck === 'low-quality';
        if (!didFlagProposal) {
          reviewerMisses[reviewerId].missedFlags++;
        }

        totalOpportunities++;
      });
    }

    // Step 4: Calculate miss rates
    Object.keys(reviewerMisses).forEach(reviewerId => {
      const stats = reviewerMisses[reviewerId];
      stats.missRate = stats.flagOpportunities > 0
        ? Math.round((stats.missedFlags / stats.flagOpportunities) * 100) / 100
        : 0;
      stats.missPenalty = 1 - stats.missRate; // Higher miss rate = lower penalty score
    });

    // Display results
    console.log('\n=== MISS PENALTY RESULTS ===');
    console.log('Reviewer\t\tOpportunities\tMissed\tMiss Rate\tPenalty');
    console.log('─'.repeat(70));

    Object.values(reviewerMisses)
      .filter(stats => stats.flagOpportunities > 0)
      .sort((a, b) => a.missRate - b.missRate)
      .forEach(stats => {
        const name = stats.name.substring(0, 15).padEnd(15);
        const opportunities = stats.flagOpportunities.toString().padStart(13);
        const missed = stats.missedFlags.toString().padStart(6);
        const missRate = stats.missRate.toFixed(2).padStart(9);
        const penalty = stats.missPenalty.toFixed(2).padStart(7);
        console.log(`${name}\t${opportunities}\t${missed}\t${missRate}\t${penalty}`);
      });

    // Load existing reviewer data and extend with miss penalty stats
    const fs = require('fs');
    let reviewerData;
    try {
      reviewerData = JSON.parse(fs.readFileSync('./Fund14_analysis/results/reviewer_data.json', 'utf8'));
    } catch (error) {
      console.log('🔴 No existing reviewer_data.json found, creating new structure');
      reviewerData = {
        timestamp: new Date(),
        totalReviewers: 0,
        reviewers: {}
      };
    }

    // Update timestamp and add metadata
    reviewerData.timestamp = new Date();
    reviewerData.consensusLowQualityProposals = consensusLowQualityProposals.length;
    reviewerData.totalOpportunities = totalOpportunities;

    // Add miss penalty stats to existing reviewers or create new entries
    Object.keys(reviewerMisses).forEach(reviewerId => {
      const missStats = reviewerMisses[reviewerId];

      if (!reviewerData.reviewers[reviewerId]) {
        reviewerData.reviewers[reviewerId] = {
          name: missStats.name
        };
      }

      reviewerData.reviewers[reviewerId].missStats = {
        missedFlags: missStats.missedFlags,
        flagOpportunities: missStats.flagOpportunities,
        missRate: missStats.missRate,
        missPenalty: missStats.missPenalty
      };
    });

    // Update total count
    reviewerData.totalReviewers = Object.keys(reviewerData.reviewers).length;

    fs.writeFileSync('./Fund14_analysis/results/reviewer_data.json', JSON.stringify(reviewerData, null, 2));

    console.log(`\n💾 Results updated in results/reviewer_data.json`);
    console.log(`📊 ${consensusLowQualityProposals.length} consensus low-quality proposals, ${Object.keys(reviewerMisses).length} reviewers with miss penalty stats added`);
    console.log(`📊 ${reviewerData.totalReviewers} total reviewers in dataset`);

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  calculateMissPenalties();
}

module.exports = { calculateMissPenalties };