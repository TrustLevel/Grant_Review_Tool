// backend/src/models/ReviewFlag.js
const mongoose = require('mongoose');

const reviewFlagSchema = new mongoose.Schema({
  // References
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

  // Flag Details
  flaggedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  flagType: {
    type: String,
    enum: [
      'low-quality',           // General low quality
      'off-topic',            // Not relevant to challenge
      'incomplete',           // Missing key information
      'unrealistic',          // Unrealistic claims/timeline
      'plagiarism',           // Potential plagiarism
      'spam',                 // Spam/low effort
      'conflict-of-interest', // COI not disclosed
      'budget-issues',        // Budget problems
      'technical-flaws',      // Technical issues
      'other'                 // Custom reason
    ],
    required: true
  },

  // Flag Details
  flagReason: {
    type: String,
    required: true,
    maxlength: 2000,
    trim: true
  },
  severity: {
    type: Number,
    min: 1,
    max: 5,
    default: 3,
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    required: true,
    validate: {
      validator: Number.isFinite,
      message: 'Confidence must be a number between 0 and 1'
    }
  },

  // Flagger's expertise for this flag (calculated)
  flaggerExpertise: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },

  // Confirmations from other reviewers
  confirmations: [{
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    confirmationType: {
      type: String,
      enum: ['agree', 'disagree', 'partial'],
      required: true
    },
    confirmationStrength: {
      type: Number,
      min: 0,
      max: 1,
      required: true
    },
    confirmerExpertise: {
      type: Number,
      min: 0,
      max: 1,
      required: true
    },
    comment: {
      type: String,
      maxlength: 1000,
      trim: true
    },
    confirmedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Flag Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'disputed', 'resolved', 'dismissed'],
    default: 'pending',
    required: true,
    index: true
  },

  // Resolution
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  resolutionNotes: {
    type: String,
    maxlength: 2000,
    trim: true
  },
  finalVerdict: {
    type: String,
    enum: ['valid', 'invalid', 'partial'],
    sparse: true
  },

  // Administrative
  adminReviewed: {
    type: Boolean,
    default: false,
    index: true
  },
  adminNotes: {
    type: String,
    maxlength: 1000,
    trim: true
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for performance
reviewFlagSchema.index({ reviewId: 1, flaggedBy: 1 }, { unique: true }); // One flag per user per review
reviewFlagSchema.index({ proposalId: 1, status: 1 }); // Flags by proposal
reviewFlagSchema.index({ flaggedBy: 1, createdAt: -1 }); // User's flag history
reviewFlagSchema.index({ status: 1, adminReviewed: 1 }); // Admin queue

// Virtual: Overall confirmation score
reviewFlagSchema.virtual('confirmationScore').get(function() {
  if (this.confirmations.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  this.confirmations.forEach(conf => {
    const weight = conf.confirmerExpertise || 0.5;
    let score = 0;

    if (conf.confirmationType === 'agree') score = conf.confirmationStrength;
    else if (conf.confirmationType === 'disagree') score = -conf.confirmationStrength;
    else if (conf.confirmationType === 'partial') score = conf.confirmationStrength * 0.5;

    weightedSum += weight * score;
    totalWeight += weight;
  });

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
});

// Virtual: Flag weight for REX calculation
reviewFlagSchema.virtual('flagWeight').get(function() {
  const maxWeight = 0.6; // From REX config
  return Math.min(maxWeight, this.flaggerExpertise * this.confidence);
});

// Instance Methods
reviewFlagSchema.methods.addConfirmation = function(confirmationData) {
  // Prevent duplicate confirmations
  const existingIndex = this.confirmations.findIndex(
    conf => conf.confirmedBy.toString() === confirmationData.confirmedBy.toString()
  );

  if (existingIndex >= 0) {
    // Update existing confirmation
    this.confirmations[existingIndex] = {
      ...this.confirmations[existingIndex].toObject(),
      ...confirmationData,
      confirmedAt: new Date()
    };
  } else {
    // Add new confirmation
    this.confirmations.push({
      ...confirmationData,
      confirmedAt: new Date()
    });
  }

  // Update status based on confirmations
  this._updateStatusFromConfirmations();

  return this.save();
};

reviewFlagSchema.methods._updateStatusFromConfirmations = function() {
  const confirmationScore = this.confirmationScore;

  if (confirmationScore > 0.6) {
    this.status = 'confirmed';
  } else if (confirmationScore < -0.6) {
    this.status = 'disputed';
  } else if (this.confirmations.length >= 2) {
    this.status = 'pending'; // Keep pending until more confirmations
  }
};

reviewFlagSchema.methods.resolve = function(resolvedBy, verdict, notes) {
  this.status = 'resolved';
  this.resolvedBy = resolvedBy;
  this.resolvedAt = new Date();
  this.finalVerdict = verdict;
  if (notes) this.resolutionNotes = notes;
  this.adminReviewed = true;

  return this.save();
};

// Static Methods
reviewFlagSchema.statics.findByReview = function(reviewId) {
  return this.find({ reviewId })
    .populate('flaggedBy', 'username email')
    .populate('confirmations.confirmedBy', 'username email')
    .sort({ createdAt: -1 });
};

reviewFlagSchema.statics.findByProposal = function(proposalId, status = null) {
  const query = { proposalId };
  if (status) query.status = status;

  return this.find(query)
    .populate('reviewId', 'reviewerId scores')
    .populate('flaggedBy', 'username email')
    .sort({ createdAt: -1 });
};

reviewFlagSchema.statics.getPendingForAdmin = function() {
  return this.find({
    status: { $in: ['pending', 'confirmed', 'disputed'] },
    adminReviewed: false
  })
  .populate('reviewId', 'reviewerId proposalId')
  .populate('proposalId', 'proposalTitle')
  .populate('flaggedBy', 'username email')
  .sort({ createdAt: -1 });
};

// For REX calculations
reviewFlagSchema.statics.getForRexCalculation = function(reviewerId) {
  return this.find({
    flaggedBy: reviewerId,
    status: { $in: ['confirmed', 'disputed', 'resolved'] }
  }).select('flagType severity confidence flaggerExpertise confirmations finalVerdict createdAt');
};

// Pre-save middleware
reviewFlagSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('ReviewFlag', reviewFlagSchema);