// backend/src/models/Challenge.js

const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  // Basic Information
  fundId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fund',
    required: true,
    index: true
  },
  
  name: {
    type: String,
    required: true
  },
  
  description: {
    type: String,
    required: true
  },
  
  // Budget
  budget: {
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'ADA'
    }
  },
  
  // Category Requirements (was angezeigt wird als bullet points)
  categoryRequirements: [String],
  
  // Overview (längerer Text)
  overview: {
    type: String,
    required: true
  },
  
  // Who should apply (längerer Text)
  whoShouldApply: String,
  
  // Areas of Interest (Liste von Punkten)
  areasOfInterest: [String],
  
  // Proposal Guidance (Liste von Punkten)
  proposalGuidance: [String],
  
  // Eligibility Criteria - was NICHT gefördert wird (Liste)
  eligibilityCriteria: [String],
  
  // Status
  status: {
    type: String,
    enum: ['test', 'active', 'closed', 'completed'],
    default: 'test'
  }
}, {
  timestamps: true
});

// Virtual for proposals
challengeSchema.virtual('proposals', {
  ref: 'Proposal',
  localField: '_id',
  foreignField: 'challengeId'
});

module.exports = mongoose.model('Challenge', challengeSchema);