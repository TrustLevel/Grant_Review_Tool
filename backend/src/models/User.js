// backend/models/User.js
const mongoose = require('mongoose');

// Interest Tags für Validierung
const INTEREST_TAGS = [
  'governance',
  'education',
  'community_outreach',
  'development_tools',
  'identity_security',
  'defi',
  'real_world_applications',
  'events_marketing',
  'interoperability',
  'sustainability',
  'smart_contracts',
  'gamefi',
  'nft'
];

const userSchema = new mongoose.Schema({
  // Auth Data
  web3authId: String,
  email: { 
    type: String, 
    required: true,   // Email ist required für Magic Link Login
    unique: true 
  },
  
  // Profile
  name: String,
  username: { 
    type: String, 
    unique: true,
    sparse: true
  },
  
  // Status
  role: { 
    type: String, 
    enum: ['reviewer', 'admin'], 
    default: 'reviewer' 
  },
  reviewerStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  // Onboarding
  onboardingCompleted: { type: Boolean, default: false },
  onboardingData: {
    expertise: [{
      area: {
        type: String,
        enum: ['technical', 'community', 'product']
      },
      level: {
        type: Number,
        min: 1,
        max: 5
      }
    }],
    
    interests: [{
      type: String,
      enum: INTEREST_TAGS
    }],
        
    
    reviewCapacity: {
        type: String,
        enum: ['max', 'medium', 'low', 'unsure']
    },
    
    affiliations: {
        hasAffiliations: Boolean,
        proposalList: String
    },
    
    previousFunds: [String], // ['Fund 13', 'Fund 12', ...]
    otherGrants: String,

    completedAt: Date
  },

  // Terms:
  acceptedGuidelines: { type: Boolean, default: false },
  acceptedGuidelinesAt: Date,
  
  // Communication:
  telegram: String,
  discord: String,

  // REP Points System
  repPoints: { type: Number, default: 0 },

  // Mission System
  walletAddress: String, // Cardano wallet for rewards
  completedMissions: [{
    missionId: String,                    // "beta-tester-champion"
    completedAt: { type: Date, default: Date.now },
    rewardAmount: String,                 // "50 ADA"
    rewardStatus: { 
      type: String, 
      enum: ['pending', 'paid'], 
      default: 'pending' 
    },
    paidAt: Date,                        // When reward was paid
    transactionHash: String,             // Cardano transaction hash
    adminNotes: String                   // Admin notes about payment
  }],

  // Admin
  approvedBy: String,
  approvedAt: Date,
  approvalNotes: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date
});

module.exports = mongoose.model('User', userSchema);