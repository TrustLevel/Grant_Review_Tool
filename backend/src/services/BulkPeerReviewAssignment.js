// backend/src/services/BulkPeerReviewAssignment.js
const Review = require('../models/Review');
const PeerReview = require('../models/PeerReview');
const User = require('../models/User');

class BulkPeerReviewAssignmentService {
  constructor() {
    this.PEER_REVIEWS_PER_REVIEW = 2; // How many peer-reviews per completed review
    this.PEER_REVIEW_DUE_DAYS = 7; // Days to complete peer-review
  }

  /**
   * Main batch processing method
   * Finds completed reviews without peer-review assignments and creates them
   */
  async processBatch() {
    console.log('🔄 Starting peer-review batch processing...');
    
    try {
      // Find completed reviews that need peer-review assignments
      const reviewsNeedingPeerReview = await this.findReviewsNeedingPeerReview();
      
      if (reviewsNeedingPeerReview.length === 0) {
        console.log('✅ No reviews need peer-review assignments');
        return { assigned: 0, reviews: 0 };
      }

      console.log(`📋 Found ${reviewsNeedingPeerReview.length} reviews needing peer-review assignments`);

      let totalAssignments = 0;
      let processedReviews = 0;

      // Process each review
      for (const review of reviewsNeedingPeerReview) {
        console.log(`\n🔍 Processing review ${review._id} (${review.proposalId})`);
        
        try {
          const assignments = await this.createPeerReviewAssignments(review);
          totalAssignments += assignments;
          processedReviews++;
          
          console.log(`✅ Created ${assignments} peer-review assignments for review ${review._id}`);
        } catch (error) {
          console.error(`❌ Failed to create peer-review assignments for review ${review._id}:`, error);
        }
      }

      console.log(`\n🎯 Batch processing completed:`);
      console.log(`   Reviews processed: ${processedReviews}`);
      console.log(`   Total assignments created: ${totalAssignments}`);

      return { assigned: totalAssignments, reviews: processedReviews };

    } catch (error) {
      console.error('💥 Error in peer-review batch processing:', error);
      throw error;
    }
  }

  /**
   * Find completed reviews that don't have peer-review assignments yet
   */
  async findReviewsNeedingPeerReview() {
    // Get all submitted reviews (ready for peer review)
    const completedReviews = await Review.find({
      status: 'submitted',
      isDemo: { $ne: true } // Exclude demo reviews
    }).populate('reviewerId', 'username email');

    // Filter out reviews that already have peer-review assignments
    const reviewsNeedingAssignment = [];
    
    for (const review of completedReviews) {
      const existingAssignments = await PeerReview.find({ reviewId: review._id });
      
      if (existingAssignments.length === 0) {
        reviewsNeedingAssignment.push(review);
      }
    }

    return reviewsNeedingAssignment;
  }

  /**
   * Create peer-review assignments for a specific review
   */
  async createPeerReviewAssignments(review) {
    // Get eligible reviewers (exclude original reviewer)
    const eligibleReviewers = await this.selectEligibleReviewers(review);
    
    if (eligibleReviewers.length === 0) {
      console.log(`   ⚠️  No eligible reviewers found for review ${review._id}`);
      return 0;
    }

    // Limit to desired number of peer-reviews
    const selectedReviewers = eligibleReviewers.slice(0, this.PEER_REVIEWS_PER_REVIEW);
    
    console.log(`   👥 Selected ${selectedReviewers.length} reviewers:`, 
                selectedReviewers.map(r => r.username || r.email));

    // Create peer-review assignment for each selected reviewer
    let created = 0;
    for (const reviewer of selectedReviewers) {
      try {
        await this.createPeerReviewAssignment(review._id, reviewer._id);
        created++;
      } catch (error) {
        console.error(`   ❌ Failed to create assignment for reviewer ${reviewer._id}:`, error);
      }
    }

    return created;
  }

  /**
   * Select eligible reviewers for peer-reviewing a specific review
   */
  async selectEligibleReviewers(review) {
    // Get all active reviewers
    const allReviewers = await User.find({
      reviewerStatus: 'approved'
    });

    // Filter eligible reviewers
    const eligibleReviewers = [];
    
    for (const reviewer of allReviewers) {
      // Skip if same as original reviewer
      if (reviewer._id.equals(review.reviewerId)) {
        continue;
      }

      // TODO: Add more sophisticated selection criteria:
      // - Conflict of interest checking
      // - Workload balancing
      // - Expertise matching
      // - Recent activity

      // Check current peer-review workload
      const currentPeerReviews = await PeerReview.find({
        assignedTo: reviewer._id,
        status: 'pending'
      });

      // Skip if reviewer has too many pending peer-reviews
      if (currentPeerReviews.length >= 15) {
        continue;
      }

      eligibleReviewers.push(reviewer);
    }

    // Shuffle for random selection
    return this.shuffleArray(eligibleReviewers);
  }

  /**
   * Create a single peer-review assignment record
   */
  async createPeerReviewAssignment(reviewId, assignedTo) {
    // Get the review to extract proposalId
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new Error(`Review not found: ${reviewId}`);
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + this.PEER_REVIEW_DUE_DAYS);

    const peerReview = new PeerReview({
      reviewId: reviewId,
      proposalId: review.proposalId, // Extract from the review
      assignedTo: assignedTo,
      status: 'pending',
      dueDate: dueDate,
      reward: 15, // ₳15 standard peer-review reward
    });

    await peerReview.save();
    console.log(`   📝 Created peer-review assignment: ${reviewId} → ${assignedTo}`);
    
    return peerReview;
  }

  /**
   * Utility function to shuffle array for random selection
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Get statistics about peer-review assignments
   */
  async getAssignmentStats() {
    const [totalAssignments, pendingAssignments, completedAssignments] = await Promise.all([
      PeerReview.countDocuments(),
      PeerReview.countDocuments({ status: 'pending' }),
      PeerReview.countDocuments({ status: 'completed' })
    ]);

    return {
      total: totalAssignments,
      pending: pendingAssignments,
      completed: completedAssignments,
      completionRate: totalAssignments > 0 ? (completedAssignments / totalAssignments * 100).toFixed(1) : 0
    };
  }
}

module.exports = new BulkPeerReviewAssignmentService();