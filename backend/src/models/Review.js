// backend/src/models/Review.js

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // References
  proposalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal',
    required: true,
    index: true
  },
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: false
  },

  // Assignment Information
  assignment: {
    assignedAt: {
      type: Date,
      default: Date.now
    },
    dueDate: {
      type: Date,
      required: true
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Review Status
  status: {
    type: String,
    enum: ['assigned', 'in_progress', 'submitted', 'completed', 'expired'],
    default: 'assigned'
  },
  
  // CORE REVIEW DATA - Matches Frontend 6-Category Flow
  scores: {
    relevance: {
      type: Number,
      min: -3,
      max: 3,
      required: false  // Only required on submission
    },
    innovation: {
      type: Number,
      min: -3,
      max: 3,
      required: false  // Only required on submission
    },
    impact: {
      type: Number,
      min: -3,
      max: 3,
      required: false  // Only required on submission
    },
    feasibility: {
      type: Number,
      min: -3,
      max: 3,
      required: false  // Only required on submission
    },
    team: {
      type: Number,
      min: -3,
      max: 3,
      required: false  // Only required on submission
    },
    budget: {
      type: Number,
      min: -3,
      max: 3,
      required: false  // Only required on submission
    }
  },
  
  // CORE REVIEW DATA - Category-specific Comments (matches Frontend)
  categoryComments: {
    relevance: String,
    innovation: String,
    impact: String,
    feasibility: String,
    team: String,
    budget: String
  },
  
 // CORE REVIEW DATA - Review Progress & Draft State
  reviewProgress: {
    relevance: {
      completed: { type: Boolean, default: false },
      rating: Number,
      comment: String
    },
    innovation: {
      completed: { type: Boolean, default: false },
      rating: Number,
      comment: String
    },
    impact: {
      completed: { type: Boolean, default: false },
      rating: Number,
      comment: String
    },
    feasibility: {
      completed: { type: Boolean, default: false },
      rating: Number,
      comment: String
    },
    team: {
      completed: { type: Boolean, default: false },
      rating: Number,
      comment: String
    },
    budget: {
      completed: { type: Boolean, default: false },
      rating: Number,
      comment: String
    }
  },
  
  // REVIEWER ASSESSMENT - Self-assessed expertise and quality checks
  reviewerAssessment: {
    selfExpertiseLevel: {
      type: Number,
      min: 1,
      max: 5,
      required: false // Set when review starts
    },
    temperatureCheck: {
      type: String,
      enum: ['promising', 'low-quality', null],
      default: null
    },
    earlyExit: {
      type: Boolean,
      default: false // True if reviewer exits after low-quality temperature check
    },
    qualityIssues: [String], // Selected issues when temperatureCheck is 'low-quality'
    qualityComment: String   // Comment explaining quality issues
  },

  // Review completion status
  isComplete: {
    type: Boolean,
    default: false
  },

  // Submission
  submittedAt: Date,
  
  // Assigned reviews from demo proposals
  isDemo: {
    type: Boolean,
    default: false,
    index: true
  },
  demoType: {
    type: String,
    enum: ['atlas-pab-bitcoin-integration', 'sample-education-platform', 'test-proposal'],
    sparse: true // Only index non-null values
  },
  
  // Reward tracking
  reward: {
    amount: {
      type: Number,
      default: 30
    },
    currency: {
      type: String,
      default: 'REP'
    },
    paid: {
      type: Boolean,
      default: false
    },
    paidAt: Date
  }
}, {
  timestamps: true
});

// Indexes
reviewSchema.index({ proposalId: 1, reviewerId: 1 }, { unique: true });
reviewSchema.index({ status: 1, 'assignment.dueDate': 1 });

// Methods
reviewSchema.methods.submit = async function() {
  // Validate all categories are completed before submission
  const categories = ['relevance', 'innovation', 'impact', 'feasibility', 'team', 'budget'];
  for (const category of categories) {
    if (!this.reviewProgress[category] || !this.reviewProgress[category].completed) {
      throw new Error(`Category '${category}' must be completed before submission`);
    }
    if (this.reviewProgress[category].rating === undefined || this.reviewProgress[category].rating === null) {
      throw new Error(`Category '${category}' must have a rating before submission`);
    }
  }
  
  this.status = 'submitted';
  this.submittedAt = new Date();
  this.isComplete = true;
  
  // Copy progress data to final scores
  if (this.reviewProgress) {
    this.scores.relevance = this.reviewProgress.relevance.rating;
    this.scores.innovation = this.reviewProgress.innovation.rating;
    this.scores.impact = this.reviewProgress.impact.rating;
    this.scores.feasibility = this.reviewProgress.feasibility.rating;
    this.scores.team = this.reviewProgress.team.rating;
    this.scores.budget = this.reviewProgress.budget.rating;
    
    this.categoryComments.relevance = this.reviewProgress.relevance.comment;
    this.categoryComments.innovation = this.reviewProgress.innovation.comment;
    this.categoryComments.impact = this.reviewProgress.impact.comment;
    this.categoryComments.feasibility = this.reviewProgress.feasibility.comment;
    this.categoryComments.team = this.reviewProgress.team.comment;
    this.categoryComments.budget = this.reviewProgress.budget.comment;
  }
  
  
  return this.save();
};

reviewSchema.methods.isOverdue = function() {
  return this.status === 'assigned' && this.assignment.dueDate < new Date();
};

reviewSchema.methods.saveProgress = function(category, rating, comment) {
  if (!this.reviewProgress) this.reviewProgress = {};
  if (!this.reviewProgress[category]) this.reviewProgress[category] = {};
  
  this.reviewProgress[category].rating = rating;
  this.reviewProgress[category].comment = comment;
  this.reviewProgress[category].completed = true;
  
  return this.save();
};

reviewSchema.methods.saveReviewerAssessment = function(selfExpertise, temperatureCheck, qualityIssues = [], qualityComment = '') {
  if (!this.reviewerAssessment) this.reviewerAssessment = {};
  
  this.reviewerAssessment.selfExpertiseLevel = selfExpertise;
  this.reviewerAssessment.temperatureCheck = temperatureCheck;
  
  if (temperatureCheck === 'low-quality') {
    this.reviewerAssessment.qualityIssues = qualityIssues;
    this.reviewerAssessment.qualityComment = qualityComment;
    this.reviewerAssessment.earlyExit = true;
  } else {
    // Reset earlyExit flag when temperature check is not low-quality
    this.reviewerAssessment.earlyExit = false;
  }
  
  return this.save();
};

reviewSchema.methods.getCompletionPercentage = function() {
  if (!this.reviewProgress) return 0;
  
  const categories = ['relevance', 'innovation', 'impact', 'feasibility', 'team', 'budget'];
  const completed = categories.filter(cat => 
    this.reviewProgress[cat] && this.reviewProgress[cat].completed
  ).length;
  
  return Math.round((completed / categories.length) * 100);
};

// Post-save hook for automatic proposal completion check and REP payout
reviewSchema.post('save', async function() {
  // Only check when review is submitted
  if (this.status === 'submitted') {
    try {
      // Count completed reviews for this proposal
      const completedReviews = await this.constructor.countDocuments({
        proposalId: this.proposalId,
        status: 'submitted'
      });
      
      // Auto-update proposal to 'completed' if ≥3 reviews
      if (completedReviews >= 3) {
        const Proposal = require('./Proposal');
        await Proposal.findByIdAndUpdate(this.proposalId, { status: 'completed' });
        console.log(`✅ Proposal ${this.proposalId} auto-completed (${completedReviews} reviews)`);
      }

      // Auto-payout REP points to user if not already paid (atomic check) - but NOT for demo reviews
      if (this.reward && this.reward.amount > 0 && !this.isDemo) {
        // Atomisches Update - nur zahlen wenn noch nicht bezahlt
        const result = await this.constructor.findOneAndUpdate(
          { 
            _id: this._id, 
            'reward.paid': { $ne: true } // Nur wenn NICHT bereits bezahlt
          },
          { 
            'reward.paid': true,
            'reward.paidAt': new Date()
          }
        );
        
        // Nur REP geben wenn Update erfolgreich war (= war noch nicht bezahlt)
        if (result) {
          const User = require('./User');
          await User.findByIdAndUpdate(this.reviewerId, { 
            $inc: { repPoints: this.reward.amount } 
          });
          
          console.log(`💰 Paid ${this.reward.amount} REP to user ${this.reviewerId} (atomic update)`);
        } else {
          console.log(`⚠️ REP already paid for review ${this._id}, skipping duplicate payment`);
        }
      }
    } catch (error) {
      console.error('❌ Error in post-save hook:', error);
    }
  }
});

// Statics
reviewSchema.statics.findPendingByReviewer = function(reviewerId) {
  return this.find({
    reviewerId,
    status: { $in: ['assigned', 'in_progress'] }
  }).populate('proposalId');
};

module.exports = mongoose.model('Review', reviewSchema);