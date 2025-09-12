// backend/src/models/PeerReview.js
const mongoose = require('mongoose');

// Peer Review Assignment and Assessment Schema
const peerReviewSchema = new mongoose.Schema({
  // Assignment Data
  reviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review',
    required: true,
    index: true
  },
  
  proposalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal',
    required: true,
    index: true
  },
  
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending',
    required: true,
    index: true
  },
  
  dueDate: {
    type: Date,
    required: true,
    index: true
  },
  
  reward: {
    type: Number,
    default: 15, // 15 REP standard peer-review reward
    min: 0
  },
  
  // Assessment Data (filled after submission)
  assessmentType: {
    type: String,
    enum: ['normal', 'low-quality-agreement'],
    required: false // Set when assessment is submitted
  },
  
  // For normal reviews - 3 criteria scoring
  assessments: {
    specificity: {
      type: Number,
      min: -3,
      max: 3,
      validate: {
        validator: Number.isInteger,
        message: 'Specificity score must be an integer between -3 and 3'
      }
    },
    clarity: {
      type: Number,
      min: -3,
      max: 3,
      validate: {
        validator: Number.isInteger,
        message: 'Clarity score must be an integer between -3 and 3'
      }
    },
    insightful: {
      type: Number,
      min: -3,
      max: 3,
      validate: {
        validator: Number.isInteger,
        message: 'Insightful score must be an integer between -3 and 3'
      }
    }
  },
  
  // For low-quality reviews - agreement assessment
  lowQualityAgreement: {
    agree: {
      type: Boolean
    },
    comment: {
      type: String,
      maxlength: 1000,
      trim: true
    }
  },
  
  // Optional feedback for normal reviews
  feedback: {
    type: String,
    maxlength: 2000,
    trim: true
  },
  
  // Overall score (calculated from assessments)
  overallScore: {
    type: Number,
    min: -9,
    max: 9
  },
  
  submittedAt: {
    type: Date
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
peerReviewSchema.index({ assignedTo: 1, status: 1 }); // Dashboard queries
peerReviewSchema.index({ reviewId: 1 }); // Find peer-reviews for specific review
peerReviewSchema.index({ dueDate: 1, status: 1 }); // Overdue tracking
peerReviewSchema.index({ createdAt: -1 }); // Recent assignments

// Pre-save middleware
peerReviewSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate overall score for normal assessments
  if (this.assessmentType === 'normal' && 
      this.assessments &&
      typeof this.assessments.specificity === 'number' &&
      typeof this.assessments.clarity === 'number' &&
      typeof this.assessments.insightful === 'number') {
    this.overallScore = this.assessments.specificity + 
                       this.assessments.clarity + 
                       this.assessments.insightful;
  }
  
  next();
});

// Instance method to check if peer-review is overdue
peerReviewSchema.methods.isOverdue = function() {
  return this.status === 'pending' && new Date() > this.dueDate;
};

// Instance method to check if can be assessed
peerReviewSchema.methods.canBeAssessed = function() {
  return this.status === 'pending';
};

// Instance method to submit assessment
peerReviewSchema.methods.submit = async function(assessmentData) {
  const { assessmentType, assessments, lowQualityAgreement, feedback } = assessmentData;
  
  // Validate assessment type
  if (!['normal', 'low-quality-agreement'].includes(assessmentType)) {
    throw new Error('Invalid assessment type');
  }
  
  this.assessmentType = assessmentType;
  this.submittedAt = new Date();
  this.status = 'completed';
  
  if (assessmentType === 'normal') {
    // Validate normal assessments
    if (!assessments || 
        typeof assessments.specificity !== 'number' ||
        typeof assessments.clarity !== 'number' ||
        typeof assessments.insightful !== 'number') {
      throw new Error('Invalid assessment scores for normal review');
    }
    
    this.assessments = assessments;
    this.feedback = feedback || '';
  } else {
    // Validate low-quality agreement
    if (!lowQualityAgreement || typeof lowQualityAgreement.agree !== 'boolean') {
      throw new Error('Invalid low-quality agreement data');
    }
    
    this.lowQualityAgreement = lowQualityAgreement;
  }
  
  // Award REP points to reviewer
  const User = require('./User');
  await User.findByIdAndUpdate(this.assignedTo, {
    $inc: { repPoints: this.reward }
  });
  
  return this.save();
};

// Static method to find peer-reviews for a user
peerReviewSchema.statics.findByUser = function(userId, status = null) {
  const query = { assignedTo: userId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate({
      path: 'reviewId',
      select: 'proposalId reviewerId submittedAt scores categoryComments reviewerAssessment',
      populate: {
        path: 'proposalId',
        select: 'proposalTitle proposer budget metadata'
      }
    })
    .sort({ createdAt: -1 });
};

// Static method to find peer-reviews for a specific review
peerReviewSchema.statics.findByReview = function(reviewId) {
  return this.find({ reviewId })
    .populate('assignedTo', 'username email')
    .sort({ createdAt: -1 });
};

// Static method to get overdue peer-reviews
peerReviewSchema.statics.findOverdue = function() {
  return this.find({
    status: 'pending',
    dueDate: { $lt: new Date() }
  })
  .populate('assignedTo', 'username email')
  .populate('reviewId', 'proposalId');
};

// Virtual for average assessment score (normal reviews only)
peerReviewSchema.virtual('averageScore').get(function() {
  if (this.assessmentType !== 'normal' || !this.overallScore) return null;
  return (this.overallScore / 3).toFixed(2);
});

// Virtual for assessment quality level
peerReviewSchema.virtual('qualityLevel').get(function() {
  if (this.assessmentType !== 'normal' || !this.overallScore) return null;
  
  const score = this.overallScore;
  if (score >= 7) return 'excellent';
  if (score >= 4) return 'good';
  if (score >= 1) return 'acceptable';
  if (score >= -2) return 'poor';
  return 'very-poor';
});

// Post-save hook to update Review status when enough peer-reviews are completed
peerReviewSchema.post('save', async function() {
  // Only trigger when peer-review is completed
  if (this.status === 'completed') {
    try {
      // Count completed peer-reviews for this review
      const completedPeerReviews = await this.constructor.countDocuments({
        reviewId: this.reviewId,
        status: 'completed'
      });
      
      // Define minimum peer-reviews needed (can be configured)
      const MIN_PEER_REVIEWS = 2;
      
      // If enough peer-reviews completed, update Review status
      if (completedPeerReviews >= MIN_PEER_REVIEWS) {
        const Review = require('./Review');
        const updatedReview = await Review.findOneAndUpdate(
          { 
            _id: this.reviewId,
            status: 'submitted' // Only update if still in submitted state
          },
          { 
            status: 'completed'
          },
          { new: true }
        );
        
        if (updatedReview) {
          console.log(`✅ Review ${this.reviewId} marked as completed (${completedPeerReviews} peer-reviews)`);
        }
      }
    } catch (error) {
      console.error('❌ Error in PeerReview post-save hook:', error);
    }
  }
});

module.exports = mongoose.model('PeerReview', peerReviewSchema);