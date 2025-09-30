const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const AssignmentRequest = require('../models/AssignmentRequest');
const Review = require('../models/Review');
const PeerReview = require('../models/PeerReview');
const Proposal = require('../models/Proposal');
const singleProposalAssignment = require('../services/SingleProposalAssignment');
const singlePeerReviewAssignment = require('../services/SinglePeerReviewAssignment');

// =====================================================
// ADMIN DASHBOARD STATS
// =====================================================

// GET /api/admin/stats - Get admin dashboard statistics
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get user stats
    const totalUsers = await User.countDocuments({});
    const approvedReviewers = await User.countDocuments({ reviewerStatus: 'approved' });
    const pendingReviewers = await User.countDocuments({ 
      reviewerStatus: 'pending',
      onboardingCompleted: true 
    });
    
    // Get review stats
    const totalReviews = await Review.countDocuments({ isDemo: { $ne: true } });
    const completedReviews = await Review.countDocuments({ 
      status: { $in: ['submitted', 'completed'] },
      isDemo: { $ne: true }
    });
    
    // Get peer review stats
    const totalPeerReviews = await PeerReview.countDocuments({});
    const completedPeerReviews = await PeerReview.countDocuments({ status: 'completed' });
    
    // Get pending assignment requests
    const pendingAssignmentRequests = await AssignmentRequest.countDocuments({ status: 'pending' });
    
    res.json({
      totalUsers,
      approvedReviewers,
      pendingReviewers,
      totalReviews,
      completedReviews,
      totalPeerReviews,
      completedPeerReviews,
      pendingAssignmentRequests
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/proposal-overview - Get detailed overview of all assigned proposals
router.get('/proposal-overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Loading proposal overview for admin dashboard...');

    // Get all proposals that have assigned reviews (non-demo)
    const proposalsWithReviews = await Proposal.aggregate([
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'proposalId',
          as: 'reviews'
        }
      },
      {
        $match: {
          'reviews.0': { $exists: true }, // Only proposals with at least 1 review
          'reviews.isDemo': { $ne: true }  // Exclude demo reviews
        }
      },
      {
        $project: {
          proposalTitle: 1,
          proposer: 1,
          budget: 1,
          challengeId: 1,
          reviews: {
            $filter: {
              input: '$reviews',
              cond: { $ne: ['$$this.isDemo', true] } // Only non-demo reviews
            }
          }
        }
      }
    ]);

    console.log(`📊 Found ${proposalsWithReviews.length} proposals with assigned reviews`);

    // For each proposal, get detailed review and peer-review stats
    const proposalOverview = [];

    for (const proposal of proposalsWithReviews) {
      const proposalId = proposal._id;

      // Count reviews by status
      const reviewStats = {
        assigned: 0,
        in_progress: 0,
        submitted: 0,
        total: 0
      };

      proposal.reviews.forEach(review => {
        reviewStats.total++;
        if (review.status === 'assigned') reviewStats.assigned++;
        else if (review.status === 'in_progress') reviewStats.in_progress++;
        else if (review.status === 'submitted' || review.status === 'completed') reviewStats.submitted++;
      });

      // Get peer-review stats for this proposal
      const reviewIds = proposal.reviews.map(r => r._id);
      
      const peerReviewStats = await PeerReview.aggregate([
        {
          $match: {
            reviewId: { $in: reviewIds }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const peerReviewCounts = {
        pending: 0,
        completed: 0,
        total: 0
      };

      peerReviewStats.forEach(stat => {
        peerReviewCounts.total += stat.count;
        if (stat._id === 'pending') peerReviewCounts.pending = stat.count;
        else if (stat._id === 'completed') peerReviewCounts.completed = stat.count;
      });

      proposalOverview.push({
        id: proposalId.toString(),
        title: proposal.proposalTitle,
        author: proposal.proposer?.entity || proposal.proposer?.name || 'Unknown',
        budget: proposal.budget?.total || 0,
        reviews: {
          assigned: reviewStats.assigned,
          in_progress: reviewStats.in_progress,
          submitted: reviewStats.submitted,
          total: reviewStats.total
        },
        peerReviews: {
          pending: peerReviewCounts.pending,
          completed: peerReviewCounts.completed,
          total: peerReviewCounts.total
        },
        // Calculate completion percentages
        reviewCompletion: reviewStats.total > 0 ? Math.round((reviewStats.submitted / reviewStats.total) * 100) : 0,
        peerReviewCompletion: peerReviewCounts.total > 0 ? Math.round((peerReviewCounts.completed / peerReviewCounts.total) * 100) : 0
      });
    }

    // Sort by overall progress (lowest first - needs attention)
    proposalOverview.sort((a, b) => {
      // Calculate overall progress for each proposal (same logic as frontend)
      const calculateOverallProgress = (proposal) => {
        const reviewProgress = Math.min((proposal.reviews.submitted / 3) * 100, 100);
        const peerReviewTarget = Math.max(6, proposal.reviews.submitted * 2);
        const peerReviewProgress = Math.min((proposal.peerReviews.completed / peerReviewTarget) * 100, 100);
        return Math.round((reviewProgress + peerReviewProgress) / 2);
      };
      
      const overallA = calculateOverallProgress(a);
      const overallB = calculateOverallProgress(b);
      return overallA - overallB; // Lowest overall progress first
    });

    console.log(`✅ Returning overview for ${proposalOverview.length} proposals`);
    res.json(proposalOverview);

  } catch (error) {
    console.error('❌ Proposal overview error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// USER MANAGEMENT
// =====================================================

// GET /api/admin/users - Get all users with review/peer-review stats
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({})
      .select('email username reviewerStatus role repPoints createdAt onboardingCompleted')
      .sort({ createdAt: -1 });

    // Add review and peer-review stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        // Count reviews (exclude demo reviews)
        const reviewStats = await Review.aggregate([
          {
            $match: {
              reviewerId: user._id,
              isDemo: { $ne: true }
            }
          },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]);

        // Count peer-reviews
        const peerReviewStats = await PeerReview.aggregate([
          {
            $match: {
              assignedTo: user._id
            }
          },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]);

        // Process review stats
        const reviews = {
          assigned: 0,
          in_progress: 0,
          submitted: 0,
          total: 0
        };

        reviewStats.forEach(stat => {
          reviews.total += stat.count;
          if (stat._id === 'assigned') reviews.assigned = stat.count;
          else if (stat._id === 'in_progress') reviews.in_progress = stat.count;
          else if (stat._id === 'submitted' || stat._id === 'completed') reviews.submitted += stat.count;
        });

        // Process peer-review stats
        const peerReviews = {
          pending: 0,
          completed: 0,
          total: 0
        };

        peerReviewStats.forEach(stat => {
          peerReviews.total += stat.count;
          if (stat._id === 'pending') peerReviews.pending = stat.count;
          else if (stat._id === 'completed') peerReviews.completed = stat.count;
        });

        return {
          ...user.toObject(),
          reviews,
          peerReviews
        };
      })
    );
    
    res.json(usersWithStats);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/pending-users - Get pending users for approval
router.get('/pending-users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const pendingUsers = await User.find({ 
      reviewerStatus: 'pending',
      onboardingCompleted: true 
    })
    .select('email username createdAt reviewerStatus onboardingData')
    .sort({ createdAt: -1 });
    
    res.json(pendingUsers);
  } catch (error) {
    console.error('Fetch pending users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/admin/users/:userId/status - Update user reviewer status
router.patch('/users/:userId/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reviewerStatus } = req.body;
    
    if (!['approved', 'rejected'].includes(reviewerStatus)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        reviewerStatus,
        approvedBy: req.username,
        approvedAt: new Date()
      },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        reviewerStatus: user.reviewerStatus
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// ASSIGNMENT REQUEST MANAGEMENT
// =====================================================

// GET /api/admin/assignment-requests - Get all pending assignment requests
router.get('/assignment-requests', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const requests = await AssignmentRequest.find({ status: 'pending' })
      .populate('userId', 'username email reviewerStatus')
      .sort({ requestedAt: 1 }); // Oldest first (FIFO)
    
    res.json(requests);
  } catch (error) {
    console.error('Admin fetch assignment requests error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/admin/assignment-requests/:id - Update assignment request status
router.patch('/assignment-requests/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, adminNote, declinedReason } = req.body;
    
    const request = await AssignmentRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    request.status = status;
    if (adminNote) request.adminNote = adminNote;
    if (status === 'fulfilled') {
      request.fulfilledAt = new Date();
      request.fulfilledBy = req.username; // From admin token
    }
    if (status === 'declined' && declinedReason) {
      request.declinedReason = declinedReason;
    }
    
    await request.save();
    
    res.json({ success: true, request });
  } catch (error) {
    console.error('Update assignment request error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// USER ASSIGNMENT - PROPOSAL REVIEWS
// =====================================================

// POST /api/admin/assign-user-reviews - Assign additional reviews to a user
router.post('/assign-user-reviews', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, count, simulation = false } = req.body;
    
    // Validation
    if (!userId || !count) {
      return res.status(400).json({ error: 'userId and count are required' });
    }
    
    if (count < 1 || count > 20) {
      return res.status(400).json({ error: 'count must be between 1 and 20' });
    }
    
    console.log(`🎯 Admin ${req.username} assigning ${count} reviews to user ${userId} (simulation: ${simulation})`);
    
    // Call assignment service
    const result = await singleProposalAssignment.assignAdditionalReviews(userId, count, {
      simulation: simulation
    });
    
    // Log assignment for admin tracking
    if (result.success && !simulation) {
      console.log(`✅ Admin assignment completed: ${result.assignments.length} reviews assigned to user ${userId} by ${req.username}`);
    }
    
    res.json({
      success: result.success,
      message: result.message,
      assignments: result.assignments,
      stats: result.stats,
      simulation: simulation
    });
    
  } catch (error) {
    console.error('Admin assign user reviews error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/users/:userId/assignment-preview - Preview assignment for user
router.get('/users/:userId/assignment-preview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const count = parseInt(req.query.count) || 4;
    
    // Run simulation to preview assignments
    const result = await singleProposalAssignment.assignAdditionalReviews(userId, count, {
      simulation: true
    });
    
    res.json({
      success: result.success,
      message: result.message,
      preview: result.assignments,
      stats: result.stats
    });
    
  } catch (error) {
    console.error('Assignment preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// USER ASSIGNMENT - PEER REVIEWS
// =====================================================

// POST /api/admin/assign-user-peer-reviews - Assign additional peer-reviews to a user
router.post('/assign-user-peer-reviews', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, count, simulation = false } = req.body;
    
    // Validation
    if (!userId || !count) {
      return res.status(400).json({ error: 'userId and count are required' });
    }
    
    if (count < 1 || count > 20) {
      return res.status(400).json({ error: 'count must be between 1 and 20' });
    }
    
    console.log(`🎯 Admin ${req.username} assigning ${count} peer-reviews to user ${userId} (simulation: ${simulation})`);
    
    // Call assignment service
    const result = await singlePeerReviewAssignment.assignAdditionalPeerReviews(userId, count, {
      simulation: simulation
    });
    
    // Log assignment for admin tracking
    if (result.success && !simulation) {
      console.log(`✅ Admin peer-review assignment completed: ${result.assignments.length} peer-reviews assigned to user ${userId} by ${req.username}`);
    }
    
    res.json({
      success: result.success,
      message: result.message,
      assignments: result.assignments,
      stats: result.stats,
      simulation: simulation
    });
    
  } catch (error) {
    console.error('Admin assign user peer-reviews error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/users/:userId/peer-review-assignment-preview - Preview peer-review assignment for user
router.get('/users/:userId/peer-review-assignment-preview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const count = parseInt(req.query.count) || 4;
    
    // Run simulation to preview assignments
    const result = await singlePeerReviewAssignment.assignAdditionalPeerReviews(userId, count, {
      simulation: true
    });
    
    res.json({
      success: result.success,
      message: result.message,
      preview: result.assignments,
      stats: result.stats
    });
    
  } catch (error) {
    console.error('Peer-review assignment preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// PROPOSAL MANAGEMENT  
// =====================================================

// PATCH /api/admin/proposals/:proposalId/reviewing-enabled - Toggle proposal reviewing
router.patch('/proposals/:proposalId/reviewing-enabled', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { reviewingEnabled } = req.body;
    
    if (typeof reviewingEnabled !== 'boolean') {
      return res.status(400).json({ error: 'reviewingEnabled must be a boolean' });
    }
    
    const updateData = {
      reviewingEnabled,
      reviewingEnabledBy: reviewingEnabled ? req.username : null,
      reviewingEnabledAt: reviewingEnabled ? new Date() : null
    };
    
    const proposal = await Proposal.findByIdAndUpdate(
      proposalId,
      updateData,
      { new: true, select: 'proposalTitle reviewingEnabled reviewingEnabledBy reviewingEnabledAt' }
    );
    
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    console.log(`📝 Admin ${req.username} ${reviewingEnabled ? 'enabled' : 'disabled'} reviewing for proposal: ${proposal.proposalTitle}`);
    
    res.json({
      success: true,
      proposal: {
        id: proposal._id,
        title: proposal.proposalTitle,
        reviewingEnabled: proposal.reviewingEnabled,
        reviewingEnabledBy: proposal.reviewingEnabledBy,
        reviewingEnabledAt: proposal.reviewingEnabledAt
      }
    });
    
  } catch (error) {
    console.error('Toggle proposal reviewing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/proposals - Get proposals with reviewing status
router.get('/proposals', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, reviewingEnabled, page = 1, limit = 50 } = req.query;
    
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (reviewingEnabled !== undefined) filter.reviewingEnabled = reviewingEnabled === 'true';
    
    // Get proposals with pagination
    const proposals = await Proposal.find(filter, {
      proposalTitle: 1,
      status: 1,
      reviewingEnabled: 1,
      reviewingEnabledBy: 1,
      reviewingEnabledAt: 1,
      'budget.total': 1,
      createdAt: 1
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .lean();
    
    // Get total count for pagination
    const total = await Proposal.countDocuments(filter);
    
    res.json({
      proposals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Fetch proposals error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// MISSION REWARD ROUTES
// =====================================================

// GET /api/admin/pending-rewards - Get all users with pending mission rewards
router.get('/pending-rewards', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const usersWithRewards = await User.find({
      'completedMissions.0': { $exists: true } // Has at least one completed mission
    }).select('username email walletAddress completedMissions repPoints');
    
    // Flatten the data for easier display
    const rewards = [];
    usersWithRewards.forEach(user => {
      user.completedMissions.forEach(mission => {
        rewards.push({
          userId: user._id,
          username: user.username,
          email: user.email,
          walletAddress: user.walletAddress,
          repPoints: user.repPoints,
          missionId: mission.missionId,
          rewardAmount: mission.rewardAmount,
          completedAt: mission.completedAt,
          rewardStatus: mission.rewardStatus
        });
      });
    });
    
    res.json(rewards);
    
  } catch (error) {
    console.error('Error fetching pending rewards:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/admin/mark-reward-paid/:userId/:missionId - Mark a reward as paid
router.patch('/mark-reward-paid/:userId/:missionId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, missionId } = req.params;
    const { transactionHash, adminNotes } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const missionIndex = user.completedMissions.findIndex(m => m.missionId === missionId);
    if (missionIndex === -1) {
      return res.status(404).json({ error: 'Mission not found' });
    }
    
    // Update the mission's reward status
    user.completedMissions[missionIndex].rewardStatus = 'paid';
    user.completedMissions[missionIndex].paidAt = new Date();
    if (transactionHash) {
      user.completedMissions[missionIndex].transactionHash = transactionHash;
    }
    if (adminNotes) {
      user.completedMissions[missionIndex].adminNotes = adminNotes;
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Reward marked as paid',
      userId,
      missionId
    });
    
  } catch (error) {
    console.error('Error marking reward as paid:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// ADMIN VALIDATION ROUTES (for REX System)
// =====================================================

// POST /api/admin/validate-review/:reviewId - Admin validates a review's expertise/quality
router.post('/validate-review/:reviewId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { adminValidation, validationNotes, validationType } = req.body;

    // Validation
    if (adminValidation < 0 || adminValidation > 1) {
      return res.status(400).json({ error: 'adminValidation must be between 0 and 1' });
    }

    if (!['expertise', 'quality', 'comprehensive'].includes(validationType)) {
      return res.status(400).json({ error: 'validationType must be expertise, quality, or comprehensive' });
    }

    const review = await Review.findById(reviewId)
      .populate('reviewerId', 'username email')
      .populate('proposalId', 'proposalTitle');

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Add admin validation to reviewerAssessment
    if (!review.reviewerAssessment) {
      review.reviewerAssessment = {};
    }

    review.reviewerAssessment.adminValidation = adminValidation;
    review.reviewerAssessment.adminValidatedBy = req.username;
    review.reviewerAssessment.adminValidatedAt = new Date();
    review.reviewerAssessment.adminValidationType = validationType;
    if (validationNotes) {
      review.reviewerAssessment.adminValidationNotes = validationNotes;
    }

    await review.save();

    console.log(`✅ Admin ${req.username} validated review ${reviewId} with score ${adminValidation}`);

    res.json({
      success: true,
      review: {
        id: review._id,
        reviewer: review.reviewerId?.username,
        proposal: review.proposalId?.proposalTitle,
        adminValidation: adminValidation,
        validatedBy: req.username,
        validatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Admin validate review error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/reviews-for-validation - Get reviews pending admin validation
router.get('/reviews-for-validation', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;

    // Build query
    const query = {
      status: status || { $in: ['submitted', 'completed'] },
      isDemo: { $ne: true },
      'reviewerAssessment.adminValidation': { $exists: false } // Not yet validated
    };

    const reviews = await Review.find(query)
      .populate('reviewerId', 'username email repPoints')
      .populate('proposalId', 'proposalTitle proposer budget')
      .select('scores categoryComments reviewerAssessment submittedAt status')
      .sort({ submittedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Get total count
    const total = await Review.countDocuments(query);

    // Format for admin interface
    const formattedReviews = reviews.map(review => ({
      id: review._id,
      reviewer: {
        id: review.reviewerId?._id,
        username: review.reviewerId?.username,
        email: review.reviewerId?.email,
        repPoints: review.reviewerId?.repPoints
      },
      proposal: {
        id: review.proposalId?._id,
        title: review.proposalId?.proposalTitle,
        author: review.proposalId?.proposer?.entity || review.proposalId?.proposer?.name,
        budget: review.proposalId?.budget?.total
      },
      scores: review.scores,
      selfExpertise: review.reviewerAssessment?.selfExpertiseLevel,
      temperatureCheck: review.reviewerAssessment?.temperatureCheck,
      submittedAt: review.submittedAt,
      status: review.status
    }));

    res.json({
      reviews: formattedReviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get reviews for validation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/validation-stats - Get validation statistics
router.get('/validation-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await Review.aggregate([
      {
        $match: {
          isDemo: { $ne: true },
          status: { $in: ['submitted', 'completed'] }
        }
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          validatedReviews: {
            $sum: {
              $cond: [{ $exists: ['$reviewerAssessment.adminValidation'] }, 1, 0]
            }
          },
          avgAdminValidation: {
            $avg: '$reviewerAssessment.adminValidation'
          },
          validationsByType: {
            $push: '$reviewerAssessment.adminValidationType'
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalReviews: 0,
      validatedReviews: 0,
      avgAdminValidation: null
    };

    // Calculate validation percentage
    result.validationPercentage = result.totalReviews > 0
      ? Math.round((result.validatedReviews / result.totalReviews) * 100)
      : 0;

    res.json(result);

  } catch (error) {
    console.error('Get validation stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;