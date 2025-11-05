// Export Review Data to CSV with Final Score Calculation
// Run with: node src/scripts/ExportReviewData.js

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

// Import models
const Proposal = require('../models/Proposal');
const Review = require('../models/Review');
const PeerReview = require('../models/PeerReview');
const User = require('../models/User');

// Configure MongoDB connection
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/proposal-reviewing-tool';

// CSV Helper Functions
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function arrayToCSV(data, headers) {
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => 
    headers.map(header => escapeCSV(row[header])).join(',')
  );
  return [csvHeaders, ...csvRows].join('\n');
}

// Calculate weighted score for a proposal with low-quality flag handling
async function calculateWeightedScore(proposalId) {
  const reviews = await Review.find({
    proposalId: proposalId,
    status: { $in: ['submitted', 'completed'] },
    isDemo: { $ne: true } // Exclude demo reviews from scoring
  }).populate('reviewerId', 'username');

  if (reviews.length === 0) {
    return {
      finalScore: null,
      reviewCount: 0,
      weightedAverage: null,
      unweightedAverage: null,
      lowQualityFlags: 0,
      confirmedFlags: 0,
      flaggedReviews: [],
      disqualified: false,
      disqualificationReason: null
    };
  }

  const categories = ['relevance', 'innovation', 'impact', 'feasibility', 'team', 'budget'];
  let totalWeightedScore = 0;
  let totalWeight = 0;
  let totalUnweightedScore = 0;
  let lowQualityFlags = 0;
  let confirmedFlags = 0;
  let flaggedReviews = [];

  for (const review of reviews) {
    // Check if this is an early-exit review (flagged as low-quality)
    const isEarlyExit = review.reviewerAssessment?.earlyExit || false;
    const isLowQuality = review.reviewerAssessment?.temperatureCheck === 'low-quality';

    if (isEarlyExit || isLowQuality) {
      lowQualityFlags++;

      // Check if this flag is confirmed by peer-reviews
      const peerReviewConfirmations = await PeerReview.find({
        reviewId: review._id,
        status: 'completed',
        assessmentType: 'low-quality-agreement',
        'lowQualityAgreement.agree': true
      });

      if (peerReviewConfirmations.length > 0) {
        confirmedFlags++;
        flaggedReviews.push({
          reviewId: review._id.toString(),
          reviewer: review.reviewerId?.username || 'Unknown',
          flagReason: review.reviewerAssessment?.qualityIssues?.join(', ') || 'Low quality',
          confirmations: peerReviewConfirmations.length
        });

        // Apply score reduction for confirmed low-quality flag
        // Each confirmed flag reduces the effective score by applying a penalty
        continue; // Skip this review from normal score calculation
      }
    }

    // Get peer-reviews for normal scoring (only for non-flagged reviews)
    const peerReviews = await PeerReview.find({
      reviewId: review._id,
      status: 'completed',
      assessmentType: 'normal'
    });

    // Calculate review weight based on peer-review quality
    let reviewWeight = 1.0; // Default weight if no peer-reviews

    if (peerReviews.length > 0) {
      const avgPeerScore = peerReviews.reduce((sum, pr) => sum + (pr.overallScore || 0), 0) / peerReviews.length;
      reviewWeight = Math.max(0.1, (avgPeerScore + 9) / 18); // Normalize to 0.1-1.0
    }

    // Add scores for each category (only for non-flagged reviews)
    categories.forEach(category => {
      const score = review.scores[category];
      if (typeof score === 'number') {
        totalWeightedScore += score * reviewWeight;
        totalUnweightedScore += score;
        totalWeight += reviewWeight;
      }
    });
  }

  // Check disqualification rule: >50% confirmed flags
  const flagRate = reviews.length > 0 ? confirmedFlags / reviews.length : 0;
  const disqualified = flagRate > 0.5;

  let finalScore = null;
  let weightedAverage = null;
  let unweightedAverage = null;

  if (disqualified) {
    // Proposal is disqualified due to too many confirmed low-quality flags
    return {
      finalScore: null,
      reviewCount: reviews.length,
      weightedAverage: null,
      unweightedAverage: null,
      lowQualityFlags,
      confirmedFlags,
      flaggedReviews,
      disqualified: true,
      disqualificationReason: `>50% of reviews flagged as low-quality (${confirmedFlags}/${reviews.length})`
    };
  }

  // Calculate scores for non-disqualified proposals
  if (totalWeight > 0) {
    weightedAverage = totalWeightedScore / totalWeight;

    // Apply score reduction for each confirmed flag
    const flagPenalty = confirmedFlags * 0.5; // Each confirmed flag reduces score by 0.5
    weightedAverage = Math.max(0, weightedAverage - flagPenalty);

    finalScore = Math.round(weightedAverage * 100) / 100;
    weightedAverage = Math.round(weightedAverage * 100) / 100;
  }

  if (reviews.length * categories.length > 0) {
    unweightedAverage = totalUnweightedScore / (reviews.length * categories.length);
    unweightedAverage = Math.round(unweightedAverage * 100) / 100;
  }

  return {
    finalScore,
    reviewCount: reviews.length,
    weightedAverage,
    unweightedAverage,
    lowQualityFlags,
    confirmedFlags,
    flaggedReviews,
    disqualified: false,
    disqualificationReason: null
  };
}

async function exportProposalsWithScores() {
  console.log('🔍 Fetching proposals with completed reviews...');
  
  const proposals = await Proposal.find({
    status: 'completed'
  }).sort({ proposalTitle: 1 });
  
  console.log(`📊 Found ${proposals.length} completed proposals`);
  
  const proposalData = [];
  
  for (let i = 0; i < proposals.length; i++) {
    const proposal = proposals[i];
    console.log(`Processing ${i + 1}/${proposals.length}: ${proposal.proposalTitle}`);
    
    const scoreData = await calculateWeightedScore(proposal._id);
    
    proposalData.push({
      proposalId: proposal._id.toString(),
      proposalTitle: proposal.proposalTitle,
      budget: proposal.budget.total,
      currency: proposal.budget.currency,
      status: proposal.status,
      finalScore: scoreData.finalScore,
      weightedAverage: scoreData.weightedAverage,
      unweightedAverage: scoreData.unweightedAverage,
      reviewCount: scoreData.reviewCount,
      lowQualityFlags: scoreData.lowQualityFlags,
      confirmedFlags: scoreData.confirmedFlags,
      disqualified: scoreData.disqualified,
      disqualificationReason: scoreData.disqualificationReason || '',
      flaggedReviews: scoreData.flaggedReviews?.map(fr => `${fr.reviewer}(${fr.confirmations})`).join(';') || '',
      tags: proposal.metadata?.tags?.join(';') || '',
      problemStatement: proposal.content?.problemStatement || '',
      solutionSummary: proposal.content?.solutionSummary || ''
    });
  }
  
  return proposalData;
}

async function exportDetailedReviews() {
  console.log('🔍 Fetching detailed review data...');
  
  const reviews = await Review.find({
    status: { $in: ['submitted', 'completed'] },
    isDemo: { $ne: true } // Exclude demo reviews from detailed export
  })
  .populate('proposalId', 'proposalTitle budget')
  .populate('reviewerId', 'username')
  .sort({ submittedAt: -1 });
  
  console.log(`📋 Found ${reviews.length} submitted reviews`);
  
  const reviewData = [];
  
  for (const review of reviews) {
    // Get peer-reviews for this review
    const peerReviews = await PeerReview.find({
      reviewId: review._id,
      status: 'completed'
    }).populate('assignedTo', 'username');
    
    // Calculate peer-review metrics
    const normalPeerReviews = peerReviews.filter(pr => pr.assessmentType === 'normal');
    let avgPeerScore = null;
    let peerReviewWeight = 1.0;
    
    if (normalPeerReviews.length > 0) {
      avgPeerScore = normalPeerReviews.reduce((sum, pr) => sum + (pr.overallScore || 0), 0) / normalPeerReviews.length;
      peerReviewWeight = Math.max(0.1, (avgPeerScore + 9) / 18);
    }
    
    reviewData.push({
      reviewId: review._id.toString(),
      proposalId: review.proposalId._id.toString(),
      proposalTitle: review.proposalId.proposalTitle,
      reviewerUsername: review.reviewerId.username,
      submittedAt: review.submittedAt?.toISOString() || '',
      
      // Category Scores
      relevanceScore: review.scores.relevance,
      innovationScore: review.scores.innovation,
      impactScore: review.scores.impact,
      feasibilityScore: review.scores.feasibility,
      teamScore: review.scores.team,
      budgetScore: review.scores.budget,
      
      // Category Comments
      relevanceComment: review.categoryComments?.relevance || '',
      innovationComment: review.categoryComments?.innovation || '',
      impactComment: review.categoryComments?.impact || '',
      feasibilityComment: review.categoryComments?.feasibility || '',
      teamComment: review.categoryComments?.team || '',
      budgetComment: review.categoryComments?.budget || '',
      
      // Peer Review Data
      peerReviewCount: peerReviews.length,
      avgPeerReviewScore: avgPeerScore ? Math.round(avgPeerScore * 100) / 100 : null,
      reviewWeight: Math.round(peerReviewWeight * 100) / 100,
      
      // Temperature Check
      temperatureCheck: review.reviewerAssessment?.temperatureCheck || '',
      qualityIssues: review.reviewerAssessment?.qualityIssues?.join(';') || '',
      expertiseLevel: review.reviewerAssessment?.selfExpertiseLevel || ''
    });
  }
  
  return reviewData;
}

async function exportPeerReviews() {
  console.log('🔍 Fetching peer-review data...');
  
  const peerReviews = await PeerReview.find({
    status: 'completed'
  })
  .populate('assignedTo', 'username')
  .populate({
    path: 'reviewId',
    select: 'proposalId reviewerId',
    populate: [
      { path: 'proposalId', select: 'proposalTitle' },
      { path: 'reviewerId', select: 'username' }
    ]
  })
  .sort({ submittedAt: -1 });
  
  console.log(`👥 Found ${peerReviews.length} completed peer-reviews`);
  
  const peerReviewData = peerReviews.map(pr => ({
    peerReviewId: pr._id.toString(),
    reviewId: pr.reviewId._id.toString(),
    proposalId: pr.reviewId.proposalId._id.toString(),
    proposalTitle: pr.reviewId.proposalId.proposalTitle,
    reviewerUsername: pr.reviewId.reviewerId.username,
    peerReviewerUsername: pr.assignedTo.username,
    submittedAt: pr.submittedAt?.toISOString() || '',
    
    assessmentType: pr.assessmentType,
    
    // Normal Assessment Scores
    specificityScore: pr.assessments?.specificity || null,
    clarityScore: pr.assessments?.clarity || null,
    insightfulScore: pr.assessments?.insightful || null,
    overallScore: pr.overallScore || null,
    
    // Low-Quality Assessment
    lowQualityAgree: pr.lowQualityAgreement?.agree || null,
    lowQualityComment: pr.lowQualityAgreement?.comment || '',
    
    feedback: pr.feedback || '',
    reward: pr.reward
  }));
  
  return peerReviewData;
}

async function main() {
  try {
    console.log('🚀 Starting Review Data Export...');
    console.log(`📡 Connecting to MongoDB: ${MONGODB_URI}`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Create exports directory
    const exportsDir = path.join(__dirname, '../exports');
    try {
      await fs.mkdir(exportsDir, { recursive: true });
    } catch (err) {
      // Directory already exists
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Export 1: Proposals with Final Scores
    console.log('\n📊 Exporting proposals with calculated final scores...');
    const proposalData = await exportProposalsWithScores();
    const proposalCSV = arrayToCSV(proposalData, [
      'proposalId', 'proposalTitle', 'budget', 'currency', 'status',
      'finalScore', 'weightedAverage', 'unweightedAverage', 'reviewCount',
      'lowQualityFlags', 'confirmedFlags', 'disqualified', 'disqualificationReason', 'flaggedReviews',
      'tags', 'problemStatement', 'solutionSummary'
    ]);
    
    const proposalFile = path.join(exportsDir, `proposals_with_scores_${timestamp}.csv`);
    await fs.writeFile(proposalFile, proposalCSV);
    console.log(`✅ Exported ${proposalData.length} proposals to: ${proposalFile}`);
    
    // Export 2: Detailed Reviews
    console.log('\n📋 Exporting detailed review data...');
    const reviewData = await exportDetailedReviews();
    const reviewCSV = arrayToCSV(reviewData, [
      'reviewId', 'proposalId', 'proposalTitle', 'reviewerUsername', 'submittedAt',
      'relevanceScore', 'innovationScore', 'impactScore', 'feasibilityScore', 'teamScore', 'budgetScore',
      'relevanceComment', 'innovationComment', 'impactComment', 'feasibilityComment', 'teamComment', 'budgetComment',
      'peerReviewCount', 'avgPeerReviewScore', 'reviewWeight',
      'temperatureCheck', 'qualityIssues', 'expertiseLevel'
    ]);
    
    const reviewFile = path.join(exportsDir, `reviews_detailed_${timestamp}.csv`);
    await fs.writeFile(reviewFile, reviewCSV);
    console.log(`✅ Exported ${reviewData.length} reviews to: ${reviewFile}`);
    
    // Export 3: Peer-Reviews
    console.log('\n👥 Exporting peer-review data...');
    const peerReviewData = await exportPeerReviews();
    const peerReviewCSV = arrayToCSV(peerReviewData, [
      'peerReviewId', 'reviewId', 'proposalId', 'proposalTitle', 'reviewerUsername', 'peerReviewerUsername',
      'submittedAt', 'assessmentType', 'specificityScore', 'clarityScore', 'insightfulScore', 'overallScore',
      'lowQualityAgree', 'lowQualityComment', 'feedback', 'reward'
    ]);
    
    const peerReviewFile = path.join(exportsDir, `peer_reviews_${timestamp}.csv`);
    await fs.writeFile(peerReviewFile, peerReviewCSV);
    console.log(`✅ Exported ${peerReviewData.length} peer-reviews to: ${peerReviewFile}`);
    
    console.log('\n🎉 Export completed successfully!');
    console.log(`📁 Files saved in: ${exportsDir}`);
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the export
if (require.main === module) {
  main();
}

module.exports = { exportProposalsWithScores, exportDetailedReviews, exportPeerReviews };