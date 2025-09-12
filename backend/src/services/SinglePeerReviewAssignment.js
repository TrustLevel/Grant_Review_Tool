// backend/src/services/SinglePeerReviewAssignment.js

const mongoose = require('mongoose');
const User = require('../models/User');
const Review = require('../models/Review');
const PeerReview = require('../models/PeerReview');

class SinglePeerReviewAssignmentService {
  constructor() {
    this.MIN_PEER_REVIEWS = 2;
    this.TARGET_PEER_REVIEWS = 3;
  }

  /**
   * Assign additional peer-reviews to a specific user
   */
  async assignAdditionalPeerReviews(userId, count, options = {}) {
    console.log(`🚀 Assigning ${count} additional peer-reviews to user ${userId}...`);
    
    try {
      // 1. Load user
      const user = await this.loadUser(userId);
      if (!user) {
        throw new Error('User not found or not approved');
      }

      console.log(`👤 User: ${user.username || user.email} (${user.reviewerStatus})`);

      // 2. Find eligible reviews for peer-review
      const eligibleReviews = await this.getEligibleReviews(userId);
      console.log(`📋 Found ${eligibleReviews.length} eligible reviews for peer-review`);

      if (eligibleReviews.length === 0) {
        return {
          success: false,
          message: 'No eligible reviews found for peer-review assignment',
          assignments: []
        };
      }

      // 3. Score and rank reviews by urgency (least peer-reviewed first)
      const scoredReviews = this.scoreReviewsByUrgency(eligibleReviews);
      
      // 4. Select top reviews
      const selectedCount = Math.min(count, scoredReviews.length);
      const selectedReviews = scoredReviews.slice(0, selectedCount);

      console.log(`\n🎯 Selected ${selectedCount} reviews for peer-review assignment:`);
      selectedReviews.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.review.proposalTitle} (${item.peerReviewCount} peer-reviews) - ${item.reason}`);
      });

      // 5. Create peer-review assignments (if not simulation)
      const assignments = [];
      if (!options.simulation) {
        for (const item of selectedReviews) {
          const assignment = await this.createPeerReviewAssignment(user._id, item.review, item.reason);
          assignments.push(assignment);
        }
        console.log(`\n✅ Created ${assignments.length} peer-review assignments`);
      } else {
        console.log('\n🧪 SIMULATION MODE - No assignments created');
      }

      return {
        success: true,
        message: `Successfully assigned ${selectedCount} peer-reviews`,
        assignments: selectedReviews.map(item => ({
          reviewId: item.review._id,
          proposalTitle: item.review.proposalTitle,
          currentPeerReviews: item.peerReviewCount,
          reason: item.reason
        })),
        stats: this.generateAssignmentStats(eligibleReviews, selectedReviews)
      };

    } catch (error) {
      console.error('❌ Peer-review assignment failed:', error);
      throw error;
    }
  }

  /**
   * Load user with required data
   */
  async loadUser(userId) {
    return await User.findById(userId, {
      email: 1,
      username: 1,
      reviewerStatus: 1
    }).lean();
  }

  /**
   * Get reviews eligible for peer-review assignment to user
   */
  async getEligibleReviews(userId) {
    console.log('🔍 Finding eligible reviews for peer-review...');
    
    // First, get all proposals this user has reviewed (can't peer-review any reviews for those proposals)
    const userReviewedProposals = await Review.find({
      reviewerId: new mongoose.Types.ObjectId(userId)
    }).distinct('proposalId');
    
    console.log(`   📋 User has reviewed ${userReviewedProposals.length} proposals (excluding them from peer-review)`);
    
    // Find submitted reviews that user hasn't peer-reviewed yet
    const eligibleReviews = await Review.aggregate([
      {
        // 1. Match submitted reviews (ready for peer-review)
        $match: {
          status: 'submitted',
          isDemo: { $ne: true }, // Exclude demo reviews
          reviewerId: { $ne: new mongoose.Types.ObjectId(userId) }, // Can't peer-review own review
          proposalId: { $nin: userReviewedProposals } // Can't peer-review proposals user has reviewed
        }
      },
      {
        // 2. Lookup existing peer-reviews for this user (for this specific review)
        $lookup: {
          from: 'peerreviews',
          let: { reviewId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { 
                  $and: [
                    { $eq: ['$reviewId', '$$reviewId'] },
                    { $eq: ['$assignedTo', new mongoose.Types.ObjectId(userId)] }
                  ]
                }
              }
            }
          ],
          as: 'userPeerReviews'
        }
      },
      {
        // 3. Lookup existing peer-reviews for this user (for the same proposal)
        $lookup: {
          from: 'peerreviews',
          let: { proposalId: '$proposalId' },
          pipeline: [
            {
              $lookup: {
                from: 'reviews',
                localField: 'reviewId',
                foreignField: '_id',
                as: 'review'
              }
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$assignedTo', new mongoose.Types.ObjectId(userId)] },
                    { $eq: [{ $arrayElemAt: ['$review.proposalId', 0] }, '$$proposalId'] }
                  ]
                }
              }
            }
          ],
          as: 'userPeerReviewsForProposal'
        }
      },
      {
        // 4. Lookup all peer-reviews to count total
        $lookup: {
          from: 'peerreviews',
          localField: '_id',
          foreignField: 'reviewId',
          as: 'allPeerReviews'
        }
      },
      {
        // 5. Lookup proposal info
        $lookup: {
          from: 'proposals',
          localField: 'proposalId',
          foreignField: '_id',
          as: 'proposal'
        }
      },
      {
        // 6. Filter out reviews user already peer-reviewed OR has peer-reviewed for same proposal
        $match: {
          userPeerReviews: { $size: 0 }, // No existing peer-reviews from this user for this specific review
          userPeerReviewsForProposal: { $size: 0 } // No existing peer-reviews from this user for this proposal
        }
      },
      {
        // 7. Add computed fields for scoring
        $addFields: {
          peerReviewCount: { $size: '$allPeerReviews' },
          pendingPeerReviews: {
            $size: {
              $filter: {
                input: '$allPeerReviews',
                cond: { $eq: ['$$this.status', 'pending'] }
              }
            }
          },
          completedPeerReviews: {
            $size: {
              $filter: {
                input: '$allPeerReviews',
                cond: { $eq: ['$$this.status', 'completed'] }
              }
            }
          },
          proposalTitle: { $arrayElemAt: ['$proposal.proposalTitle', 0] }
        }
      },
      {
        // 8. Project only needed fields
        $project: {
          proposalId: 1,
          reviewerId: 1,
          proposalTitle: 1,
          peerReviewCount: 1,
          pendingPeerReviews: 1,
          completedPeerReviews: 1,
          submittedAt: 1
        }
      }
    ]);

    console.log(`   ✅ ${eligibleReviews.length} reviews eligible for peer-review`);
    return eligibleReviews;
  }

  /**
   * Score reviews by urgency (least peer-reviewed first) and ensure no duplicate proposals
   */
  scoreReviewsByUrgency(reviews) {
    console.log('\n📊 Scoring reviews by urgency...');
    
    const scoredReviews = reviews.map(review => {
      // Weighted urgency score: completed peer-reviews are 5x more important than pending
      // Similar to review assignment: pending=10, completed=50 points
      const pendingPeerReviews = review.pendingPeerReviews || 0;
      const completedPeerReviews = review.completedPeerReviews || 0;
      
      const urgencyScore = (this.TARGET_PEER_REVIEWS - Math.min(pendingPeerReviews, this.TARGET_PEER_REVIEWS)) * 10 +
                          (this.TARGET_PEER_REVIEWS - Math.min(completedPeerReviews, this.TARGET_PEER_REVIEWS)) * 50;
      
      // Small bonus for older reviews
      const ageBonus = review.submittedAt ? 
        Math.max(0, (Date.now() - new Date(review.submittedAt).getTime()) / (1000 * 60 * 60 * 24)) * 0.1 : 0;
      
      const totalScore = urgencyScore + ageBonus;
      
      return {
        review,
        score: totalScore,
        peerReviewCount: review.peerReviewCount,
        pendingPeerReviews: pendingPeerReviews,
        completedPeerReviews: completedPeerReviews,
        reason: this.getAssignmentReason(review)
      };
    });

    // Sort by score (highest urgency first)
    scoredReviews.sort((a, b) => b.score - a.score);

    // Remove duplicate proposals - only select the highest scored review per proposal
    const uniqueReviews = [];
    const seenProposals = new Set();
    
    for (const scoredReview of scoredReviews) {
      const proposalId = scoredReview.review.proposalId.toString();
      
      // Skip if we already have a review for this proposal
      if (seenProposals.has(proposalId)) {
        console.log(`   ⏭️  Skipping duplicate proposal: ${scoredReview.review.proposalTitle}`);
        continue;
      }
      
      uniqueReviews.push(scoredReview);
      seenProposals.add(proposalId);
    }
    
    console.log(`   ✅ Filtered ${scoredReviews.length} reviews down to ${uniqueReviews.length} unique proposals`);
    return uniqueReviews;
  }

  /**
   * Get human-readable assignment reason
   */
  getAssignmentReason(review) {
    const completedCount = review.completedPeerReviews || 0;
    const pendingCount = review.pendingPeerReviews || 0;
    const totalCount = review.peerReviewCount || 0;
    
    if (completedCount === 0) {
      return pendingCount === 0 ? 'Urgent: No peer-reviews yet' : 'High priority: No completed peer-reviews';
    } else if (completedCount === 1) {
      return 'High priority: Only 1 completed peer-review';
    } else if (completedCount < this.TARGET_PEER_REVIEWS) {
      return `Needs more completed peer-reviews (${completedCount}/${this.TARGET_PEER_REVIEWS})`;
    } else {
      return 'Additional peer-review';
    }
  }

  /**
   * Create peer-review assignment record
   */
  async createPeerReviewAssignment(userId, review, reason) {
    const peerReview = new PeerReview({
      reviewId: review._id,
      proposalId: review.proposalId,
      assignedTo: userId,
      status: 'pending',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      reward: 15, // Standard peer-review reward
      priority: review.peerReviewCount === 0 ? 'high' : 'medium',
      estimatedTimeMinutes: 30,
      notes: `Admin assignment: ${reason}`,
      assignedBy: null, // Admin assignment
      assignedAt: new Date()
    });
    
    await peerReview.save();
    
    return {
      peerReviewId: peerReview._id,
      reviewId: review._id,
      proposalTitle: review.proposalTitle,
      currentPeerReviews: review.peerReviewCount,
      reason: reason
    };
  }

  /**
   * Generate assignment statistics
   */
  generateAssignmentStats(eligibleReviews, selectedReviews) {
    const urgentReviews = eligibleReviews.filter(r => r.peerReviewCount === 0).length;
    const highPriorityReviews = eligibleReviews.filter(r => r.peerReviewCount <= 1).length;

    return {
      totalEligible: eligibleReviews.length,
      assigned: selectedReviews.length,
      urgentReviews,
      highPriorityReviews,
      avgPeerReviews: eligibleReviews.length > 0 
        ? (eligibleReviews.reduce((sum, r) => sum + r.peerReviewCount, 0) / eligibleReviews.length).toFixed(1)
        : 0
    };
  }
}

module.exports = new SinglePeerReviewAssignmentService();