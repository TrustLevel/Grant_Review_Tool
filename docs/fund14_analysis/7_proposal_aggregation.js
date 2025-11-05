// Fund14_analysis/7_proposal_aggregation.js
// Aggregate review REX scores into final proposal scores

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');
const Review = require('../src/models/Review');
const Proposal = require('../src/models/Proposal');
const fs = require('fs');

// Simple Beta CDF approximation using normal approximation for large alpha+beta
function betaCDF(x, alpha, beta) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // For our use case with reasonable alpha, beta values, use normal approximation
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  const std = Math.sqrt(variance);

  if (std < 0.01) {
    // Very low variance, use step function
    return x >= mean ? 1 : 0;
  }

  // Normal approximation with continuity correction
  const z = (x - mean + 0.5 / (alpha + beta)) / std;
  return normalCDF(z);
}

// Standard normal CDF approximation
function normalCDF(z) {
  return 0.5 * (1 + erf(z / Math.sqrt(2)));
}

// Error function approximation
function erf(x) {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}


class ProposalAggregator {
  constructor() {
    // Load review REX scores
    const reviewData = JSON.parse(fs.readFileSync('./Fund14_analysis/results/rex_scores_per_review.json', 'utf8'));
    this.reviewScores = reviewData.reviews;
    console.log(`📊 Loaded ${this.reviewScores.length} review REX scores`);

    // Beta priors (minimal shrinkage)
    this.QUALITY_PRIOR = { alpha: 0.1, beta: 0.1 }; // Minimal shrinkage - data dominates
    this.RISK_PRIOR = { a: 1, b: 4 }; // Conservative (expect low risk)

    // Thresholds (adjusted for Fund14 data)
    this.HIGH_THRESHOLD = 0.60; // Lowered from 0.70 for Fund14
    this.LOW_THRESHOLD = 0.40;
    this.RISK_HIGH_THRESHOLD = 0.50;
    this.RISK_LOW_THRESHOLD = 0.25;
    this.TAU = 0.65; // For p_high calculation

    // Risk adjustment
    this.LAMBDA = 1.0; // Risk aversion for ranking score
  }

  async aggregateProposals() {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('🔄 Aggregating reviews into proposal scores\n');

      // Load actual Review documents for flag data
      const allReviews = await Review.find({
        isDemo: { $ne: true },
        status: { $in: ['submitted', 'completed'] }
      });

      // Build lookup for flag data
      this.reviewFlags = {};
      let flaggedCount = 0;
      allReviews.forEach(review => {
        const reviewId = review._id.toString();
        const isFlagged = review.reviewerAssessment?.temperatureCheck === 'low-quality';
        if (isFlagged) flaggedCount++;

        this.reviewFlags[reviewId] = {
          isFlagged: isFlagged,
          temperatureCheck: review.reviewerAssessment?.temperatureCheck || null,
          selfFlagged: isFlagged
        };
      });

      console.log(`🚩 Flag Debug: ${flaggedCount} flagged reviews out of ${allReviews.length} total`);

      // Debug: Check what fields reviews actually have
      if (allReviews.length > 0) {
        const sampleReview = allReviews[0];
        console.log(`🔍 Sample Review fields:`, Object.keys(sampleReview.toObject()));
        console.log(`🔍 Sample flagged:`, sampleReview.flagged);
        console.log(`🔍 Sample flaggedBy:`, sampleReview.flaggedBy);
      }

      // Group reviews by proposal
      const reviewsByProposal = {};
      this.reviewScores.forEach(review => {
        const proposalTitle = review.proposalTitle;
        if (!reviewsByProposal[proposalTitle]) {
          reviewsByProposal[proposalTitle] = [];
        }
        reviewsByProposal[proposalTitle].push(review);
      });

      console.log(`📋 Found ${Object.keys(reviewsByProposal).length} proposals with reviews`);

      const proposalScores = [];

      for (const [proposalTitle, reviews] of Object.entries(reviewsByProposal)) {
        const score = this.calculateProposalScore(proposalTitle, reviews);
        proposalScores.push(score);
      }

      // Sort by ranking score
      proposalScores.sort((a, b) => b.rankingScore - a.rankingScore);

      // Display results
      console.log('\n=== TOP 10 PROPOSAL SCORES ===');
      console.log('Proposal\t\t\tReviews\tQ-Score\tp_high\tp_low\tStatus\tRanking');
      console.log('─'.repeat(100));

      proposalScores.slice(0, 10).forEach(prop => {
        const title = prop.proposalTitle.substring(0, 25).padEnd(25);
        const reviews = prop.reviewCount.toString().padStart(7);
        const qScore = (prop.qualityScore * 10).toFixed(1).padStart(7);
        const pHigh = prop.pHigh.toFixed(3).padStart(6);
        const pLow = prop.pLow.toFixed(3).padStart(5);
        const status = prop.status.padStart(6);
        const ranking = prop.rankingScore.toFixed(1).padStart(7);

        console.log(`${title}\t${reviews}\t${qScore}\t${pHigh}\t${pLow}\t${status}\t${ranking}`);
      });

      // Statistics
      const avgQuality = proposalScores.reduce((sum, p) => sum + p.qualityScore, 0) / proposalScores.length;
      const statusCounts = proposalScores.reduce((counts, p) => {
        counts[p.status] = (counts[p.status] || 0) + 1;
        return counts;
      }, {});

      console.log(`\n📊 Statistics:`);
      console.log(`   Total proposals: ${proposalScores.length}`);
      console.log(`   Average quality: ${avgQuality.toFixed(3)}`);
      console.log(`   Status distribution: ${JSON.stringify(statusCounts)}`);

      // Export results
      const results = {
        timestamp: new Date(),
        totalProposals: proposalScores.length,
        methodology: {
          qualityPrior: this.QUALITY_PRIOR,
          riskPrior: this.RISK_PRIOR,
          thresholds: {
            high: this.HIGH_THRESHOLD,
            low: this.LOW_THRESHOLD,
            riskHigh: this.RISK_HIGH_THRESHOLD,
            riskLow: this.RISK_LOW_THRESHOLD,
            tau: this.TAU
          },
          lambda: this.LAMBDA
        },
        proposals: proposalScores
      };

      fs.writeFileSync('./Fund14_analysis/results/final_proposal_scores.json', JSON.stringify(results, null, 2));

      console.log(`\n💾 Results saved to results/final_proposal_scores.json`);

      await mongoose.disconnect();
      return proposalScores;

    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  }

  calculateProposalScore(proposalTitle, reviews) {
    console.log(`\n📊 Processing: ${proposalTitle} (${reviews.length} reviews)`);

    // Quality Channel: Aggregate y_i and k_i
    let totalWeightedQuality = 0;
    let totalWeight = 0;
    let flagMass = 0;
    let counterMass = 0;
    let flaggedReviewCount = 0;

    // Separate Quality and Risk Channels
    reviews.forEach(review => {
      const yi = review.qualityScore;
      const ki = review.effectiveWeight;

      console.log(`   🔍 Review: yi=${yi}, ki=${ki}, hasScore=${yi !== null && yi !== undefined}`);

      // Quality Channel: Only reviews with actual quality scores
      if (yi !== null && yi !== undefined) {
        totalWeightedQuality += ki * yi;
        totalWeight += ki;
        console.log(`   ✅ Added to quality: totalWeight now ${totalWeight.toFixed(3)}`);
      }
    });

    // Risk Channel: All reviews (separate from quality)
    reviews.forEach(review => {
      const reviewId = review.reviewId;
      const flagData = this.reviewFlags[reviewId];

      // Flag mass: reviews flagged as low-quality
      if (flagData && flagData.isFlagged) {
        flagMass += review.effectiveWeight; // f_i = flagged review weight
        flaggedReviewCount++;
        console.log(`   🚩 FLAGGED: Review ${reviewId.substring(0,8)} (weight: ${review.effectiveWeight.toFixed(2)})`);
      }

      // Counter mass: all review expertise (g_i) - already includes confidence in total
      counterMass += review.expertise.total;
    });

    console.log(`   📊 Flags: ${flaggedReviewCount}/${reviews.length}, flagMass: ${flagMass.toFixed(3)}, counterMass: ${counterMass.toFixed(3)}`);
    console.log(`   📊 Quality: totalWeightedQuality=${totalWeightedQuality.toFixed(3)}, totalWeight=${totalWeight.toFixed(3)}`);

    // Beta posterior for quality - adaptive prior based on data availability
    let priorAlpha = this.QUALITY_PRIOR.alpha;
    let priorBeta = this.QUALITY_PRIOR.beta;

    // Strengthen prior when we have few reviews with actual scores
    const reviewsWithScores = reviews.filter(r => r.qualityScore !== null && r.qualityScore !== undefined).length;
    if (reviewsWithScores < 3) {
      // Weaker prior when little data - let actual reviews have more influence
      priorAlpha = 0.5;  // Less conservative to avoid p_high ≈ 0
      priorBeta = 0.5;
    }

    const alpha = priorAlpha + totalWeightedQuality;
    const beta = priorBeta + totalWeight - totalWeightedQuality;

    const qualityScore = alpha / (alpha + beta); // Q
    const pHigh = 1 - betaCDF(this.TAU, alpha, beta); // p_high

    // Debug Beta CDF calculation
    console.log(`   🔍 Debug: alpha=${alpha.toFixed(3)}, beta=${beta.toFixed(3)}, qualityScore=${qualityScore.toFixed(3)}`);
    console.log(`   🔍 Beta CDF(${this.TAU})=${betaCDF(this.TAU, alpha, beta).toFixed(6)}, p_high=${pHigh.toFixed(6)}`);

    // Calculate disagreement (polarization) - weighted variance
    const meanQuality = totalWeightedQuality / totalWeight;
    let disagreement = 0;
    if (totalWeight > 0) {
      reviews.forEach(review => {
        const wi = review.effectiveWeight / totalWeight;
        disagreement += wi * Math.pow(review.qualityScore - meanQuality, 2);
      });
      // disagreement is now weighted variance in [0, max_var]
      // Max variance occurs when all reviews are at extremes (0 and 1)
      // Keep as variance - no artificial normalization
    }

    // Beta posterior for risk
    const riskA = this.RISK_PRIOR.a + flagMass;
    const riskB = this.RISK_PRIOR.b + counterMass;
    const pLow = riskA / (riskA + riskB);

    // Status determination
    let status = 'GREY';
    const hasQuorum = reviews.length >= 3 || totalWeight >= 2.0;

    if (hasQuorum && pHigh >= this.HIGH_THRESHOLD && pLow < this.RISK_LOW_THRESHOLD) {
      status = 'HIGH';
    } else if (pHigh < this.LOW_THRESHOLD || pLow >= this.RISK_HIGH_THRESHOLD) {
      status = 'LOW';
    }

    // Ranking score (risk-adjusted)
    const rankingScore = 10 * qualityScore * (1 - this.LAMBDA * pLow);

    console.log(`   Quality: ${qualityScore.toFixed(3)}, p_high: ${pHigh.toFixed(3)}, p_low: ${pLow.toFixed(3)}, Status: ${status}`);

    return {
      proposalTitle,
      reviewCount: reviews.length,
      totalWeight,
      qualityScore: Math.round(qualityScore * 1000) / 1000,
      pHigh: Math.round(pHigh * 1000) / 1000,
      pLow: Math.round(pLow * 1000) / 1000,
      disagreement: Math.round(disagreement * 1000) / 1000,
      status,
      rankingScore: Math.round(rankingScore * 10) / 10,
      betaPosterior: { alpha, beta },
      riskPosterior: { a: riskA, b: riskB },
      reviews: reviews.map(r => ({
        reviewerId: r.reviewerId,
        rex: r.rex,
        reliability: r.reliability,
        qualityScore: r.qualityScore,
        effectiveWeight: r.effectiveWeight
      }))
    };
  }
}

if (require.main === module) {
  const aggregator = new ProposalAggregator();
  aggregator.aggregateProposals();
}

module.exports = ProposalAggregator;