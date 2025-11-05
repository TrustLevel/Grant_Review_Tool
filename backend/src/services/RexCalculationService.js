// backend/src/services/RexCalculationService.js
// REX System Implementation Service

const rexFormulas = require('../configs/rex-formulas');

class RexCalculationService {
  constructor(customConfig = null) {
    this.config = customConfig || rexFormulas;
  }

  // =====================================================
  // REPUTATION CALCULATIONS
  // =====================================================

  /**
   * Calculate peer-based reputation for a reviewer
   * @param {Array} peerAssessments - Array of peer assessment objects
   * @returns {number} Peer reputation score [0,1]
   */
  calculatePeerReputation(peerAssessments) {
    if (!peerAssessments || peerAssessments.length === 0) {
      return this.config.reputation.peerRating.shrinkage.prior;
    }

    const reviewQualities = [];

    // Process each review that was peer-assessed
    for (const assessment of peerAssessments) {
      const { peerRatings } = assessment;

      if (!peerRatings || peerRatings.length === 0) continue;

      // Step 1: Normalize peer ratings [-3,3] → [0,1]
      const normalizedRatings = peerRatings.map(rating => ({
        ...rating,
        specificity: this.config.reputation.peerRating.scoreNormalization(rating.specificity),
        domain: this.config.reputation.peerRating.scoreNormalization(rating.domain || rating.clarity),
        critical: this.config.reputation.peerRating.scoreNormalization(rating.critical || rating.insightful)
      }));

      // Step 2: Z-score debias per rater (if multiple raters)
      const debiasedRatings = this._debiasRatings(normalizedRatings);

      // Step 3: Calculate weighted peer scores
      const peerScores = debiasedRatings.map(rating => {
        const weights = this.config.reputation.peerRating.criteriaWeights;
        const peerScore =
          weights.specificity * rating.specificity +
          weights.domain * rating.domain +
          weights.critical * rating.critical;

        // Step 4: Apply rater weight based on peer expertise
        const raterWeight = this._calculatePeerRaterWeight(rating.raterExpertise || 0.5);

        return {
          score: peerScore,
          weight: raterWeight
        };
      });

      // Step 5: Bayesian shrinkage for this review
      const weightedSum = peerScores.reduce((sum, ps) => sum + ps.weight * ps.score, 0);
      const totalWeight = peerScores.reduce((sum, ps) => sum + ps.weight, 0);

      const { prior, priorWeight } = this.config.reputation.peerRating.shrinkage;
      const reviewQuality = (prior * priorWeight + weightedSum) / (priorWeight + totalWeight);

      reviewQualities.push(reviewQuality);
    }

    // Step 6: Overall peer reputation (simple average for MVP)
    const { prior: priorR, priorWeight: priorWeightR } = this.config.reputation.peerRating.shrinkage;
    return this.config.utils.bayesianShrinkage(reviewQualities, priorR, priorWeightR);
  }

  /**
   * Calculate flag-based reputation
   * @param {Array} flags - Array of flag objects with confirmations
   * @param {Array} missedOpportunities - Array of missed flag opportunities
   * @returns {number} Flag reputation score [0,1]
   */
  calculateFlagReputation(flags, missedOpportunities = []) {
    const flagConfig = this.config.reputation.flagReputation;

    // Calculate flag precision
    let confirmedWeight = 0;
    let totalFlagWeight = 0;

    flags.forEach(flag => {
      const weight = Math.min(flagConfig.weightCap, flag.expertise * flag.confidence);
      totalFlagWeight += weight;
      if (flag.confirmed) {
        confirmedWeight += weight * flag.confirmationStrength;
      }
    });

    // Bayesian flag precision
    const { alpha, beta } = flagConfig.flagPrecision;
    const flagPrecision = (alpha + confirmedWeight) / (alpha + beta + totalFlagWeight);

    // Ramp-up factor
    const rampUp = flagConfig.rampUp.formula(totalFlagWeight, flagConfig.rampUp.threshold);

    // Miss penalty
    let missWeight = 0;
    let totalMissWeight = 0;

    missedOpportunities.forEach(miss => {
      const weight = miss.expertise * miss.confidence * (miss.severity || 1);
      totalMissWeight += weight;
      if (miss.wasMissed) {
        missWeight += weight;
      }
    });

    const { alpha: alphaM, beta: betaM, gamma } = flagConfig.missRates;
    const missRate = (alphaM + missWeight) / (alphaM + betaM + totalMissWeight);
    const missPenalty = Math.pow(1 - missRate, gamma);

    return flagPrecision * rampUp * missPenalty;
  }

  /**
   * Calculate final reputation combining peer and flag scores
   * @param {number} peerReputation - Peer-based reputation [0,1]
   * @param {number} flagReputation - Flag-based reputation [0,1]
   * @returns {number} Final reputation [0,1]
   */
  calculateFinalReputation(peerReputation, flagReputation) {
    const weights = this.config.reputation.finalWeights;
    return weights.peer * peerReputation + weights.flag * flagReputation;
  }

  // =====================================================
  // EXPERTISE CALCULATIONS
  // =====================================================

  /**
   * Calculate per-review expertise
   * @param {Object} expertiseData - Contains selfAssessment, adminValidation, confidence, proposalTags, userInterests
   * @returns {number} Expertise score [0,1]
   */
  calculateReviewExpertise(expertiseData) {
    const { selfAssessment, adminValidation, confidence, proposalTags, userInterests } = expertiseData;

    // Calculate thematic match
    let thematicMatch = null;
    if (proposalTags && userInterests) {
      thematicMatch = this.config.expertise.perReview.thematicMatch.jaccard(
        userInterests,
        proposalTags
      );
    }

    return this.config.calculations.calculateReviewExpertise(
      selfAssessment,
      adminValidation,
      confidence,
      thematicMatch,
      this.config
    );
  }

  /**
   * Calculate profile expertise for a reviewer in a domain
   * @param {Array} reviewExpertiseScores - Historical per-review expertise scores
   * @returns {number} Profile expertise [0,1]
   */
  calculateProfileExpertise(reviewExpertiseScores) {
    const { prior, priorWeight } = this.config.expertise.profile.shrinkage;
    return this.config.utils.bayesianShrinkage(reviewExpertiseScores, prior, priorWeight);
  }

  // =====================================================
  // REX CALCULATIONS
  // =====================================================

  /**
   * Calculate per-review REX score
   * @param {number} reputation - Reviewer reputation [0,1]
   * @param {number} expertise - Per-review expertise [0,1]
   * @param {number} alpha - Reputation weight (default: 1)
   * @param {number} beta - Expertise weight (default: 1)
   * @returns {Object} { rexScore, reliability, gmExponent, effectiveWeight }
   */
  calculatePerReviewRex(reputation, expertise, alpha = 1, beta = 1) {
    const rexScore = this.config.calculations.calculateRex(reputation, expertise, alpha, beta, this.config);
    const reliability = this.config.calculations.calculateReliability(rexScore, this.config);

    const gmExponent = this.config.rex.bayesianScoring.gmExponent.formula(reliability);
    const effectiveWeight = this.config.rex.bayesianScoring.effectiveWeight.formula(reliability);

    return {
      rexScore: this.config.utils.clamp(rexScore, 0, 1),
      reliability,
      gmExponent,
      effectiveWeight
    };
  }

  /**
   * Calculate profile REX score for display/matching
   * @param {number} reputation - Reviewer reputation [0,1]
   * @param {number} profileExpertise - Profile expertise [0,1]
   * @param {number} alpha - Reputation weight (default: 1)
   * @param {number} beta - Expertise weight (default: 1)
   * @returns {number} Profile REX score [0,1]
   */
  calculateProfileRex(reputation, profileExpertise, alpha = 1, beta = 1) {
    return this.config.utils.clamp(
      this.config.utils.geometricMean(reputation, profileExpertise, alpha, beta),
      0, 1
    );
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Debias peer ratings using z-score normalization
   * @param {Array} ratings - Normalized ratings from peers
   * @returns {Array} Debiased ratings
   * @private
   */
  _debiasRatings(ratings) {
    if (ratings.length <= 1) return ratings;

    // Group by rater if available, otherwise treat as single group
    const raterGroups = {};
    ratings.forEach(rating => {
      const raterId = rating.raterId || 'anonymous';
      if (!raterGroups[raterId]) raterGroups[raterId] = [];
      raterGroups[raterId].push(rating);
    });

    const debiasedRatings = [];

    Object.values(raterGroups).forEach(raterRatings => {
      const criteria = ['specificity', 'domain', 'critical'];

      criteria.forEach(criterion => {
        const values = raterRatings.map(r => r[criterion]);
        const debiased = this.config.utils.zScoreNormalize(values);

        raterRatings.forEach((rating, index) => {
          rating[criterion] = debiased[index];
        });
      });

      debiasedRatings.push(...raterRatings);
    });

    return debiasedRatings;
  }

  /**
   * Calculate peer rater weight based on their expertise
   * @param {number} peerExpertise - Peer's expertise in domain [0,1]
   * @returns {number} Rater weight
   * @private
   */
  _calculatePeerRaterWeight(peerExpertise) {
    const config = this.config.reputation.peerRating.peerRaterWeight;
    const weight = config.base + config.expertiseMultiplier * peerExpertise;
    return this.config.utils.clamp(weight, config.min, config.max);
  }

  /**
   * Get current configuration version
   * @returns {string} Version string
   */
  getVersion() {
    return this.config.version;
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration object
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

module.exports = RexCalculationService;