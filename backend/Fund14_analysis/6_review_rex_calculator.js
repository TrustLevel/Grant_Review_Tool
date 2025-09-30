// Fund14_analysis/6_review_rex_calculator.js
// Calculate REX scores for individual reviews

const mongoose = require('mongoose');
require('dotenv').config();

const Review = require('../src/models/Review');
const User = require('../src/models/User');
const Proposal = require('../src/models/Proposal');
const fs = require('fs');

class ReviewREXCalculator {
  constructor() {
    // Load unified reviewer data with reputation scores
    this.reviewerData = JSON.parse(fs.readFileSync('./Fund14_analysis/results/reviewer_data.json', 'utf8'));

    // Build quick lookup for reviewer reputation (by name since IDs missing)
    this.reviewerNameToScore = {};
    this.reviewerNameToData = {};

    Object.values(this.reviewerData.reviewers).forEach(reviewer => {
      if (reviewer.reputationScore !== undefined) {
        this.reviewerNameToScore[reviewer.name] = reviewer.reputationScore;
        this.reviewerNameToData[reviewer.name] = reviewer;
      }
    });

    console.log(`📊 Loaded reputation scores for ${Object.keys(this.reviewerNameToScore).length} reviewers`);
  }

  async calculateReviewREX() {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('🧮 Calculating REX scores per review\n');

      // Get all completed reviews with proposals
      const reviews = await Review.find({
        isDemo: { $ne: true },
        status: { $in: ['submitted', 'completed'] },
        'reviewerAssessment.selfExpertiseLevel': { $exists: true, $ne: null }
      })
      .populate('reviewerId', 'username email onboardingData')
      .populate('proposalId', 'proposalTitle metadata');

      console.log(`📝 Found ${reviews.length} reviews with expertise levels`);

      const reviewREXScores = [];

      for (const review of reviews) {
        const reviewerId = review.reviewerId._id.toString();
        const reviewerName = review.reviewerId.username || review.reviewerId.email;

        // Skip if reviewer not in reputation data
        if (!this.reviewerNameToScore[reviewerName]) {
          console.log(`⏭️  Skipping ${reviewerName} - no reputation score`);
          continue;
        }

        // Calculate expertise components
        const expertise = this.calculateExpertise(review);

        // Calculate REX score
        const rProfilePrior = this.reviewerNameToScore[reviewerName];
        const rex = Math.sqrt(rProfilePrior * expertise.total);

        // Calculate reliability (sigmoid)
        const reliability = 1 / (1 + Math.exp(-4 * (rex - 0.5)));

        // Calculate effective weight
        const effectiveWeight = 2 * reliability;

        // Calculate review quality score (y_i)
        const qualityScore = this.calculateQualityScore(review, reliability);

        const reviewREX = {
          reviewId: review._id,
          reviewerId: reviewerId,
          reviewerName: reviewerName,
          proposalTitle: review.proposalId?.proposalTitle || 'Unknown',

          // Expertise components
          expertise: {
            self: expertise.self,
            adminValidation: expertise.adminValidation,
            confidence: expertise.confidence,
            themeMatch: expertise.themeMatch,
            total: expertise.total
          },

          // REX calculation
          rProfilePrior: rProfilePrior,
          rex: Math.round(rex * 1000) / 1000,
          reliability: Math.round(reliability * 1000) / 1000,
          effectiveWeight: Math.round(effectiveWeight * 1000) / 1000,

          // Quality score
          qualityScore: qualityScore ? Math.round(qualityScore * 1000) / 1000 : null,

          // Original scores for reference
          originalScores: review.scores,
          selfExpertiseLevel: review.reviewerAssessment.selfExpertiseLevel
        };

        reviewREXScores.push(reviewREX);
      }

      // Sort by REX score (highest first)
      reviewREXScores.sort((a, b) => b.rex - a.rex);

      console.log(`\n✅ Calculated REX for ${reviewREXScores.length} reviews`);

      // Display top 10
      console.log('\n=== TOP 10 REVIEW REX SCORES ===');
      console.log('Reviewer\t\tProposal\t\tREX\tReliab\tWeight\tQuality');
      console.log('─'.repeat(90));

      reviewREXScores.slice(0, 10).forEach(item => {
        const name = item.reviewerName.substring(0, 12).padEnd(12);
        const proposal = item.proposalTitle.substring(0, 20).padEnd(20);
        const rex = item.rex.toFixed(3).padStart(5);
        const rel = item.reliability.toFixed(3).padStart(6);
        const weight = item.effectiveWeight.toFixed(1).padStart(6);
        const quality = (item.qualityScore ? item.qualityScore.toFixed(3) : 'N/A').padStart(7);

        console.log(`${name}\t${proposal}\t${rex}\t${rel}\t${weight}\t${quality}`);
      });

      // Statistics
      const avgREX = reviewREXScores.reduce((sum, r) => sum + r.rex, 0) / reviewREXScores.length;
      const avgReliability = reviewREXScores.reduce((sum, r) => sum + r.reliability, 0) / reviewREXScores.length;

      console.log(`\n📊 Statistics:`);
      console.log(`   Average REX: ${avgREX.toFixed(3)}`);
      console.log(`   Average Reliability: ${avgReliability.toFixed(3)}`);
      console.log(`   REX Range: ${Math.min(...reviewREXScores.map(r => r.rex)).toFixed(3)} - ${Math.max(...reviewREXScores.map(r => r.rex)).toFixed(3)}`);

      // Export results
      const results = {
        timestamp: new Date(),
        totalReviews: reviewREXScores.length,
        methodology: {
          expertiseWeights: { self: 0.20, adminValidation: 0.50, confidence: 0.20, themeMatch: 0.10 },
          rexFormula: 'sqrt(R_profile * E_total)',
          reliabilityFormula: '1 / (1 + exp(-4*(REX-0.5)))',
          effectiveWeight: '2 * reliability'
        },
        reviews: reviewREXScores
      };

      fs.writeFileSync('./Fund14_analysis/results/rex_scores_per_review.json', JSON.stringify(results, null, 2));

      console.log(`\n💾 Results saved to results/rex_scores_per_review.json`);

      await mongoose.disconnect();
      return reviewREXScores;

    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  }

  calculateExpertise(review) {
    const userInterests = review.reviewerId.onboardingData?.interests || [];
    const proposalTags = review.proposalId?.metadata?.tags || [];

    // S = Self Assessment from onboarding (average of technical + product expertise)
    const expertiseAreas = review.reviewerId.onboardingData?.expertise || [];
    const technicalExpertise = expertiseAreas.find(e => e.area === 'technical')?.level || 3;
    const productExpertise = expertiseAreas.find(e => e.area === 'product')?.level || 3;
    const avgOnboardingExpertise = (technicalExpertise + productExpertise) / 2;
    const self = (avgOnboardingExpertise - 1) / 4; // 1-5 → 0-1

    // V = Admin Validation (from reviewer data)
    const reviewerName = review.reviewerId.username || review.reviewerId.email;
    const reviewerData = this.reviewerNameToData[reviewerName];
    const adminValidation = reviewerData?.expertiseValidation || 0.5;

    // C = Confidence from reviewerAssessment.selfExpertiseLevel (pre-review confidence)
    const selfExpertiseLevel = review.reviewerAssessment.selfExpertiseLevel || 3;
    const confidence = (selfExpertiseLevel - 1) / 4; // 1-5 → 0-1

    // M = Theme Match (binary)
    const themeMatch = userInterests.some(interest => proposalTags.includes(interest)) ? 1.0 : 0.0;

    // E_i = 0.20*S + 0.50*V + 0.20*C + 0.10*M
    const total = 0.20 * self + 0.50 * adminValidation + 0.20 * confidence + 0.10 * themeMatch;

    return {
      self: Math.round(self * 1000) / 1000,
      adminValidation: Math.round(adminValidation * 1000) / 1000,
      confidence: Math.round(confidence * 1000) / 1000,
      themeMatch: Math.round(themeMatch * 1000) / 1000,
      total: Math.round(total * 1000) / 1000
    };
  }

  calculateQualityScore(review, reliability) {
    // Get original scores (assume 6 criteria: relevance, innovation, impact, feasibility, team, budget)
    const scores = review.scores || {};

    // Convert to 0-1 scale (assuming -3 to +3 range)
    const criteriaScores = [];
    ['relevance', 'innovation', 'impact', 'feasibility', 'team', 'budget'].forEach(criterion => {
      if (scores[criterion] !== undefined) {
        const normalized = (scores[criterion] + 3) / 6; // [-3,3] → [0,1]
        criteriaScores.push(normalized);
      }
    });

    if (criteriaScores.length === 0) return null; // No quality score if no detailed scores

    // r_i = 0.6 + 1.2 * reliability
    const exponent = 0.6 + 1.2 * reliability;

    // Equal weights for all criteria (β_j = 1/n)
    const weight = 1 / criteriaScores.length;

    // Generalized mean: (Σ β_j * t_ij^r_i)^(1/r_i)
    const sumPowered = criteriaScores.reduce((sum, score) => sum + weight * Math.pow(score, exponent), 0);
    const qualityScore = Math.pow(sumPowered, 1 / exponent);

    return qualityScore;
  }
}

if (require.main === module) {
  const calculator = new ReviewREXCalculator();
  calculator.calculateReviewREX();
}

module.exports = ReviewREXCalculator;