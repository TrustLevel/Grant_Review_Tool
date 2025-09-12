// backend/src/models/Proposal.js
// Matching Catalyst Explorer API

const mongoose = require('mongoose');

// Interest Tags für Validation (same as User.js for consistency)
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

// NOTE: Tag mapping logic moved to services/catalystAPI.js
// Raw Catalyst tags are mapped to INTEREST_TAGS categories during import

const proposalSchema = new mongoose.Schema({

  // Catalyst Identifiers for proposals from the Catalyst App (not Catalyst Explorer API)
  CatalystId: {
    type: String,
    required: false,
    index: true
  },

  fundId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fund',
    required: false
  },

  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: false
  },
  

  // Proposal Titel (Catalyst API: "title")
  proposalTitle: {
    type: String,
    required: true
  },
  

  // Budget Information (Catalyst API: "amount_requested")
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

  // Proposer Information (excluded from F14 MVP)
  proposer: {
    name: {
      type: String,
      required: false
    },
    entity: String,
    previousProjects: [{
      projectId: String,
      status: String
    }]
  },
  
  // Proposal Content
  content: {
    problemStatement: {
      type: String,
      required: true
    },
    solutionSummary: {
      type: String,
      required: true
    },
    solution: {
      type: String,
      required: true
    },

    // Content Categorization (excluded from F14 MVP)
    impact: String,
    feasibility: String,
    supportingDocs: [String],
    dependencies: String,
    openSource: {
      isOpen: Boolean,
      license: String
    }
  },

  // Milestones Details (excluded from F14 MVP)
  milestones: [{
    number: Number,
    title: String,
    outputs: String,
    acceptanceCriteria: String,
    evidence: String,
    deliveryMonth: Number,
    cost: Number,
    progress: {
      type: Number,
      default: 0
    }
  }],

  // Team Stats and Information (excluded from F14 MVP)
  team: [{
    name: String,
    role: String,
    bio: String,
    linkedin: String,
    github: String
  }],
  
  // Metadata
  metadata: {
    theme: String,
    subtheme: String,
    tags: [{
      type: String,
      enum: INTEREST_TAGS  // Consistent with User.js interest tags
    }],
    rawCatalystTags: [String], // Original tags from Catalyst API (for reference)
    language: String,
    translation: {
      needed: Boolean,
      originalLanguage: String
    }
  },

  // AI Generated Summary
  aiSummary: {
    type: String,
    required: false
  },
  aiSummaryGeneratedAt: {
    type: Date,
    required: false
  },

  // Status (inactive = imported but not enabled for review; active = has assignments; completed = enough reviews)
  status: {
    type: String,
    enum: ['demo', 'inactive', 'active', 'completed'],
    default: 'inactive'
  },

  // Admin control for review assignment
  reviewingEnabled: {
    type: Boolean,
    default: false,
    index: true
  },
  reviewingEnabledBy: {
    type: String,
    required: false
  },
  reviewingEnabledAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
});

// Indexes
proposalSchema.index({ fundId: 1, status: 1 });
proposalSchema.index({ 'metadata.theme': 1 });
proposalSchema.index({ 'metadata.tags': 1 });

// Virtual für Review-Count
proposalSchema.virtual('reviewCount', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'proposalId',
  count: true
});


module.exports = mongoose.model('Proposal', proposalSchema);