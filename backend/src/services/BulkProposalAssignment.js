// backend/src/services/ProposalAssignment.js
const Review = require('../models/Review');
const User = require('../models/User');
const Proposal = require('../models/Proposal');

class ProposalAssignmentService {
  constructor() {
    this.MIN_REVIEWS_PER_PROPOSAL = 3;
    this.TARGET_REVIEWS_PER_PROPOSAL = 4;
    this.MIN_EXPERTISE_LEVEL = 2; // Minimum level for expertise-based assignment (Levels 1-5)
  }

  /**
   * Main assignment function - Two-phase approach
   */
  async assignReviews() {
    console.log('🚀 Starting Two-Phase Assignment Process...');
    
    try {
      // Load data
      const reviewers = await this.getApprovedReviewers();
      const proposals = await this.getActiveProposals();
      
      console.log(`📊 Loaded ${reviewers.length} reviewers and ${proposals.length} proposals`);
      
      // Initialize capacity tracking
      this.initializeCapacityTracking(reviewers);
      
      // Phase 1: Expertise-based assignments
      console.log('\n🎯 Phase 1: Expertise-based assignments');
      const phase1Results = await this.assignByExpertise(proposals, reviewers);
      
      // Phase 2: Fill remaining slots
      console.log('\n🔄 Phase 2: Fill remaining slots');  
      const phase2Results = await this.fillRemainingSlots(proposals, reviewers);
      
      // Generate summary
      const summary = this.generateAssignmentSummary(proposals, phase1Results, phase2Results);
      console.log('\n📈 Assignment Summary:', summary);
      
      // Update proposal status after assignment
      await this.updateProposalStatusAfterAssignment(proposals);
      
      return summary;
      
    } catch (error) {
      console.error('❌ Assignment failed:', error);
      throw error;
    }
  }

  /**
   * Load approved reviewers with onboarding data (lean query for performance)
   */
  async getApprovedReviewers() {
    return await User.find({
      reviewerStatus: 'approved',  // ← FIXED: correct field name
      'onboardingData.completedAt': { $exists: true },
      'onboardingData.expertise': { $exists: true, $ne: [] }
    }, {
      // Only fields needed for assignment
      email: 1,
      username: 1,
      'onboardingData.expertise': 1,
      'onboardingData.interests': 1,
      'onboardingData.reviewCapacity': 1,
      'onboardingData.affiliations': 1,
      reviewerStatus: 1  // ← FIXED: correct field name
    }).lean();  // Plain objects for performance
  }

  /**
   * Load active proposals that need reviews (lean query for performance)
   */
  async getActiveProposals() {
    return await Proposal.find({
      status: 'inactive',
      reviewingEnabled: true  // Only inactive proposals enabled for review
    }, {
      // Essential fields for assignment
      proposalId: 1,        // For conflict checking (affiliations)
      'metadata.tags': 1,   // For interest matching (Catalyst API tags)
      status: 1             // For status tracking
    }).lean();  // Plain objects for performance
  }

  /**
   * Initialize capacity tracking for reviewers
   */
  initializeCapacityTracking(reviewers) {
    reviewers.forEach(reviewer => {
      // Set max capacity based on onboarding data
      const capacity = reviewer.onboardingData?.reviewCapacity;
      switch(capacity) {
        case 'low': reviewer.maxCapacity = 10; break;
        case 'medium': reviewer.maxCapacity = 15; break;
        case 'max': 
        case 'unsure':
        default: reviewer.maxCapacity = 20; break;
      }
      
      // Initialize remaining capacity
      reviewer.remainingCapacity = reviewer.maxCapacity;
      reviewer.currentAssignments = [];
    });
  }

  /**
   * PHASE 1: Hybrid assignment approach
   */
  async assignByExpertise(proposals, reviewers) {
    console.log('\n🔄 Starting Hybrid Assignment Process...');
    
    // Step 1: Calculate difficulty score for each proposal
    const proposalsWithDifficulty = this.calculateProposalDifficulty(proposals, reviewers);
    
    // Step 2: Sort by difficulty (hardest first)
    proposalsWithDifficulty.sort((a, b) => a.difficulty - b.difficulty);
    
    console.log('📊 Proposal difficulty ranking:');
    proposalsWithDifficulty.forEach(p => {
      console.log(`   ${p.proposal.proposalTitle}: ${p.difficulty} suitable reviewers`);
    });
    
    // Step 3: Sequential assignment for difficult proposals
    let assignmentCount = 0;
    const difficultThreshold = 5; // If fewer than 5 suitable reviewers
    
    console.log('\n🎯 Sequential assignment for difficult proposals...');
    for (const item of proposalsWithDifficulty) {
      if (item.difficulty <= difficultThreshold) {
        const assigned = await this.assignSequential(item.proposal, reviewers);
        assignmentCount += assigned;
      }
    }
    
    // Step 4: Round-robin for remaining proposals
    console.log('\n🔄 Round-robin assignment for remaining proposals...');
    const roundRobinAssigned = await this.assignRoundRobin(proposalsWithDifficulty, reviewers);
    assignmentCount += roundRobinAssigned;
    
    return { assignmentCount, expertiseMatches: assignmentCount };
  }

  /**
   * Calculate difficulty score for proposals (number of suitable reviewers)
   */
  calculateProposalDifficulty(proposals, reviewers) {
    return proposals.map(proposal => {
      proposal.currentAssignments = [];
      
      // Count reviewers that meet minimum requirements
      const suitableCount = reviewers.filter(reviewer => {
        const score = this.calculateReviewerScore(reviewer, proposal);
        return score > 30; // Minimum threshold for suitability
      }).length;
      
      return {
        proposal: proposal,
        difficulty: suitableCount,
        suitableReviewers: suitableCount
      };
    });
  }

  /**
   * Calculate reviewer score for a proposal (new scoring system)
   */
  calculateReviewerScore(reviewer, proposal) {
    const expertise = reviewer.onboardingData?.expertise || [];
    const interests = reviewer.onboardingData?.interests || [];
    const proposalTags = proposal.metadata?.tags || [];
    
    // For "Product & Integration" challenge
    const technical = expertise.find(e => e.area === 'technical')?.level || 0;
    const product = expertise.find(e => e.area === 'product')?.level || 0;
    const community = expertise.find(e => e.area === 'community')?.level || 0;
    
    // Expertise Score
    let expertiseScore = Math.max(technical, product) * 10;
    
    // Bonuses
    if (technical >= 3 && product >= 3) expertiseScore += 5;
    if (community >= 2) expertiseScore += 3;
    
    // Interest Score - count matching tags
    const matchingTags = interests.filter(interest => 
      proposalTags.includes(interest)
    ).length;
    const interestScore = matchingTags * 5;
    
    // Capacity Bonus
    const capacityBonus = (reviewer.remainingCapacity / reviewer.maxCapacity) * 3;
    
    return expertiseScore + interestScore + capacityBonus;
  }

  /**
   * Sequential assignment for difficult proposals
   */
  async assignSequential(proposal, reviewers) {
    console.log(`\n📋 Sequential: ${proposal.proposalTitle}`);
    
    // Calculate scores and sort
    const scoredReviewers = reviewers
      .filter(reviewer => reviewer.remainingCapacity > 0)
      .map(reviewer => ({
        ...reviewer,
        score: this.calculateReviewerScore(reviewer, proposal)
      }))
      .sort((a, b) => b.score - a.score);
    
    let assignedCount = 0;
    const maxAssignments = Math.min(this.TARGET_REVIEWS_PER_PROPOSAL, scoredReviewers.length);
    
    for (let i = 0; i < maxAssignments; i++) {
      const reviewer = scoredReviewers[i];
      
      if (await this.canAssign(reviewer, proposal)) {
        await this.createAssignment(proposal, reviewer, 'hybrid');
        assignedCount++;
        console.log(`   ✅ Assigned to ${reviewer.username || reviewer.email} (score: ${reviewer.score.toFixed(1)})`);
      }
      
      if (proposal.currentAssignments.length >= this.TARGET_REVIEWS_PER_PROPOSAL) {
        break;
      }
    }
    
    console.log(`   📊 Sequential result: ${proposal.currentAssignments.length}/${this.TARGET_REVIEWS_PER_PROPOSAL} assignments`);
    return assignedCount;
  }

  /**
   * Round-robin assignment for remaining proposals
   */
  async assignRoundRobin(proposalsWithDifficulty, reviewers) {
    let totalAssigned = 0;
    
    // Get proposals that still need assignments
    const needingAssignment = proposalsWithDifficulty.filter(item => 
      item.proposal.currentAssignments.length < this.MIN_REVIEWS_PER_PROPOSAL &&
      item.difficulty > 5 // Only non-difficult proposals
    );
    
    if (needingAssignment.length === 0) {
      console.log('   ℹ️  No proposals need round-robin assignment');
      return 0;
    }
    
    // Round-robin assignment
    for (let round = 1; round <= this.TARGET_REVIEWS_PER_PROPOSAL; round++) {
      console.log(`\n   Round ${round}:`);
      
      for (const item of needingAssignment) {
        const proposal = item.proposal;
        
        if (proposal.currentAssignments.length >= this.TARGET_REVIEWS_PER_PROPOSAL) {
          continue;
        }
        
        // Find best available reviewer for this proposal
        const availableReviewers = reviewers
          .filter(reviewer => reviewer.remainingCapacity > 0)
          .filter(reviewer => !proposal.currentAssignments.some(assignment => 
            assignment.reviewerId.toString() === reviewer._id.toString()
          ))
          .map(reviewer => ({
            ...reviewer,
            score: this.calculateReviewerScore(reviewer, proposal)
          }))
          .sort((a, b) => b.score - a.score);
        
        if (availableReviewers.length > 0) {
          const bestReviewer = availableReviewers[0];
          
          if (await this.canAssign(bestReviewer, proposal)) {
            await this.createAssignment(proposal, bestReviewer, 'round-robin');
            totalAssigned++;
            console.log(`     ✅ ${proposal.proposalTitle} → ${bestReviewer.username || bestReviewer.email}`);
          }
        }
      }
    }
    
    return totalAssigned;
  }


  /**
   * PHASE 2: Fill remaining slots
   */
  async fillRemainingSlots(proposals, reviewers) {
    let assignmentCount = 0;
    let interestMatches = 0;
    
    // Find under-assigned proposals
    const underAssigned = proposals.filter(p => 
      p.currentAssignments.length < this.MIN_REVIEWS_PER_PROPOSAL
    );
    
    console.log(`📋 Found ${underAssigned.length} under-assigned proposals`);
    
    // Calculate remaining capacity
    const remainingCapacity = this.calculateRemainingCapacity(reviewers);
    console.log(`📊 Remaining capacity:`, remainingCapacity);
    
    // Fill slots based on interest matching and availability
    for (const proposal of underAssigned) {
      const slotsNeeded = Math.min(
        this.TARGET_REVIEWS_PER_PROPOSAL - proposal.currentAssignments.length,
        remainingCapacity.total
      );
      
      console.log(`\n📋 Filling ${slotsNeeded} slots for: ${proposal.proposalTitle}`);
      
      // Find best available candidates
      const candidates = this.findInterestBasedCandidates(reviewers, proposal);
      
      for (let i = 0; i < slotsNeeded && i < candidates.length; i++) {
        const reviewer = candidates[i];
        
        if (await this.canAssign(reviewer, proposal)) {
          await this.createAssignment(proposal, reviewer, 'interest');
          assignmentCount++;
          interestMatches++;
          remainingCapacity.total--;
          console.log(`   ✅ Assigned to ${reviewer.username || reviewer.email} (interest match)`);
        }
      }
    }
    
    return { assignmentCount, interestMatches };
  }

  /**
   * Calculate remaining reviewer capacity
   */
  calculateRemainingCapacity(reviewers) {
    const capacity = {
      total: 0,
      byExpertise: {},
      byReviewer: []
    };
    
    reviewers.forEach(reviewer => {
      const remaining = reviewer.remainingCapacity;
      capacity.total += remaining;
      
      if (remaining > 0) {
        capacity.byReviewer.push({
          reviewer: reviewer.username || reviewer.email,
          remaining: remaining,
          expertise: reviewer.onboardingData?.expertise || []
        });
      }
      
      // Group by expertise areas
      (reviewer.onboardingData?.expertise || []).forEach(exp => {
        if (exp.level >= this.MIN_EXPERTISE_LEVEL) {
          capacity.byExpertise[exp.area] = (capacity.byExpertise[exp.area] || 0) + remaining;
        }
      });
    });
    
    return capacity;
  }

  /**
   * Find candidates for interest-based matching
   */
  findInterestBasedCandidates(reviewers, proposal) {
    const proposalTags = proposal.metadata?.tags || [];
    
    return reviewers
      .filter(reviewer => reviewer.remainingCapacity > 0)
      .map(reviewer => {
        // Calculate interest match score
        const interests = reviewer.onboardingData?.interests || [];
        const matchingInterests = interests.filter(interest => 
          proposalTags.includes(interest)
        ).length;
        
        // Calculate general capability score
        const maxExpertiseLevel = Math.max(
          ...(reviewer.onboardingData?.expertise || []).map(e => e.level),
          0
        );
        
        // Workload balancing factor
        const workloadFactor = reviewer.remainingCapacity / reviewer.maxCapacity;
        
        return {
          ...reviewer,
          matchScore: matchingInterests * 5 + maxExpertiseLevel + workloadFactor * 3
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Check if reviewer can be assigned to proposal
   */
  async canAssign(reviewer, proposal) {
    // Check capacity
    if (reviewer.remainingCapacity <= 0) {
      return false;
    }
    
    // Check if already assigned to this proposal
    if (proposal.currentAssignments.some(assignment => 
      assignment.reviewerId.toString() === reviewer._id.toString()
    )) {
      return false;
    }
    
    // Check for conflicts of interest
    if (await this.hasConflictOfInterest(reviewer, proposal)) {
      return false;
    }
    
    return true;
  }

  /**
   * Check for conflicts of interest
   */
  async hasConflictOfInterest(reviewer, proposal) {
    // Check affiliations from onboarding
    const affiliations = reviewer.onboardingData?.affiliations;
    if (affiliations?.hasAffiliations && affiliations.proposalList) {
      const affiliatedIds = affiliations.proposalList
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);
      
      if (affiliatedIds.includes(proposal.proposalId)) {
        console.log(`   ⚠️  Conflict: ${reviewer.username || reviewer.email} has affiliation with proposal ${proposal.proposalId}`);
        return true;
      }
    }
    
    // TODO: Check for self-authorship (when we have proposer data from Catalyst API)
    
    return false;
  }

  /**
   * Create assignment record
   */
  async createAssignment(proposal, reviewer, assignmentType) {
    // Check if this is a demo proposal
    const isDemoProposal = proposal.proposalTitle && 
                          (proposal.proposalTitle.toLowerCase().includes('demo:') || 
                           proposal.proposalTitle.toLowerCase().startsWith('demo '));

    const review = new Review({
      proposalId: proposal._id,
      reviewerId: reviewer._id,
      challengeId: proposal.challengeId,
      assignment: {
        assignedAt: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        assignedBy: null // System assignment
      },
      status: 'assigned',
      isDemo: isDemoProposal,
      reviewProgress: {
        relevance: { completed: false },
        innovation: { completed: false },
        impact: { completed: false },
        feasibility: { completed: false },
        team: { completed: false },
        budget: { completed: false }
      },
      metadata: {
        assignmentType: assignmentType, // 'expertise' or 'interest'
        assignedAt: new Date()
      }
    });
    
    await review.save();
    
    // Update tracking
    proposal.currentAssignments.push({
      reviewerId: reviewer._id,
      assignmentType: assignmentType,
      reviewId: review._id
    });
    
    reviewer.remainingCapacity--;
    reviewer.currentAssignments.push({
      proposalId: proposal._id,
      reviewId: review._id
    });
  }

  /**
   * Generate assignment summary
   */
  generateAssignmentSummary(proposals, phase1Results, phase2Results) {
    const totalAssignments = phase1Results.assignmentCount + phase2Results.assignmentCount;
    
    // Calculate coverage stats
    const fullyAssigned = proposals.filter(p => 
      p.currentAssignments.length >= this.MIN_REVIEWS_PER_PROPOSAL
    ).length;
    
    const assignmentDistribution = {};
    proposals.forEach(proposal => {
      const count = proposal.currentAssignments.length;
      assignmentDistribution[count] = (assignmentDistribution[count] || 0) + 1;
    });
    
    // Calculate average assignments per proposal
    const avgAssignmentsPerProposal = (totalAssignments / proposals.length).toFixed(2);
    
    return {
      totalProposals: proposals.length,
      totalAssignments: totalAssignments,
      fullyAssigned: fullyAssigned,
      coveragePercentage: ((fullyAssigned / proposals.length) * 100).toFixed(1),
      avgAssignmentsPerProposal: avgAssignmentsPerProposal,
      phase1: {
        assignments: phase1Results.assignmentCount,
        expertiseMatches: phase1Results.expertiseMatches
      },
      phase2: {
        assignments: phase2Results.assignmentCount,
        interestMatches: phase2Results.interestMatches
      },
      assignmentDistribution: assignmentDistribution
    };
  }

  /**
   * Update proposal status after successful assignment
   */
  async updateProposalStatusAfterAssignment(proposals) {
    const Proposal = require('../models/Proposal');
    const proposalUpdates = [];
    
    for (const proposal of proposals) {
      // If proposal has assignments, update status to 'assigned'
      if (proposal.currentAssignments && proposal.currentAssignments.length > 0) {
        proposalUpdates.push(
          Proposal.findByIdAndUpdate(proposal._id, { status: 'active' })
        );
        console.log(`📝 Updated proposal ${proposal.proposalId} status: inactive → active`);
      }
    }
    
    // Execute all status updates in parallel
    if (proposalUpdates.length > 0) {
      await Promise.all(proposalUpdates);
      console.log(`✅ Updated ${proposalUpdates.length} proposal statuses`);
    }
  }
}

module.exports = new ProposalAssignmentService();