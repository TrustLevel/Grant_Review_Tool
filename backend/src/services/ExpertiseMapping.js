// backend/src/services/ExpertiseMapping.js
// Map user expertise areas to domain-specific expertise scores

class ExpertiseMapping {

  constructor() {
    // Domain mapping for different proposal types
    this.domainMappings = {
      'technical': {
        // Technical expertise areas that match with proposal domains
        'development_tools': ['technical'],
        'smart_contracts': ['technical'],
        'defi': ['technical', 'product'],
        'identity_security': ['technical'],
        'interoperability': ['technical'],
        'gamefi': ['technical', 'product'],
        'nft': ['technical', 'product']
      },

      'community': {
        // Community expertise areas
        'governance': ['community'],
        'education': ['community'],
        'community_outreach': ['community'],
        'events_marketing': ['community'],
        'real_world_applications': ['community', 'product']
      },

      'product': {
        // Product/Business expertise areas
        'defi': ['product', 'technical'],
        'real_world_applications': ['product', 'community'],
        'sustainability': ['product'],
        'gamefi': ['product'],
        'nft': ['product']
      }
    };

    // Interest tag weights (how strongly each tag indicates expertise)
    this.interestWeights = {
      'governance': 0.9,
      'education': 0.8,
      'community_outreach': 0.8,
      'development_tools': 1.0,
      'identity_security': 0.9,
      'defi': 1.0,
      'real_world_applications': 0.7,
      'events_marketing': 0.6,
      'interoperability': 0.9,
      'sustainability': 0.7,
      'smart_contracts': 1.0,
      'gamefi': 0.8,
      'nft': 0.8
    };

    // Default expertise level if no match found
    this.defaultExpertise = 0.5;
  }

  /**
   * Calculate reviewer's expertise for a specific proposal domain
   * @param {Object} userData - User object with onboardingData
   * @param {Array} proposalTags - Array of proposal interest tags
   * @param {String} primaryDomain - Primary domain ('technical', 'community', 'product')
   * @returns {number} Expertise score [0,1]
   */
  calculateDomainExpertise(userData, proposalTags = [], primaryDomain = null) {
    if (!userData || !userData.onboardingData) {
      return this.defaultExpertise;
    }

    const { expertise, interests } = userData.onboardingData;

    // Component 1: Self-declared expertise levels
    const expertiseScore = this._calculateExpertiseScore(expertise, primaryDomain);

    // Component 2: Interest-proposal tag matching
    const interestScore = this._calculateInterestScore(interests, proposalTags);

    // Component 3: General experience indicators
    const experienceScore = this._calculateExperienceScore(userData);

    // Weighted combination
    const weights = {
      expertise: 0.5,    // Self-declared expertise areas/levels
      interests: 0.3,    // Interest-proposal matching
      experience: 0.2    // General experience indicators
    };

    const finalScore =
      weights.expertise * expertiseScore +
      weights.interests * interestScore +
      weights.experience * experienceScore;

    return Math.max(0, Math.min(1, finalScore));
  }

  /**
   * Calculate expertise score from user's declared expertise areas
   * @private
   */
  _calculateExpertiseScore(expertiseAreas, primaryDomain) {
    if (!expertiseAreas || expertiseAreas.length === 0) {
      return this.defaultExpertise;
    }

    // If no specific domain requested, use average of all areas
    if (!primaryDomain) {
      const avgLevel = expertiseAreas.reduce((sum, exp) => sum + exp.level, 0) / expertiseAreas.length;
      return (avgLevel - 1) / 4; // Convert [1,5] → [0,1]
    }

    // Find expertise in the requested domain
    const domainExpertise = expertiseAreas.find(exp => exp.area === primaryDomain);

    if (domainExpertise) {
      return (domainExpertise.level - 1) / 4; // Convert [1,5] → [0,1]
    }

    // If exact domain not found, use related domains with penalty
    const relatedExpertise = expertiseAreas.filter(exp =>
      this._areDomainsRelated(exp.area, primaryDomain)
    );

    if (relatedExpertise.length > 0) {
      const avgRelatedLevel = relatedExpertise.reduce((sum, exp) => sum + exp.level, 0) / relatedExpertise.length;
      return ((avgRelatedLevel - 1) / 4) * 0.7; // 70% of related expertise
    }

    return this.defaultExpertise;
  }

  /**
   * Calculate interest matching score
   * @private
   */
  _calculateInterestScore(userInterests, proposalTags) {
    if (!userInterests || userInterests.length === 0 || !proposalTags || proposalTags.length === 0) {
      return this.defaultExpertise;
    }

    // Calculate weighted Jaccard similarity
    const intersection = userInterests.filter(interest =>
      proposalTags.includes(interest)
    );

    if (intersection.length === 0) {
      return 0.3; // Some penalty for no overlap
    }

    // Weight matches by how strongly they indicate expertise
    const weightedMatches = intersection.reduce((sum, tag) => {
      return sum + (this.interestWeights[tag] || 0.5);
    }, 0);

    const maxPossibleWeight = Math.max(userInterests.length, proposalTags.length);

    return Math.min(1, weightedMatches / maxPossibleWeight);
  }

  /**
   * Calculate general experience score from user profile
   * @private
   */
  _calculateExperienceScore(userData) {
    let score = this.defaultExpertise;

    const { onboardingData, repPoints, createdAt } = userData;

    // REP points indicate experience
    if (repPoints > 0) {
      score += Math.min(0.3, repPoints / 1000); // Up to +0.3 for 1000+ REP
    }

    // Previous fund participation
    if (onboardingData?.previousFunds && onboardingData.previousFunds.length > 0) {
      score += Math.min(0.2, onboardingData.previousFunds.length * 0.05); // +0.05 per fund
    }

    // Account age (months)
    if (createdAt) {
      const accountAgeMonths = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
      score += Math.min(0.2, accountAgeMonths * 0.02); // +0.02 per month, max +0.2
    }

    return Math.min(1, score);
  }

  /**
   * Check if two domains are related
   * @private
   */
  _areDomainsRelated(domain1, domain2) {
    const relatedDomains = {
      'technical': ['product'],
      'product': ['technical', 'community'],
      'community': ['product']
    };

    return relatedDomains[domain1]?.includes(domain2) || false;
  }

  /**
   * Infer primary domain from proposal tags
   * @param {Array} proposalTags - Proposal interest tags
   * @returns {String} Primary domain ('technical', 'community', 'product')
   */
  inferPrimaryDomain(proposalTags) {
    if (!proposalTags || proposalTags.length === 0) {
      return 'technical'; // Default fallback
    }

    const domainScores = {
      technical: 0,
      community: 0,
      product: 0
    };

    // Score each domain based on tag matches
    proposalTags.forEach(tag => {
      Object.entries(this.domainMappings).forEach(([domain, mappings]) => {
        Object.entries(mappings).forEach(([interestTag, expertiseAreas]) => {
          if (interestTag === tag) {
            expertiseAreas.forEach(area => {
              domainScores[area] += this.interestWeights[tag] || 0.5;
            });
          }
        });
      });
    });

    // Return domain with highest score
    return Object.entries(domainScores)
      .sort(([,a], [,b]) => b - a)[0][0];
  }

  /**
   * Get expertise for peer review rater
   * Used when calculating peer rater weights in REX
   * @param {Object} raterUser - User object of the peer reviewer
   * @param {Object} originalReview - The review being peer-reviewed
   * @returns {number} Rater expertise [0,1]
   */
  async getPeerRaterExpertise(raterUser, originalReview) {
    // Get proposal tags from the review
    let proposalTags = [];

    if (originalReview.proposalId && originalReview.proposalId.metadata?.tags) {
      proposalTags = originalReview.proposalId.metadata.tags;
    }

    // Infer domain from the review context
    const primaryDomain = this.inferPrimaryDomain(proposalTags);

    // Calculate rater's expertise in this domain
    return this.calculateDomainExpertise(raterUser, proposalTags, primaryDomain);
  }

  /**
   * Batch calculate expertise for multiple users
   * @param {Array} users - Array of user objects
   * @param {Array} proposalTags - Proposal tags
   * @param {String} primaryDomain - Domain to calculate for
   * @returns {Object} Map of userId -> expertise score
   */
  batchCalculateExpertise(users, proposalTags, primaryDomain) {
    const results = {};

    users.forEach(user => {
      results[user._id.toString()] = this.calculateDomainExpertise(
        user,
        proposalTags,
        primaryDomain
      );
    });

    return results;
  }

  /**
   * Get configuration for tuning
   * @returns {Object} Current configuration
   */
  getConfig() {
    return {
      domainMappings: this.domainMappings,
      interestWeights: this.interestWeights,
      defaultExpertise: this.defaultExpertise
    };
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration values
   */
  updateConfig(newConfig) {
    if (newConfig.domainMappings) this.domainMappings = { ...this.domainMappings, ...newConfig.domainMappings };
    if (newConfig.interestWeights) this.interestWeights = { ...this.interestWeights, ...newConfig.interestWeights };
    if (newConfig.defaultExpertise !== undefined) this.defaultExpertise = newConfig.defaultExpertise;
  }
}

module.exports = ExpertiseMapping;