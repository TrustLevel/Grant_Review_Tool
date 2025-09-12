// backend/src/models/Fund.js

const mongoose = require('mongoose');

const fundSchema = new mongoose.Schema({
  // Basic Information
  fundNumber: {
    type: Number,
    required: true,
  },
  
  name: {
    type: String,
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['inactive', 'test', 'review', 'completed'],
    default: 'inactive'
  },
  
  // Budget
  budget: {
    total: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'ADA'
    },
  },
  
  // Review Timeline
  timeline: {
    reviewStart: Date,
    reviewEnd: Date,
  },
  
}, {
  timestamps: true
});

// Indexes
fundSchema.index({ fundNumber: 1 });
fundSchema.index({ status: 1 });

// Virtuals
fundSchema.virtual('challenges', {
  ref: 'Challenge',
  localField: '_id',
  foreignField: 'fundId'
});

fundSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'review' && 
         this.timeline.reviewStart <= now && 
         this.timeline.reviewEnd >= now;
});

module.exports = mongoose.model('Fund', fundSchema);