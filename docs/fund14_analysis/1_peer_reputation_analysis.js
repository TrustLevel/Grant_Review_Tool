// Fund14_analysis/1_peer_reputation_analysis.js
// Peer reputation calculation - creates unified reviewer_data.json

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../../backend/src/models/User');
const Review = require('../../backend/src/models/Review');
const PeerReview = require('../../backend/src/models/PeerReview');

async function calculatePeerReputation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔍 Calculating Peer Reputation Scores\n');

    // Get all completed peer reviews with assessments
    const peerReviews = await PeerReview.find({
      status: 'completed',
      assessments: { $exists: true }
    })
    .populate('reviewId', 'reviewerId')
    .populate('assignedTo', 'username email');

    console.log(`📊 Found ${peerReviews.length} peer reviews with assessments`);

    // Group by reviewer (who was assessed)
    const reviewerScores = {};

    for (const peerReview of peerReviews) {
      if (!peerReview.reviewId || !peerReview.reviewId.reviewerId) continue;

      const reviewerId = peerReview.reviewId.reviewerId.toString();
      const assessments = peerReview.assessments;

      // Check if all assessment scores exist and are numbers
      if (typeof assessments.specificity === 'number' &&
          typeof assessments.clarity === 'number' &&
          typeof assessments.insightful === 'number') {

        if (!reviewerScores[reviewerId]) {
          reviewerScores[reviewerId] = [];
        }

        // Calculate average of the 3 peer scores
        const avgScore = (assessments.specificity + assessments.clarity + assessments.insightful) / 3;
        reviewerScores[reviewerId].push(avgScore);
      }
    }

    // Calculate final average per reviewer
    const finalScores = {};
    Object.keys(reviewerScores).forEach(reviewerId => {
      const scores = reviewerScores[reviewerId];
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      finalScores[reviewerId] = {
        avgPeerScore: Math.round(avgScore * 100) / 100,
        totalPeerReviews: scores.length
      };
    });

    // Get reviewer names for display
    const reviewerIds = Object.keys(finalScores);
    const users = await User.find({ _id: { $in: reviewerIds } }).select('username email');

    users.forEach(user => {
      if (finalScores[user._id]) {
        finalScores[user._id].name = user.username || user.email;
      }
    });

    // Display results
    console.log('\n=== PEER REPUTATION RESULTS ===');
    console.log('Reviewer\t\tPeer Reviews\tAvg Score');
    console.log('─'.repeat(50));

    Object.values(finalScores)
      .sort((a, b) => b.avgPeerScore - a.avgPeerScore)
      .forEach(data => {
        const name = (data.name || 'Unknown').substring(0, 15).padEnd(15);
        const count = data.totalPeerReviews.toString().padStart(12);
        const score = data.avgPeerScore.toFixed(2).padStart(9);
        console.log(`${name}\t${count}\t${score}`);
      });

    // Export to unified results structure
    const results = {
      timestamp: new Date(),
      totalReviewers: Object.keys(finalScores).length,
      reviewers: {}
    };

    // Convert to new structure: reviewerId -> reviewer data
    Object.keys(finalScores).forEach(reviewerId => {
      const data = finalScores[reviewerId];
      results.reviewers[reviewerId] = {
        name: data.name,
        peerStats: {
          avgPeerScore: data.avgPeerScore,
          totalPeerReviews: data.totalPeerReviews
        }
      };
    });

    require('fs').writeFileSync('./Fund14_analysis/results/reviewer_data.json', JSON.stringify(results, null, 2));

    console.log(`\n💾 Results saved to results/reviewer_data.json`);
    console.log(`📊 ${Object.keys(finalScores).length} reviewers with peer scores`);

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  calculatePeerReputation();
}

module.exports = { calculatePeerReputation };