// backend/src/services/SingleProposalAssignment.js

const User = require('../models/User');
const Proposal = require('../models/Proposal');
const Review = require('../models/Review');
const PeerReview = require('../models/PeerReview');

class SingleProposalAssignmentService {
  constructor() {
    this.INTEREST_TAGS = [
      'governance', 'education', 'community_outreach', 'development_tools',
      'identity_security', 'defi', 'real_world_applications', 'events_marketing',
      'interoperability', 'sustainability', 'smart_contracts', 'gamefi', 'nft'
    ];
  }

  /**
   * Assign additional reviews to a specific user
   */
  async assignAdditionalReviews(userId, count, options = {}) {
    console.log(`🚀 Assigning ${count} additional reviews to user ${userId}...`);
    
    try {
      // 1. Load user with onboarding data
      const user = await this.loadUser(userId);
      if (!user) {
        throw new Error('User not found or not approved');
      }

      console.log(`👤 User: ${user.username || user.email} (${user.reviewerStatus})`);
      console.log(`📊 Expertise: ${this.formatExpertise(user.onboardingData?.expertise)}`);
      console.log(`🏷️  Interests: ${user.onboardingData?.interests?.join(', ') || 'none'}\n`);

      // 2. Find eligible proposals
      const eligibleProposals = await this.getEligibleProposals(userId);
      console.log(`📋 Found ${eligibleProposals.length} eligible proposals`);

      if (eligibleProposals.length === 0) {
        return {
          success: false,
          message: 'No eligible proposals found for this user',
          assignments: []
        };
      }

      // 3. Score and rank proposals
      const scoredProposals = this.scoreProposals(user, eligibleProposals);
      
      // 4. Select top proposals
      const selectedCount = Math.min(count, scoredProposals.length);
      const selectedProposals = scoredProposals.slice(0, selectedCount);

      console.log(`\n🎯 Selected ${selectedCount} proposals for assignment:`);
      selectedProposals.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.proposal.proposalTitle} (Score: ${item.score.toFixed(1)}) - ${item.reason}`);
      });

      // 5. Create review assignments (if not simulation)
      const assignments = [];
      if (!options.simulation) {
        for (const item of selectedProposals) {
          const assignment = await this.createReviewAssignment(user._id, item.proposal, item.reason);
          assignments.push(assignment);
        }
        console.log(`\n✅ Created ${assignments.length} review assignments`);
      } else {
        console.log('\n🧪 SIMULATION MODE - No assignments created');
      }

      return {
        success: true,
        message: `Successfully assigned ${selectedCount} reviews`,
        assignments: selectedProposals.map(item => ({
          proposalId: item.proposal._id,
          proposalTitle: item.proposal.proposalTitle,
          score: item.score,
          reason: item.reason
        })),
        stats: this.generateAssignmentStats(user, eligibleProposals, selectedProposals)
      };

    } catch (error) {
      console.error('❌ Assignment failed:', error);
      throw error;
    }
  }

  /**
   * Load user with required data for assignment
   */
  async loadUser(userId) {
    return await User.findById(userId, {
      email: 1,
      username: 1,
      reviewerStatus: 1,
      'onboardingData.expertise': 1,
      'onboardingData.interests': 1,
      'onboardingData.affiliations': 1
    }).lean();
  }

  /**
   * Get proposals eligible for assignment to user
   */
  async getEligibleProposals(userId) {
    console.log('🔍 Finding eligible proposals...');
    
    // Complex aggregation to filter out proposals user is already involved with
    const eligibleProposals = await Proposal.aggregate([
      {
        // 1. Match active proposals enabled for review
        $match: {
          reviewingEnabled: true,
          status: { $in: ['inactive', 'active'] } // Both inactive and active proposals
        }
      },
      {
        // 2. Lookup existing reviews for this user
        $lookup: {
          from: 'reviews',
          let: { proposalId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { 
                  $and: [
                    { $eq: ['$proposalId', '$$proposalId'] },
                    { $eq: ['$reviewerId', { $toObjectId: userId }] }
                  ]
                }
              }
            }
          ],
          as: 'userReviews'
        }
      },
      {
        // 3. Lookup peer reviews assigned to this user for this proposal (via reviewId -> proposalId)
        $lookup: {
          from: 'peerreviews',
          let: { proposalId: '$_id' },
          pipeline: [
            {
              $lookup: {
                from: 'reviews',
                localField: 'reviewId',
                foreignField: '_id',
                as: 'review'
              }
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$assignedTo', { $toObjectId: userId }] },
                    { $eq: [{ $arrayElemAt: ['$review.proposalId', 0] }, '$$proposalId'] }
                  ]
                }
              }
            }
          ],
          as: 'userPeerReviews'
        }
      },
      {
        // 4. Lookup all reviews to calculate urgency score
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'proposalId',
          as: 'allReviews'
        }
      },
      {
        // 5. Filter out proposals user is already involved with
        $match: {
          userReviews: { $size: 0 },      // No existing reviews
          userPeerReviews: { $size: 0 }   // No existing peer reviews
        }
      },
      {
        // 6. Add computed fields for scoring
        $addFields: {
          assignedReviews: {
            $size: {
              $filter: {
                input: '$allReviews',
                cond: { $in: ['$$this.status', ['assigned', 'in_progress', 'submitted']] }
              }
            }
          },
          submittedReviews: {
            $size: {
              $filter: {
                input: '$allReviews',
                cond: { $eq: ['$$this.status', 'submitted'] }
              }
            }
          }
        }
      },
      {
        // 7. Project only needed fields
        $project: {
          proposalTitle: 1,
          'metadata.tags': 1,
          'budget.total': 1,
          assignedReviews: 1,
          submittedReviews: 1,
          status: 1
        }
      }
    ]);

    console.log(`   ✅ ${eligibleProposals.length} proposals after filtering`);
    
    // Additional conflict of interest check
    const user = await User.findById(userId, { 'onboardingData.affiliations': 1 }).lean();
    const filteredProposals = eligibleProposals.filter(proposal => 
      !this.hasConflictOfInterest(user, proposal)
    );

    console.log(`   ✅ ${filteredProposals.length} proposals after conflict check`);
    return filteredProposals;
  }

  /**
   * Score proposals based on urgency and user interests
   */
  scoreProposals(user, proposals) {
    console.log('\n📊 Scoring proposals...');
    
    const userInterests = user.onboardingData?.interests || [];
    
    // Separate proposals into those with interest matches and those without
    const withMatches = [];
    const withoutMatches = [];
    
    proposals.forEach(proposal => {
      const proposalTags = proposal.metadata?.tags || [];
      const hasMatch = userInterests.some(interest => proposalTags.includes(interest));
      const urgencyScore = this.calculateUrgencyScore(proposal);
      const reason = this.getAssignmentReason(user, proposal, urgencyScore, hasMatch);
      
      const scoredProposal = {
        proposal,
        score: urgencyScore,
        reason,
        hasInterestMatch: hasMatch
      };
      
      if (hasMatch) {
        withMatches.push(scoredProposal);
      } else {
        withoutMatches.push(scoredProposal);
      }
    });

    // Sort both groups by urgency (highest first)
    withMatches.sort((a, b) => b.score - a.score);
    withoutMatches.sort((a, b) => b.score - a.score);

    // Return interest matches first, then non-matches
    return [...withMatches, ...withoutMatches];
  }

  /**
   * Calculate urgency score for proposal
   */
  calculateUrgencyScore(proposal) {
    const assignedReviews = proposal.assignedReviews || 0;
    const submittedReviews = proposal.submittedReviews || 0;
    
    // Higher urgency for fewer reviews (max 4 assigned, 3 submitted)
    // Submitted reviews are 5x more important than assigned (50 vs 10 points)
    const urgencyScore = (4 - Math.min(assignedReviews, 4)) * 10 + 
                        (3 - Math.min(submittedReviews, 3)) * 50;
    
    // Small random factor for tie-breaking
    return urgencyScore + Math.random() * 2;
  }

  /**
   * Get human-readable assignment reason
   */
  getAssignmentReason(user, proposal, _urgencyScore, hasInterestMatch) {
    const assignedReviews = proposal.assignedReviews || 0;
    const submittedReviews = proposal.submittedReviews || 0;
    const interests = user.onboardingData?.interests || [];
    const proposalTags = proposal.metadata?.tags || [];
    const matchingInterests = interests.filter(interest => proposalTags.includes(interest)).length;

    if (hasInterestMatch) {
      if (assignedReviews === 0 && submittedReviews === 0) {
        return `Interest match + urgent (${matchingInterests} tags)`;
      } else if (submittedReviews === 0) {
        return `Interest match + priority (${matchingInterests} tags)`;
      } else {
        return `Interest match (${matchingInterests} tags)`;
      }
    } else {
      if (assignedReviews === 0 && submittedReviews === 0) {
        return 'Urgent: No reviews assigned';
      } else if (submittedReviews === 0) {
        return 'High priority: No completed reviews';
      } else {
        return 'High need for reviews';
      }
    }
  }

  /**
   * Check for conflicts of interest
   */
  hasConflictOfInterest(user, proposal) {
    const affiliations = user.onboardingData?.affiliations;
    if (affiliations?.hasAffiliations && affiliations.proposalList) {
      const affiliatedIds = affiliations.proposalList
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);
      
      // Check if proposal ID matches any affiliated proposals
      if (affiliatedIds.includes(proposal.proposalId)) {
        console.log(`   ⚠️  Conflict: User has affiliation with proposal ${proposal.proposalId}`);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Create review assignment record
   */
  async createReviewAssignment(userId, proposal, reason) {
    const review = new Review({
      proposalId: proposal._id,
      reviewerId: userId,
      assignment: {
        assignedAt: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        assignedBy: null // Admin assignment
      },
      status: 'assigned',
      reviewProgress: {
        relevance: { completed: false },
        innovation: { completed: false },
        impact: { completed: false },
        feasibility: { completed: false },
        team: { completed: false },
        budget: { completed: false }
      },
      metadata: {
        assignmentType: 'admin-assignment',
        assignmentReason: reason,
        assignedAt: new Date()
      }
    });
    
    await review.save();
    
    // Update proposal status if it was inactive
    if (proposal.status === 'inactive') {
      await Proposal.findByIdAndUpdate(proposal._id, { status: 'active' });
    }
    
    return {
      reviewId: review._id,
      proposalId: proposal._id,
      proposalTitle: proposal.proposalTitle,
      reason: reason
    };
  }

  /**
   * Generate assignment statistics
   */
  generateAssignmentStats(user, eligibleProposals, selectedProposals) {
    const urgentProposals = eligibleProposals.filter(p => 
      (p.assignedReviews || 0) === 0 && (p.submittedReviews || 0) === 0
    ).length;
    
    const highPriorityProposals = eligibleProposals.filter(p => 
      (p.submittedReviews || 0) === 0
    ).length;

    return {
      totalEligible: eligibleProposals.length,
      assigned: selectedProposals.length,
      urgentProposals,
      highPriorityProposals,
      userInterests: user.onboardingData?.interests?.length || 0,
      avgScore: selectedProposals.length > 0 
        ? selectedProposals.reduce((sum, p) => sum + p.score, 0) / selectedProposals.length 
        : 0
    };
  }

  /**
   * Format expertise for display
   */
  formatExpertise(expertise) {
    if (!expertise || expertise.length === 0) return 'none';
    return expertise.map(e => `${e.area}:${e.level}`).join(', ');
  }
}

module.exports = new SingleProposalAssignmentService();