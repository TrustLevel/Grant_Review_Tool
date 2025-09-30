// Fund14_analysis/2_flag_analysis.js
// Flag behavior analysis - extends reviewer_data.json with flag stats

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');
const Review = require('../src/models/Review');
const PeerReview = require('../src/models/PeerReview');

async function calculateFlagBehavior() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🚩 Calculating Flag Behavior Scores\n');

    // Find all reviews flagged as low-quality
    const flaggedReviews = await Review.find({
      isDemo: { $ne: true },
      'reviewerAssessment.temperatureCheck': 'low-quality'
    })
    .populate('reviewerId', 'username email repPoints');

    console.log(`📊 Found ${flaggedReviews.length} reviews flagged as low-quality`);

    // Group by reviewer (who raised the flag)
    const reviewerFlagStats = {};

    for (const flaggedReview of flaggedReviews) {
      const reviewerId = flaggedReview.reviewerId._id.toString();
      const reviewerName = flaggedReview.reviewerId.username || flaggedReview.reviewerId.email;

      if (!reviewerFlagStats[reviewerId]) {
        reviewerFlagStats[reviewerId] = {
          name: reviewerName,
          flagsRaised: 0,
          flagsConfirmed: 0,
          flagsDisputed: 0
        };
      }

      reviewerFlagStats[reviewerId].flagsRaised++;

      // Check if this flag was confirmed by peer reviews
      const peerReviews = await PeerReview.find({
        reviewId: flaggedReview._id,
        status: 'completed',
        lowQualityAgreement: { $exists: true }
      });

      if (peerReviews.length > 0) {
        const agreements = peerReviews.filter(pr => pr.lowQualityAgreement.agree).length;
        const disagreements = peerReviews.filter(pr => pr.lowQualityAgreement.agree === false).length;

        if (agreements > disagreements) {
          reviewerFlagStats[reviewerId].flagsConfirmed++;
        } else if (disagreements > agreements) {
          reviewerFlagStats[reviewerId].flagsDisputed++;
        }
        // If equal, we don't count it as either
      }
    }

    // Calculate flag precision for each reviewer
    Object.keys(reviewerFlagStats).forEach(reviewerId => {
      const stats = reviewerFlagStats[reviewerId];
      if (stats.flagsRaised > 0) {
        stats.flagPrecision = Math.round((stats.flagsConfirmed / stats.flagsRaised) * 100) / 100;
      } else {
        stats.flagPrecision = 0;
      }
    });

    // Display results
    console.log('\n=== FLAG BEHAVIOR RESULTS ===');
    console.log('Reviewer\t\tFlags\tConfirmed\tPrecision');
    console.log('─'.repeat(50));

    Object.values(reviewerFlagStats)
      .sort((a, b) => b.flagPrecision - a.flagPrecision)
      .forEach(stats => {
        const name = stats.name.substring(0, 15).padEnd(15);
        const flags = stats.flagsRaised.toString().padStart(5);
        const confirmed = stats.flagsConfirmed.toString().padStart(9);
        const precision = stats.flagPrecision.toFixed(2).padStart(9);
        console.log(`${name}\t${flags}\t${confirmed}\t${precision}`);
      });

    // Load existing reviewer data and extend with flag stats
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

    // Update timestamp
    reviewerData.timestamp = new Date();

    // Add flag stats to existing reviewers or create new entries
    Object.keys(reviewerFlagStats).forEach(reviewerId => {
      const flagStats = reviewerFlagStats[reviewerId];

      if (!reviewerData.reviewers[reviewerId]) {
        reviewerData.reviewers[reviewerId] = {
          name: flagStats.name
        };
      }

      reviewerData.reviewers[reviewerId].flagStats = {
        flagsRaised: flagStats.flagsRaised,
        flagsConfirmed: flagStats.flagsConfirmed,
        flagsDisputed: flagStats.flagsDisputed,
        flagPrecision: flagStats.flagPrecision
      };
    });

    // Update total count
    reviewerData.totalReviewers = Object.keys(reviewerData.reviewers).length;

    fs.writeFileSync('./Fund14_analysis/results/reviewer_data.json', JSON.stringify(reviewerData, null, 2));

    console.log(`\n💾 Results updated in results/reviewer_data.json`);
    console.log(`📊 ${Object.keys(reviewerFlagStats).length} reviewers with flag stats added`);
    console.log(`📊 ${reviewerData.totalReviewers} total reviewers in dataset`);

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  calculateFlagBehavior();
}

module.exports = { calculateFlagBehavior };