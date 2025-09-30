// backend/src/server.js

// Environment Variables (only in development)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Dependencies
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Initialize Express
const app = express();

// Import Models
const User = require('./models/User');
const Review = require('./models/Review'); // New Review model for review results
const Proposal = require('./models/Proposal'); // Proposal model for all proposals
const Challenge = require('./models/Challenge');
const Fund = require('./models/Fund');

// Import Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

// Import Middleware
const { authenticateToken, requireAdmin } = require('./middleware/auth');

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',  // Local development
    'http://localhost:3001',  // Local development (alternative port)
    'https://develop.d1z3bvrliu55jb.amplifyapp.com',  // Amplify Development
    'https://app.trust-level.com',  // Production Frontend
    'https://upncfiirk4.eu-west-1.awsapprunner.com'  // Production Backend
  ]
}))
app.use(express.json());

// Auth Routes
app.use('/api', authRoutes);

// Admin Routes
app.use('/api/admin', adminRoutes);


// =====================================================
// BASIC ROUTES
// =====================================================

app.get('/', (req, res) => {
  res.send('Hallo! Der Server läuft! 🚀');
});

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API funktioniert!',
    timestamp: new Date()
  });
});

// =====================================================
// REVIEW ROUTES
// =====================================================

// Get user-specific assigned reviews + demo proposals (for dashboard) - Protected Route
app.get('/api/reviews', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // First: Find user's real assigned reviews (no demos)
    const realReviews = await Review.find({
      reviewerId: userId, 
      status: { $in: ['assigned', 'in_progress'] },
      isDemo: { $ne: true } // Exclude demo reviews
    }).populate('proposalId').limit(30);
    
    console.log(`Found ${realReviews.length} real reviews for user ${userId}`);
    
    let formatted = [];
    
    if (realReviews.length > 0) {
      // Process real assignments
      formatted = realReviews.map(review => {
        const proposal = review.proposalId;
        
        if (!proposal) {
          console.warn(`Warning: Review ${review._id} has no populated proposal`);
          return null;
        }
        
        // Calculate days until due date
        const dueDate = new Date(review.assignment?.dueDate);
        const today = new Date();
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const dueDateText = diffDays > 0 ? `${diffDays} day${diffDays !== 1 ? 's' : ''}` : 'Overdue';
        
        return {
          id: proposal._id.toString(),
          title: proposal.proposalTitle || "Unknown Title",
          summary: proposal.content?.solutionSummary || "No summary available",
          author: proposal.proposer?.entity || proposal.proposer?.name || "Unknown",
          requestedFunds: `₳${proposal.budget?.total?.toLocaleString() || '0'}`,
          dueDate: dueDateText, // Calculated based on actual due date
          reward: `${review.reward?.amount || 30} REP`, // Real reward
          tags: proposal.metadata?.tags || [],
          assignedTo: userId,
          type: 'proposal',
          proposalId: proposal.proposalId || proposal._id,
          isDemo: false,
          reviewStatus: review.status,
          assignedAt: review.assignment?.assignedAt
        };
      }).filter(Boolean);
      
      console.log(`✅ Processed ${formatted.length} real assignments`);
      
    } else {
      // Fallback: No real assignments found, show demo
      console.log(`🎭 No real assignments found, adding demo review fallback`);
      const demoReview = await Review.findOne({ 
        isDemo: true, 
        demoType: 'atlas-pab-bitcoin-integration' 
      }).populate('proposalId');
      
      if (demoReview && demoReview.proposalId) {
        const proposal = demoReview.proposalId;
        
        const demoFormatted = {
          id: proposal._id.toString(),
          title: proposal.proposalTitle,
          summary: proposal.content?.solutionSummary || "No summary available",
          author: proposal.proposer?.entity || proposal.proposer?.name || "Demo Team",
          requestedFunds: `₳${proposal.budget?.total?.toLocaleString() || '0'}`,
          dueDate: "Practice Mode",
          reward: "0 REP",
          tags: proposal.metadata?.tags || [],
          assignedTo: userId,
          type: 'proposal',
          proposalId: proposal.proposalId || proposal._id,
          isDemo: true,
          reviewStatus: 'assigned',
          assignedAt: new Date()
        };
        formatted.push(demoFormatted);
        console.log(`✅ Added demo proposal as fallback`);
      }
    }
    
    res.json(formatted);
    
  } catch (error) {
    console.error('User reviews fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reviews/completed - Get user's completed reviews (MUST be before /:id route)
app.get('/api/reviews/completed', authenticateToken, async (req, res) => {
  try {
    console.log(`🟢 API CALL: /api/reviews/completed for user: ${req.userId}`);
    console.log(`👤 DEBUG: req.user details:`, {
      id: req.user._id.toString(),
      name: req.user.name,
      email: req.user.email
    });

    const completedReviews = await Review.find({
      reviewerId: req.userId,
      status: { $in: ['submitted', 'completed'] },
      isDemo: { $ne: true } // Exclude demo reviews
    })
    .populate('proposalId', 'proposalTitle')
    .sort({ submittedAt: -1 });

    const formattedReviews = completedReviews.map(review => ({
      id: review._id.toString(),
      proposalTitle: review.proposalId?.proposalTitle || 'Unknown Proposal',
      submittedAt: review.submittedAt ? review.submittedAt.toISOString() : new Date().toISOString(),
      repPoints: review.reward?.amount || 0,
      scores: review.scores || null,
      categoryComments: review.categoryComments || null,
      isDemo: review.isDemo || false,
      // Include reviewerAssessment for early exit reviews
      reviewerAssessment: review.reviewerAssessment || null,
      isEarlyExit: review.reviewerAssessment?.earlyExit || false
    })).filter(review => review !== null); // Remove any failed reviews

    console.log(`✅ Returning ${formattedReviews.length} completed reviews`);
    res.json(formattedReviews);

  } catch (error) {
    console.error('❌ Error loading completed reviews:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single review details - Protected Route  
app.get('/api/reviews/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        error: 'Invalid ID format',
        message: 'ID must be a valid MongoDB ObjectId' 
      });
    }
    
    // Get proposal
    const review = await Proposal.findById(id);
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    // Get challenge data if linked
    let challengeInfo = null;
    if (review.challengeId) {
      const challenge = await Challenge.findById(review.challengeId);
      if (challenge) {
        challengeInfo = {
          name: challenge.name,
          description: challenge.description,
          budget: challenge.budget.amount,
          categoryRequirements: challenge.categoryRequirements || [],
          overview: challenge.overview || "",
          whoShouldApply: challenge.whoShouldApply || "",
          areasOfInterest: challenge.areasOfInterest || [],
          proposalGuidance: challenge.proposalGuidance || [],
          eligibilityCriteria: challenge.eligibilityCriteria || []
        };
      }
    }
    
    // Format response with REAL data from database
    const formatted = {
      // Basic info
      id: review._id.toString(),
      title: review.proposalTitle,
      author: review.proposer?.entity || review.proposer?.name || "Unknown Team",
      requestedFunds: `₳${review.budget?.total?.toLocaleString() || '0'}`,
      
      // Content - Map F14 structure to frontend expectations
      summary: review.content?.solutionSummary || "No summary provided",
      problemStatement: review.content?.problemStatement || "No problem statement provided",
      solution: review.content?.solutionSummary || "No solution summary provided", // Frontend expects solutionSummary in 'solution' field
      
      // AI Summary (if available)
      aiSummary: review.aiSummary || null,
      aiSummaryGeneratedAt: review.aiSummaryGeneratedAt || null,
      
      // Team statistics
      teamStats: {
        size: `${review.team?.length || 0} members`,
        previousProjects: review.proposer?.previousProjects?.length?.toString() || "0",
        githubActivity: review.team?.some(m => m.github) ? "Active" : "Not provided",
        completionRate: review.proposer?.previousProjects?.filter(p => p.status === 'completed').length 
          ? `${(review.proposer.previousProjects.filter(p => p.status === 'completed').length / review.proposer.previousProjects.length * 100).toFixed(0)}%` 
          : "No data"
      },
      
      // Full proposal details - Map F14 complete content
      fullProposal: {
        background: review.content?.solution || "Full proposal content not available" // Complete Catalyst content in background field
      },
      
      // Challenge info (from above)
      challengeInfo: challengeInfo,
      
      // Metadata
      tags: review.metadata?.tags || [],
      dueDate: review.reviewAssignment?.dueDate 
        ? `${Math.ceil((new Date(review.reviewAssignment.dueDate) - new Date()) / (1000 * 60 * 60 * 24))} days` 
        : "No deadline set",
      reward: "REP30", // Fund 14 standard
    };
    
    res.json(formatted);
  } catch (error) {
    console.error('Review detail fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// NEW REVIEW APIs - TODO: Move to routes/reviews.js later
// =====================================================

// Get review progress - Protected Route
app.get('/api/reviews/:id/progress', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    // Validate MongoDB ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid review ID format' });
    }
    
    // Find existing review or create new one
    let review = await Review.findOne({
      proposalId: id,
      reviewerId: userId
    });
    
    // If no review exists, create a draft
    if (!review) {
      // Get proposal data from Proposal model
      const proposal = await Proposal.findById(id);
      if (!proposal) {
        return res.status(404).json({ error: 'Proposal not found' });
      }
      
      // Check if this is a demo proposal
      const isDemoProposal = proposal.proposalTitle && 
                            (proposal.proposalTitle.toLowerCase().includes('demo:') || 
                             proposal.proposalTitle.toLowerCase().startsWith('demo '));

      review = new Review({
        proposalId: id,
        reviewerId: userId,
        challengeId: proposal.challengeId,
        assignment: {
          assignedAt: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
        status: 'in_progress',
        isDemo: isDemoProposal
      });
      await review.save();
    }
    
    res.json({
      reviewId: review._id,
      completionPercentage: review.getCompletionPercentage(),
      progress: review.reviewProgress || {},
      isComplete: review.isComplete || false,
      submittedAt: review.submittedAt
    });
    
  } catch (error) {
    console.error('Review progress fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save review progress - Protected Route
app.post('/api/reviews/:id/progress', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { category, rating, comment } = req.body;
    
    // Validate input
    if (!category || rating === undefined || rating === null) {
      return res.status(400).json({ error: 'Category and rating are required' });
    }
    
    const validCategories = ['relevance', 'innovation', 'impact', 'feasibility', 'team', 'budget'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    if (rating < -3 || rating > 3) {
      return res.status(400).json({ error: 'Rating must be between -3 and 3' });
    }
    
    // Find review
    let review = await Review.findOne({
      proposalId: id,
      reviewerId: userId
    });
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found. Call GET /progress first.' });
    }
    
    // Save progress
    await review.saveProgress(category, rating, comment || '');
    
    // Determine next category
    const categoryOrder = ['relevance', 'innovation', 'impact', 'feasibility', 'team', 'budget'];
    const currentIndex = categoryOrder.indexOf(category);
    const nextCategory = currentIndex < categoryOrder.length - 1 ? categoryOrder[currentIndex + 1] : null;
    
    res.json({
      success: true,
      completionPercentage: review.getCompletionPercentage(),
      nextCategory: nextCategory,
      isReadyToSubmit: review.getCompletionPercentage() === 100
    });
    
  } catch (error) {
    console.error('Review progress save error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save reviewer assessment (expertise + temperature check) - Protected Route
app.post('/api/reviews/:id/assessment', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { selfExpertise, temperatureCheck, qualityIssues = [], qualityComment = '' } = req.body;
    
    // Validate input
    if (!selfExpertise || !temperatureCheck) {
      return res.status(400).json({ error: 'Self expertise level and temperature check are required' });
    }
    
    if (selfExpertise < 1 || selfExpertise > 5) {
      return res.status(400).json({ error: 'Self expertise level must be between 1 and 5' });
    }
    
    const validTemperatureChecks = ['promising', 'low-quality'];
    if (!validTemperatureChecks.includes(temperatureCheck)) {
      return res.status(400).json({ error: 'Invalid temperature check value' });
    }
    
    // Find review
    const review = await Review.findOne({
      proposalId: id,
      reviewerId: userId
    });
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    // Save assessment data
    await review.saveReviewerAssessment(selfExpertise, temperatureCheck, qualityIssues, qualityComment);
    
    console.log(`✅ Assessment saved by user ${userId} for proposal ${id}: ${temperatureCheck}`);
    
    res.json({
      success: true,
      assessmentSaved: true,
      temperatureCheck: temperatureCheck,
      canEarlyExit: temperatureCheck === 'low-quality'
    });
    
  } catch (error) {
    console.error('Assessment save error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Submit early exit review (after low-quality temperature check) - Protected Route
app.post('/api/reviews/:id/submit-early', authenticateToken, async (req, res) => {
  console.log('🔴 SUBMIT-EARLY ENDPOINT HIT:', { proposalId: req.params.id, userId: req.userId });
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    // Find review
    const review = await Review.findOne({
      proposalId: id,
      reviewerId: userId
    });
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    console.log('🔍 Review debug:', { 
      isDemo: review.isDemo, 
      isComplete: review.isComplete, 
      status: review.status 
    });
    
    // DEMO EXCEPTION: Reset demo reviews for testing
    if (review.isDemo && review.isComplete) {
      console.log('🔄 Resetting demo review for testing purposes');
      review.isComplete = false;
      review.status = 'in_progress';
      review.submittedAt = null;
      if (review.reviewerAssessment) {
        review.reviewerAssessment.earlyExit = false;
      }
      await review.save();
    } else if (review.isComplete) {
      return res.status(400).json({ error: 'Review already submitted' });
    }
    
    // Check if assessment was saved and is low-quality
    console.log('Review assessment:', review.reviewerAssessment);
    if (!review.reviewerAssessment || review.reviewerAssessment.temperatureCheck !== 'low-quality') {
      console.log('Assessment validation failed:', {
        hasAssessment: !!review.reviewerAssessment,
        temperatureCheck: review.reviewerAssessment?.temperatureCheck
      });
      return res.status(400).json({ error: 'Early exit only allowed after low-quality temperature check' });
    }
    
    // Mark as early exit and completed
    review.status = 'submitted';
    review.isComplete = true;
    review.submittedAt = new Date();
    review.reviewerAssessment.earlyExit = true;
    
    await review.save();
    
    console.log(`✅ Early exit review submitted by user ${userId} for proposal ${id}`);
    
    res.json({
      success: true,
      reviewId: review._id,
      earlyExit: true,
      reason: 'low-quality',
      reward: review.isDemo ? '0 REP (Demo)' : `${review.reward.amount} REP`,
      message: 'Review submitted successfully (early exit)',
      submittedAt: review.submittedAt
    });
    
  } catch (error) {
    console.error('Early exit submission error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Submit final review - Protected Route
app.post('/api/reviews/:id/submit', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    // Find review
    const review = await Review.findOne({
      proposalId: id,
      reviewerId: userId
    });
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    if (review.isComplete) {
      return res.status(400).json({ error: 'Review already submitted' });
    }
    
    // Check if all categories are completed
    if (review.getCompletionPercentage() < 100) {
      return res.status(400).json({ 
        error: 'All categories must be completed before submission',
        completionPercentage: review.getCompletionPercentage()
      });
    }
    
    // Submit review
    await review.submit();
    
    console.log(`✅ Review submitted by user ${userId} for proposal ${id}`);
    
    res.json({
      success: true,
      reviewId: review._id,
      reward: review.isDemo ? '0 REP (Demo)' : `${review.reward.amount} REP`,
      message: 'Review submitted successfully',
      submittedAt: review.submittedAt
    });
    
  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// FUND ROUTES
// =====================================================

// Get fund status (specific route for Fund 14)
app.get('/api/fund/status', async (req, res) => {
  try {
    const fund = await Fund.findOne({ fundNumber: 14 });
    
    if (!fund) {
      return res.status(404).json({ error: 'Fund 14 not found' });
    }
    
    res.json({
      fundNumber: fund.fundNumber,
      name: fund.name,
      status: fund.status,
      budget: fund.budget,
      timeline: fund.timeline,
      isActive: fund.isActive
    });
  } catch (error) {
    console.error('Fund status fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all funds
app.get('/api/funds', async (req, res) => {
  try {
    const funds = await Fund.find({});
    
    const formatted = funds.map(fund => ({
      id: fund._id.toString(),
      fundNumber: fund.fundNumber,
      name: fund.name,
      status: fund.status,
      budget: fund.budget,
      timeline: fund.timeline,
      isActive: fund.isActive,
      createdAt: fund.createdAt
    }));
    
    res.json(formatted);
  } catch (error) {
    console.error('Fund fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get fund details with challenges
app.get('/api/funds/:id', async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id);
    if (!fund) {
      return res.status(404).json({ error: 'Fund not found' });
    }
    
    const challenges = await Challenge.find({ fundId: fund._id });
    
    res.json({
      ...fund.toObject(),
      challenges: challenges.map(c => ({
        id: c._id.toString(),
        name: c.name,
        budget: c.budget.amount,
        status: c.status
      }))
    });
  } catch (error) {
    console.error('Fund detail error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// CHALLENGE ROUTES
// =====================================================

// Get all challenges
app.get('/api/challenges', async (req, res) => {
  try {
    const challenges = await Challenge.find({})
      .populate('fundId', 'name fundNumber');
    
    const formatted = challenges.map(challenge => ({
      id: challenge._id.toString(),
      name: challenge.name,
      description: challenge.description,
      budget: challenge.budget,
      fund: challenge.fundId ? {
        id: challenge.fundId._id,
        name: challenge.fundId.name,
        number: challenge.fundId.fundNumber
      } : null,
      status: challenge.status,
      areasCount: challenge.areasOfInterest?.length || 0,
      requirementsCount: challenge.categoryRequirements?.length || 0
    }));
    
    res.json(formatted);
  } catch (error) {
    console.error('Challenge fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get challenge details
app.get('/api/challenges/:id', async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id)
      .populate('fundId', 'name fundNumber');
    
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    res.json(challenge);
  } catch (error) {
    console.error('Challenge detail error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// PEER-REVIEW ROUTES
// =====================================================


// Get all peer-reviews (for dashboard) - Protected Route  
app.get('/api/peer-reviews', authenticateToken, async (req, res) => {
  try {
    const { id } = req.query;
    const PeerReview = require('./models/PeerReview');

    // If specific ID requested, return detailed peer-review data
    if (id) {
      try {
        console.log(`🔍 API Debug: Looking for peer review with ID: ${id}`);
        
        // Use existing helper to check if this is a demo ID
        const isDemo = await checkIfDemoAssessment(id);
        console.log(`🔍 Is demo ID:`, isDemo ? 'YES' : 'NO');
        
        if (isDemo) {
          // Handle demo peer-review (use same logic as dashboard fallback)
          console.log(`🎭 Processing demo peer-review for ID: ${id}`);
          const demoReview = await Review.findById(id);
          
          if (!demoReview || !demoReview.isDemo) {
            console.log(`❌ Demo review not found or not demo for ID: ${id}`);
            return res.status(404).json({ error: 'Demo peer review not found' });
          }
          
          // Load the proposal data
          console.log(`🔍 Loading proposal with ID: ${demoReview.proposalId}`);
          const proposal = await Proposal.findById(demoReview.proposalId);
          if (!proposal) {
            console.log(`❌ Proposal not found for ID: ${demoReview.proposalId}`);
            return res.status(404).json({ error: 'Proposal not found' });
          }
          console.log(`✅ Proposal loaded: ${proposal.proposalTitle}`);

          // Get challenge data if linked
          let challengeInfo = null;
          if (proposal && proposal.challengeId) {
            console.log(`🔍 Loading challenge with ID: ${proposal.challengeId}`);
            const challenge = await Challenge.findById(proposal.challengeId);
            if (challenge) {
              challengeInfo = {
                name: challenge.name,
                description: challenge.description,
                budget: challenge.budget?.amount,
                categoryRequirements: challenge.categoryRequirements || [],
                overview: challenge.overview || "",
                whoShouldApply: challenge.whoShouldApply || "",
                areasOfInterest: challenge.areasOfInterest || [],
                proposalGuidance: challenge.proposalGuidance || [],
                eligibilityCriteria: challenge.eligibilityCriteria || []
              };
              console.log(`✅ Challenge info loaded: ${challenge.name}`);
            }
          }

          console.log(`🔍 Building demo response object...`);
          
          // Format the demo response (same as dashboard)
          const response = {
            assignment: {
              id: demoReview._id,
              reviewId: demoReview._id,
              proposalId: demoReview.proposalId,
              proposalTitle: proposal?.proposalTitle,
              reviewerName: "Demo Reviewer",
              assignedTo: req.userId,
              status: "pending",
              dueDate: "7 days",
              reward: "REP15"
            },
            review: {
              id: demoReview._id,
              proposalId: demoReview.proposalId,
              reviewerId: demoReview.reviewerId,
              submittedAt: demoReview.submittedAt,
              isComplete: demoReview.isComplete,
              status: demoReview.status,
              scores: demoReview.scores,
              categoryComments: demoReview.categoryComments,
              // DEMO: Add fake temperature check data for UI testing
              temperatureCheck: 'promising',
              temperatureCheckIssues: [],
              temperatureCheckComment: null,
              expertise: 4,
              // Format for frontend compatibility
              ratings: {
                relevance: { score: demoReview.scores?.relevance, comment: demoReview.categoryComments?.relevance },
                innovation: { score: demoReview.scores?.innovation, comment: demoReview.categoryComments?.innovation },
                impact: { score: demoReview.scores?.impact, comment: demoReview.categoryComments?.impact },
                feasibility: { score: demoReview.scores?.feasibility, comment: demoReview.categoryComments?.feasibility },
                team: { score: demoReview.scores?.team, comment: demoReview.categoryComments?.team },
                budget: { score: demoReview.scores?.budget, comment: demoReview.categoryComments?.budget }
              }
            },
            proposal: {
              id: proposal?._id,
              title: proposal?.proposalTitle,
              author: proposal?.proposer?.entity || proposal?.proposer?.name || "Unknown",
              requestedFunds: `REP${proposal?.budget?.total?.toLocaleString() || '0'}`,
              summary: proposal?.content?.solutionSummary || "No summary available",
              tags: proposal?.metadata?.tags || [],
              challengeInfo: challengeInfo
            }
          };

          console.log(`✅ Demo response built successfully, sending...`);
          return res.json(response);
        }
        
        // Handle real peer-review
        console.log(`🔍 Processing real peer-review for ID: ${id}`);
        const peerReview = await PeerReview.findById(id);
        
        if (!peerReview) {
          console.log(`❌ Real peer review not found for ID: ${id}`);
          return res.status(404).json({ error: 'Peer review not found' });
        }

        console.log(`🔍 Found PeerReview ID: ${peerReview._id}, proposalId: ${peerReview.proposalId}`);

        // Assessment is now integrated in the PeerReview model
        const hasAssessment = peerReview.status === 'completed';
        console.log(`🔍 Assessment completed:`, hasAssessment ? 'YES' : 'NO');

        // Load the review data
        console.log(`🔍 Loading review with ID: ${peerReview.reviewId}`);
        const reviewData = await Review.findById(peerReview.reviewId);
        if (!reviewData) {
          console.log(`❌ Review not found for ID: ${peerReview.reviewId}`);
          return res.status(404).json({ error: 'Review not found' });
        }
        console.log(`✅ Review loaded, scores:`, reviewData.scores);
        
        // Load the proposal data
        console.log(`🔍 Loading proposal with ID: ${peerReview.proposalId}`);
        const proposal = await Proposal.findById(peerReview.proposalId);
        if (!proposal) {
          console.log(`❌ Proposal not found for ID: ${peerReview.proposalId}`);
          return res.status(404).json({ error: 'Proposal not found' });
        }
        console.log(`✅ Proposal loaded: ${proposal.proposalTitle}`);

        // Get challenge data if linked
        let challengeInfo = null;
        if (proposal && proposal.challengeId) {
          console.log(`🔍 Loading challenge with ID: ${proposal.challengeId}`);
          const challenge = await Challenge.findById(proposal.challengeId);
          if (challenge) {
            challengeInfo = {
              name: challenge.name,
              description: challenge.description,
              budget: challenge.budget?.amount,
              categoryRequirements: challenge.categoryRequirements || [],
              overview: challenge.overview || "",
              whoShouldApply: challenge.whoShouldApply || "",
              areasOfInterest: challenge.areasOfInterest || [],
              proposalGuidance: challenge.proposalGuidance || [],
              eligibilityCriteria: challenge.eligibilityCriteria || []
            };
            console.log(`✅ Challenge info loaded: ${challenge.name}`);
          }
        }

        console.log(`🔍 Building response object...`);
        
        // Format the response
        const response = {
          assignment: {
            id: peerReview._id,
            reviewId: peerReview.reviewId,
            proposalId: peerReview.proposalId,
            proposalTitle: proposal?.proposalTitle,
            reviewerName: "Demo Reviewer", // TODO: Load from review.reviewerId when needed
            assignedTo: peerReview.assignedTo,
            status: peerReview.status,
            dueDate: `${Math.ceil((peerReview.dueDate - new Date()) / (1000 * 60 * 60 * 24))} days`,
            reward: `${peerReview.reward} REP`
          },
          review: {
            id: reviewData._id,
            proposalId: reviewData.proposalId,
            reviewerId: reviewData.reviewerId,
            submittedAt: reviewData.submittedAt,
            isComplete: reviewData.isComplete,
            status: reviewData.status,
            scores: reviewData.scores,
            categoryComments: reviewData.categoryComments,
            // Add temperature check data from reviewerAssessment
            temperatureCheck: reviewData.reviewerAssessment?.temperatureCheck || 'promising',
            temperatureCheckIssues: reviewData.reviewerAssessment?.qualityIssues || [],
            temperatureCheckComment: reviewData.reviewerAssessment?.qualityComment || null,
            expertise: reviewData.reviewerAssessment?.selfExpertiseLevel || 4,
            // Format for frontend compatibility
            ratings: {
              relevance: { score: reviewData.scores?.relevance, comment: reviewData.categoryComments?.relevance },
              innovation: { score: reviewData.scores?.innovation, comment: reviewData.categoryComments?.innovation },
              impact: { score: reviewData.scores?.impact, comment: reviewData.categoryComments?.impact },
              feasibility: { score: reviewData.scores?.feasibility, comment: reviewData.categoryComments?.feasibility },
              team: { score: reviewData.scores?.team, comment: reviewData.categoryComments?.team },
              budget: { score: reviewData.scores?.budget, comment: reviewData.categoryComments?.budget }
            }
          },
          proposal: {
            id: proposal?._id,
            title: proposal?.proposalTitle,
            author: proposal?.proposer?.entity || proposal?.proposer?.name || "Unknown",
            requestedFunds: `REP${proposal?.budget?.total?.toLocaleString() || '0'}`,
            summary: proposal?.content?.solutionSummary || "No summary available",
            tags: proposal?.metadata?.tags || [],
            challengeInfo: challengeInfo  // Add challenge information
          }
        };

        console.log(`✅ Response built successfully, sending...`);
        return res.json(response);
        
      } catch (error) {
        console.error(`💥 500 Error in peer-reviews API:`, error);
        console.error(`💥 Error stack:`, error.stack);
        return res.status(500).json({ 
          error: 'Internal server error', 
          details: error.message,
          step: 'Processing peer review request'
        });
      }
    }

    // Dashboard list - Try real peer-reviews first, then fall back to demo
    console.log(`🔍 Loading peer-reviews for user: ${req.userId}`);
    
    // First try to get real peer-reviews for the user
    // Use direct query with manual populate to avoid schema issues
    const realPeerReviews = await PeerReview.find({ 
      assignedTo: req.userId,
      status: 'pending'
    }).populate({
      path: 'reviewId',
      select: 'proposalId reviewerId',
      populate: {
        path: 'proposalId',
        select: 'proposalTitle'
      }
    });
    console.log(`🔍 Found ${realPeerReviews.length} real peer-reviews`);
    
    if (realPeerReviews.length > 0) {
      // Format real peer-reviews for frontend
      const formattedPeerReviews = realPeerReviews.map(pr => {
        const daysUntilDue = Math.ceil((pr.dueDate - new Date()) / (1000 * 60 * 60 * 24));
        return {
          id: pr._id.toString(),
          reviewId: pr.reviewId,
          proposalId: pr.proposalId,
          proposalTitle: pr.reviewId?.proposalId?.proposalTitle || "Loading...",
          reviewerName: "Reviewer",
          assignedTo: pr.assignedTo,
          status: pr.status,
          dueDate: `${daysUntilDue} days`,
          reward: `${pr.reward} REP`
        };
      });
      
      console.log(`✅ Returning ${formattedPeerReviews.length} real peer-reviews`);
      return res.json(formattedPeerReviews);
    }
    
    // Fallback to demo data if no real peer-reviews found
    console.log(`🎭 No real peer-reviews found, showing demo data`);
    const demoReview = await Review.findOne({ isDemo: true, demoType: 'atlas-pab-bitcoin-integration' });
    
    if (demoReview) {
      // Load the reviewer info for demo
      let reviewerName = "Demo Reviewer"; // fallback
      if (demoReview.reviewerId) {
        const reviewer = await User.findById(demoReview.reviewerId);
        if (reviewer) {
          reviewerName = reviewer.name || reviewer.email || "Demo Reviewer";
        }
      }

      const demoPeerReview = {
        id: demoReview._id.toString(), // Use Demo Review ID as Peer Review ID for now
        reviewId: demoReview._id,
        proposalId: demoReview.proposalId,
        proposalTitle: "DEMO: Atlas PAB: Native Bitcoin Integration Layer",
        reviewerName: reviewerName,
        assignedTo: req.userId,
        status: "pending", 
        dueDate: "Practice Mode",
        reward: "0 REP",
        isDemo: true  // Add demo flag for badge
      };
      
      console.log(`✅ Returning demo peer-review`);
      res.json([demoPeerReview]);
    } else {
      console.log(`❌ No demo data found either`);
      res.json([]);
    }
    
  } catch (error) {
    console.error('Peer-review fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to check if assessment ID is for demo data
async function checkIfDemoAssessment(id) {
  try {
    // Demo IDs are typically the Review ObjectId (used as peer-review ID in demo)
    // If we can find a Review with this ID that is a demo, it's demo data
    const Review = require('./models/Review');
    const demoReview = await Review.findById(id);
    return demoReview && demoReview.isDemo;
  } catch (error) {
    // If ID format is invalid for Review lookup, it might be a real PeerReview ID
    return false;
  }
}

// Submit peer-review assessment - Protected Route
app.post('/api/peer-reviews/:id/assessment', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { assessmentType = 'normal', assessments, feedback, lowQualityAgreement } = req.body;
    
    // Validate assessment type
    if (!['normal', 'low-quality-agreement'].includes(assessmentType)) {
      return res.status(400).json({ error: 'Invalid assessment type' });
    }

    // Validate based on assessment type
    if (assessmentType === 'low-quality-agreement') {
      // Validate low quality agreement
      if (!lowQualityAgreement || typeof lowQualityAgreement.agree !== 'boolean') {
        return res.status(400).json({ error: 'Low quality agreement is required' });
      }
    } else {
      // Validate normal assessment criteria
      if (!assessments || typeof assessments !== 'object') {
        return res.status(400).json({ error: 'Assessments are required for normal reviews' });
      }
      
      // Validate assessment criteria for normal type
      const requiredCriteria = ['specificity', 'clarity', 'insightful'];
      for (const criterion of requiredCriteria) {
        if (typeof assessments[criterion] !== 'number' || 
            assessments[criterion] < -3 || 
            assessments[criterion] > 3) {
          return res.status(400).json({ 
            error: `Invalid ${criterion} score. Must be between -3 and 3.` 
          });
        }
      }
    }

    // Check if this is a demo assessment (demo IDs are typically Review ObjectIds)
    const PeerReview = require('./models/PeerReview');
    const isDemo = await checkIfDemoAssessment(id);
    
    if (isDemo) {
      // Demo response - just log like before
      if (assessmentType === 'low-quality-agreement') {
        console.log(`🎭 DEMO Low-Quality Agreement Assessment submitted by user ${req.userId}:`, {
          peerReviewId: id,
          assessmentType,
          lowQualityAgreement,
          submittedAt: new Date()
        });
      } else {
        console.log(`🎭 DEMO Normal Peer-Review Assessment submitted by user ${req.userId}:`, {
          peerReviewId: id,
          assessmentType,
          assessments,
          feedback,
          submittedAt: new Date()
        });
      }
    } else {
      // Real peer-review assessment - save to database
      console.log(`💾 Saving real peer-review assessment for ID: ${id}`);
      
      const peerReview = await PeerReview.findById(id);
      if (!peerReview) {
        return res.status(404).json({ error: 'Peer-review not found' });
      }
      
      // Check if user is assigned to this peer-review
      if (!peerReview.assignedTo.equals(req.userId)) {
        return res.status(403).json({ error: 'Not authorized to assess this peer-review' });
      }
      
      // Check if already completed
      if (peerReview.status === 'completed') {
        return res.status(400).json({ error: 'Peer-review already completed' });
      }
      
      // Submit the assessment using the model method
      await peerReview.submit({
        assessmentType,
        assessments: assessmentType === 'normal' ? assessments : undefined,
        lowQualityAgreement: assessmentType === 'low-quality-agreement' ? lowQualityAgreement : undefined,
        feedback: assessmentType === 'normal' ? feedback : undefined
      });
      
      console.log(`✅ Real peer-review assessment saved successfully`);
    }

    res.json({
      success: true,
      message: 'Assessment submitted successfully',
      data: {
        peerReviewId: id,
        assessedBy: req.userId,
        assessmentType,
        ...(assessmentType === 'normal' && { assessments, feedback: feedback || null }),
        ...(assessmentType === 'low-quality-agreement' && { lowQualityAgreement }),
        submittedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Assessment submission error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// LEADERBOARD ROUTES
// =====================================================

// Get leaderboard data (users with REP points) - Protected Route
app.get('/api/leaderboard', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({ 
      repPoints: { $gt: 0 },
      username: { $ne: null } // Nur User mit Username
    })
    .select('username repPoints reviewerStatus')
    .sort({ repPoints: -1, username: 1 }) // Nach Punkten, dann alphabetisch
    .limit(100);
    
    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      username: user.username,
      repPoints: user.repPoints,
      reviewerStatus: user.reviewerStatus
    }));
    
    res.json(leaderboard);
    
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});


// =====================================================
// ASSIGNMENT REQUEST ROUTES
// =====================================================

// Request more assignments - Protected Route
app.post('/api/assignment-requests', authenticateToken, async (req, res) => {
  try {
    const { requestType } = req.body;
    
    if (!['reviews', 'peer-reviews', 'both'].includes(requestType)) {
      return res.status(400).json({ error: 'Invalid request type' });
    }
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user is approved
    if (user.reviewerStatus !== 'approved') {
      return res.status(403).json({ error: 'Only approved reviewers can request more assignments' });
    }
    
    // Check for existing pending request
    const AssignmentRequest = require('./models/AssignmentRequest');
    const existingRequest = await AssignmentRequest.findOne({
      userId: req.userId,
      status: 'pending'
    });
    
    if (existingRequest) {
      return res.status(400).json({ error: 'You already have a pending request' });
    }
    
    // Get current stats
    const Review = require('./models/Review');
    const PeerReview = require('./models/PeerReview');
    
    const completedReviews = await Review.countDocuments({
      reviewerId: req.userId,
      status: 'submitted',
      isDemo: { $ne: true }
    });
    
    const pendingReviews = await Review.countDocuments({
      reviewerId: req.userId,
      status: { $in: ['assigned', 'in_progress'] },
      isDemo: { $ne: true }
    });
    
    const completedPeerReviews = await PeerReview.countDocuments({
      assignedTo: req.userId,
      status: 'submitted'
    });
    
    const pendingPeerReviews = await PeerReview.countDocuments({
      assignedTo: req.userId,
      status: 'pending'
    });
    
    // Create new request
    const newRequest = await AssignmentRequest.create({
      userId: req.userId,
      username: user.username,
      requestType,
      currentStats: {
        completedReviews,
        completedPeerReviews,
        repPoints: user.repPoints || 0,
        pendingReviews,
        pendingPeerReviews
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Request submitted successfully',
      requestId: newRequest._id 
    });
    
  } catch (error) {
    console.error('Assignment request error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's assignment requests - Protected Route
app.get('/api/assignment-requests/my', authenticateToken, async (req, res) => {
  try {
    const AssignmentRequest = require('./models/AssignmentRequest');
    const requests = await AssignmentRequest.find({ userId: req.userId })
      .sort({ requestedAt: -1 })
      .limit(10);
    
    res.json(requests);
  } catch (error) {
    console.error('Fetch assignment requests error:', error);
    res.status(500).json({ error: error.message });
  }
});


// =====================================================
// SETTINGS ROUTES (Simple)
// =====================================================

// Get user settings (expertise + interests only) - Protected Route
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('onboardingData');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      expertise: user.onboardingData?.expertise || [],
      interests: user.onboardingData?.interests || []
    });
    
  } catch (error) {
    console.error('Settings fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user settings (expertise + interests only) - Protected Route
app.put('/api/settings', authenticateToken, async (req, res) => {
  try {
    const { expertise, interests } = req.body;
    
    // Validate expertise
    if (expertise && Array.isArray(expertise)) {
      const validAreas = ['technical', 'community', 'product'];
      for (const exp of expertise) {
        if (!exp.area || !validAreas.includes(exp.area) || 
            typeof exp.level !== 'number' || exp.level < 1 || exp.level > 5) {
          return res.status(400).json({ 
            error: 'Invalid expertise format' 
          });
        }
      }
    }
    
    // Validate interests
    if (interests && Array.isArray(interests)) {
      const validInterests = [
        'governance', 'education', 'community_outreach', 'development_tools',
        'identity_security', 'defi', 'real_world_applications', 'events_marketing',
        'interoperability', 'sustainability', 'smart_contracts', 'gamefi', 'nft'
      ];
      
      const invalidInterests = interests.filter(interest => !validInterests.includes(interest));
      if (invalidInterests.length > 0) {
        return res.status(400).json({ error: 'Invalid interests' });
      }
    }
    
    // Update user settings
    await User.findByIdAndUpdate(
      req.userId,
      {
        $set: {
          'onboardingData.expertise': expertise || [],
          'onboardingData.interests': interests || []
        }
      }
    );
    
    res.json({ success: true, message: 'Settings updated successfully' });
    
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ error: error.message });
  }
});


// =====================================================
// USER/ONBOARDING ROUTES
// =====================================================

// Complete onboarding for a user (Protected Route)
app.post('/api/onboarding', authenticateToken, async (req, res) => {
  try {
    // User kommt jetzt aus JWT Token via middleware
    const userId = req.userId; // Set by authenticateToken middleware
    
    const {
      username,
      onboardingData,
      telegram,
      discord,
      acceptedGuidelines,
      acceptedGuidelinesAt
    } = req.body;
    
    // Extract nested onboarding data
    const {
      expertise,
      interests,
      reviewCapacity,
      affiliations,
      previousFunds,
      otherGrants,
      completedAt
    } = onboardingData || {};
    
    // Validate required fields
    if (!username || !expertise || !interests || !reviewCapacity || !acceptedGuidelines) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['username', 'expertise', 'interests', 'reviewCapacity', 'acceptedGuidelines']
      });
    }
    
    // Check if username is already taken
    const existingUser = await User.findOne({ username: username });
    if (existingUser && existingUser._id.toString() !== userId) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    // Update user with onboarding data
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        username,
        onboardingCompleted: true,
        onboardingData: {
          expertise,
          interests,
          reviewCapacity,
          affiliations: affiliations || {
            hasAffiliations: false,
            proposalList: ''
          },
          previousFunds: previousFunds || [],
          otherGrants: otherGrants || '',
          completedAt: completedAt ? new Date(completedAt) : new Date()
        },
        telegram: telegram || '',
        discord: discord || '',
        acceptedGuidelines: true,
        acceptedGuidelinesAt: acceptedGuidelinesAt ? new Date(acceptedGuidelinesAt) : new Date()
      },
      { 
        new: true,
        runValidators: true 
      }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`✅ Onboarding completed for user: ${updatedUser.username}`);
    
    // Return success with user data
    res.json({
      success: true,
      message: 'Onboarding completed successfully',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        onboardingCompleted: updatedUser.onboardingCompleted,
        reviewerStatus: updatedUser.reviewerStatus,
        role: updatedUser.role || 'reviewer'  // Include role
      }
    });
    
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ 
      error: 'Failed to complete onboarding',
      message: error.message 
    });
  }
});

// Get onboarding status for authenticated user
app.get('/api/onboarding/status', authenticateToken, async (req, res) => {
  try {
    const user = req.user; // User already loaded by middleware
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    
    res.json({
      userId: user._id,
      username: user.username,
      email: user.email,
      onboardingCompleted: user.onboardingCompleted,
      reviewerStatus: user.reviewerStatus,
      role: user.role || 'reviewer',  // Include role for admin check
      repPoints: user.repPoints || 0,
      needsOnboarding: !user.onboardingCompleted,
      expertiseAreas: user.onboardingData?.expertise?.map(e => e.area) || [],
      interests: user.onboardingData?.interests || [],
      onboardingData: user.onboardingData || null
    });
    
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: error.message });
  }
});


// =====================================================
// DEBUG ROUTE
// =====================================================

app.get('/api/debug', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database not connected yet',
        connectionState: mongoose.connection.readyState 
      });
    }
    
    const funds = await Fund.find({});
    const challenges = await Challenge.find({}).populate('fundId');
    const proposals = await Proposal.find({}).limit(10);
    
    res.json({
      summary: {
        totalFunds: funds.length,
        totalChallenges: challenges.length,
        totalProposals: proposals.length
      },
      funds: funds.map(f => ({
        id: f._id,
        number: f.fundNumber,
        name: f.name,
        budget: `REP${f.budget?.total?.toLocaleString() || '0'}`
      })),
      challenges: challenges.map(c => ({
        id: c._id,
        name: c.name,
        fund: c.fundId?.name,
        budget: `REP${c.budget.amount.toLocaleString()}`
      })),
      recentProposals: proposals.map(p => ({
        id: p._id,
        title: p.proposalTitle,
        fund: p.fundId,
        challenge: p.challengeId
      }))
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// COMPLETED REVIEWS/PEER-REVIEWS APIs
// =====================================================

// GET /api/peer-reviews/completed - Get user's completed peer-reviews
app.get('/api/peer-reviews/completed', authenticateToken, async (req, res) => {
  try {
    const PeerReview = require('./models/PeerReview');
    console.log(`🔍 Loading completed peer-reviews for user: ${req.userId}`);

    const completedPeerReviews = await PeerReview.find({
      assignedTo: req.userId,
      status: 'completed'
    })
    .populate({
      path: 'reviewId',
      select: 'proposalId reviewerId isDemo',
      populate: {
        path: 'proposalId',
        select: 'proposalTitle'
      }
    })
    .sort({ submittedAt: -1 });

    const formattedPeerReviews = completedPeerReviews.map(peerReview => ({
      id: peerReview._id.toString(),
      proposalTitle: peerReview.reviewId?.proposalId?.proposalTitle || 'Unknown Proposal',
      reviewerName: 'Reviewer', // TODO: Load actual reviewer name
      submittedAt: peerReview.submittedAt?.toISOString() || new Date().toISOString(),
      repPoints: peerReview.reward || 0,
      assessmentType: peerReview.assessmentType,
      assessments: peerReview.assessments,
      lowQualityAgreement: peerReview.lowQualityAgreement,
      feedback: peerReview.feedback,
      overallScore: peerReview.overallScore,
      isDemo: peerReview.reviewId?.isDemo || false
    }));

    console.log(`✅ Returning ${formattedPeerReviews.length} completed peer-reviews`);
    res.json(formattedPeerReviews);

  } catch (error) {
    console.error('❌ Error loading completed peer-reviews:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// MISSION ROUTES
// =====================================================

// Complete a mission and claim reward - Protected Route
app.post('/api/user/complete-mission', authenticateToken, async (req, res) => {
  try {
    const { missionId, walletAddress } = req.body;
    
    // Validate required fields
    if (!missionId || !walletAddress) {
      return res.status(400).json({ error: 'Mission ID and wallet address are required' });
    }
    
    // Validate Cardano wallet address format
    const cardanoAddressRegex = /^addr1[a-z0-9]{98}$/;
    if (!cardanoAddressRegex.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid Cardano wallet address format' });
    }
    
    // Get user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if mission already completed
    const existingMission = user.completedMissions.find(m => m.missionId === missionId);
    if (existingMission) {
      return res.status(400).json({ error: 'Mission already completed' });
    }
    
    // Validate mission completion based on missionId
    let missionCompleted = false;
    let rewardAmount = '';
    
    if (missionId === 'beta-tester-champion') {
      // Get user's completed reviews and peer-reviews
      const Review = require('./models/Review');
      const PeerReview = require('./models/PeerReview');
      
      const completedReviews = await Review.find({
        reviewerId: req.userId,
        status: { $in: ['submitted', 'completed'] },
        isDemo: { $ne: true }
      });
      
      const completedPeerReviews = await PeerReview.find({
        assignedTo: req.userId,
        status: 'completed'
      });
      
      missionCompleted = completedReviews.length >= 5 && completedPeerReviews.length >= 10;
      rewardAmount = '50 ADA';
    }
    
    if (!missionCompleted) {
      return res.status(400).json({ error: 'Mission requirements not met' });
    }
    
    // Update user with completed mission and wallet address
    await User.findByIdAndUpdate(req.userId, {
      walletAddress: walletAddress,
      $push: {
        completedMissions: {
          missionId,
          rewardAmount,
          completedAt: new Date(),
          rewardStatus: 'pending'
        }
      }
    });
    
    res.json({
      success: true,
      message: 'Mission completed successfully! Reward is pending processing.',
      missionId,
      rewardAmount,
      walletAddress
    });
    
  } catch (error) {
    console.error('Mission completion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's completed missions - Protected Route
app.get('/api/user/completed-missions', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('completedMissions');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user.completedMissions || []);
    
  } catch (error) {
    console.error('Error fetching completed missions:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// SERVER START (Immediate)
// =====================================================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf http://localhost:${PORT}`);
});

// =====================================================
// HEALTH CHECK (For App Runner)
// =====================================================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// =====================================================
// DATABASE CONNECTION (Async in Background)
// =====================================================

async function connectMongoDB() {
  const maxRetries = 5;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        // Short timeouts for App Runner
        serverSelectionTimeoutMS: 10000, // 10 seconds
        socketTimeoutMS: 20000,          // 20 seconds
        connectTimeoutMS: 10000,         // 10 seconds
        
        // Connection Pool optimized for serverless
        maxPoolSize: 5,                  // Fewer connections for serverless
        minPoolSize: 1,                  // Start with 1
        maxIdleTimeMS: 30000,           // 30s idle timeout
        
        // Retry Logic
        retryWrites: true,
        retryReads: true
      });
      
      console.log('✅ MongoDB verbunden!');
      return;
      
    } catch (error) {
      retries++;
      console.error(`❌ MongoDB Verbindungsversuch ${retries}/${maxRetries} fehlgeschlagen:`, error.message);
      
      if (retries < maxRetries) {
        console.log(`🔄 Wiederholung in 3 Sekunden...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        console.error('❌ MongoDB Verbindung nach allen Versuchen fehlgeschlagen - Server läuft trotzdem weiter');
      }
    }
  }
}

// Start MongoDB connection in background
connectMongoDB();