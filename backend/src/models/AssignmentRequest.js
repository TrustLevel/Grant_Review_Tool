const mongoose = require('mongoose');

const assignmentRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  requestType: {
    type: String,
    enum: ['reviews', 'peer-reviews', 'both'],
    required: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'fulfilled', 'declined'],
    default: 'pending'
  },
  currentStats: {
    completedReviews: {
      type: Number,
      default: 0
    },
    completedPeerReviews: {
      type: Number,
      default: 0
    },
    repPoints: {
      type: Number,
      default: 0
    },
    pendingReviews: {
      type: Number,
      default: 0
    },
    pendingPeerReviews: {
      type: Number,
      default: 0
    }
  },
  adminNote: String,
  fulfilledAt: Date,
  fulfilledBy: String, // admin username
  declinedReason: String
}, {
  timestamps: true
});

// Index for efficient querying
assignmentRequestSchema.index({ userId: 1, status: 1 });
assignmentRequestSchema.index({ status: 1, requestedAt: -1 });

module.exports = mongoose.model('AssignmentRequest', assignmentRequestSchema);