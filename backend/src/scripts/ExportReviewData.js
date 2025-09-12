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

// Calculate weighted score for a proposal
async function calculateWeightedScore(proposalId) {
  const reviews = await Review.find({
    proposalId: proposalId,
    status: 'submitted'
  }).populate('reviewerId', 'username');
  
  if (reviews.length === 0) {
    return {
      finalScore: null,
      reviewCount: 0,
      weightedAverage: null,
      unweightedAverage: null
    };
  }
  
  const categories = ['relevance', 'innovation', 'impact', 'feasibility', 'team', 'budget'];
  let totalWeightedScore = 0;
  let totalWeight = 0;
  let totalUnweightedScore = 0;
  
  for (const review of reviews) {
    // Get peer-reviews for this review
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
    
    // Add scores for each category
    categories.forEach(category => {
      const score = review.scores[category];
      if (typeof score === 'number') {
        totalWeightedScore += score * reviewWeight;
        totalUnweightedScore += score;
        totalWeight += reviewWeight;
      }
    });
  }
  
  const weightedAverage = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  const unweightedAverage = (reviews.length * categories.length) > 0 ? totalUnweightedScore / (reviews.length * categories.length) : 0;
  
  return {
    finalScore: Math.round(weightedAverage * 100) / 100,
    reviewCount: reviews.length,
    weightedAverage: Math.round(weightedAverage * 100) / 100,
    unweightedAverage: Math.round(unweightedAverage * 100) / 100
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
    status: 'submitted'
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