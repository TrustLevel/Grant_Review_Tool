# Assignment Algorithms

Deep dive into TrustLevel's smart assignment algorithms for proposals and peer reviews.

## Smart Proposal Assignment

The proposal assignment system matches reviewers to proposals using a two-tier prioritization system.

### Algorithm Overview

**Priority 1: Interest Matching**
- Proposals with reviewer interest matches get highest priority
- Sorted by urgency within interest-matched proposals

**Priority 2: Urgency-Based**  
- Proposals without interest matches, sorted by review need

### Implementation Details

#### 1. Interest-First Matching

```javascript
// Separate proposals into interest-matched and non-matched groups
proposals.forEach(proposal => {
  const proposalTags = proposal.metadata?.tags || [];
  const hasMatch = userInterests.some(interest => 
    proposalTags.includes(interest)
  );
  
  if (hasMatch) {
    withMatches.push(scoredProposal);
  } else {
    withoutMatches.push(scoredProposal);
  }
});

// Sort both groups by urgency, return matches first
return [...withMatches.sort(byUrgency), ...withoutMatches.sort(byUrgency)];
```

#### 2. Urgency Scoring Formula

```javascript
const urgencyScore = 
  (4 - Math.min(assignedReviews, 4)) * 10 +     // Assigned weight: 10pts
  (3 - Math.min(submittedReviews, 3)) * 50;     // Submitted weight: 50pts
```

**Scoring Logic:**
- **Submitted reviews** are 5x more important than assigned (50 vs 10 points)
- **Maximum 4 assigned reviews** contribute to urgency
- **Maximum 3 submitted reviews** contribute to urgency
- **Higher scores** = more urgent (fewer reviews completed)

**Example Scoring:**
```
Proposal A: 0 assigned, 0 submitted → Score: 40 + 150 = 190 (Most Urgent)
Proposal B: 2 assigned, 1 submitted → Score: 20 + 100 = 120 (Medium)
Proposal C: 4 assigned, 3 submitted → Score: 0 + 0 = 0 (Least Urgent)
```

#### 3. Conflict of Interest Detection

```javascript
function hasConflictOfInterest(user, proposal) {
  const affiliations = user.onboardingData?.affiliations;
  
  if (affiliations?.hasAffiliations && affiliations.proposalList) {
    const affiliatedIds = affiliations.proposalList
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);
    
    return affiliatedIds.includes(proposal.proposalId);
  }
  
  return false;
}
```

#### 4. Exclusion Logic

Proposals are excluded if:
- User already has a review for this proposal
- User has a peer review for any review of this proposal  
- User has conflict of interest with proposal
- Proposal has `reviewingEnabled: false`

### Complete Assignment Flow

```javascript
async function assignAdditionalReviews(userId, count) {
  // 1. Get eligible proposals (filtered for conflicts)
  const eligibleProposals = await getEligibleProposals(userId);
  
  // 2. Separate by interest matching and score by urgency
  const scoredProposals = scoreProposals(user, eligibleProposals);
  
  // 3. Select top N proposals
  const selectedProposals = scoredProposals.slice(0, count);
  
  // 4. Create review assignments
  const assignments = await Promise.all(
    selectedProposals.map(item => 
      createReviewAssignment(userId, item.proposal, item.reason)
    )
  );
  
  return assignments;
}
```

## Peer Review Assignment

Peer review assignment focuses on workload distribution and review quality needs.

### Algorithm Overview

**Priority System:**
1. **Reviews needing peer-reviews** (urgency-based)
2. **One peer-review per proposal** (avoid user reviewing same proposal multiple times)
3. **Workload balancing** (distribute assignments fairly)

### Implementation Details

#### 1. Eligibility Filtering

```javascript
async function getEligibleReviews(userId) {
  // Get proposals user has reviewed (can't peer-review same proposal)
  const userReviewedProposals = await Review.find({
    reviewerId: userId
  }).distinct('proposalId');
  
  // Find submitted reviews user hasn't peer-reviewed
  const eligibleReviews = await Review.aggregate([
    {
      $match: {
        status: 'submitted',
        reviewerId: { $ne: userId },                    // Not user's own review
        proposalId: { $nin: userReviewedProposals }     // Proposal not reviewed by user
      }
    },
    // ... complex aggregation to check existing peer-reviews
  ]);
  
  return eligibleReviews;
}
```

#### 2. Urgency Scoring for Peer Reviews

```javascript
const urgencyScore = 
  (TARGET_PEER_REVIEWS - Math.min(pendingPeerReviews, TARGET_PEER_REVIEWS)) * 10 +
  (TARGET_PEER_REVIEWS - Math.min(completedPeerReviews, TARGET_PEER_REVIEWS)) * 50;

// Small bonus for older reviews
const ageBonus = (Date.now() - reviewSubmittedAt) / (1000 * 60 * 60 * 24) * 0.1;

const totalScore = urgencyScore + ageBonus;
```

**Constants:**
- `TARGET_PEER_REVIEWS = 3` (desired peer-reviews per review)
- **Completed peer-reviews** weighted 5x more than pending (50 vs 10 points)
- **Age bonus** gives slight priority to older reviews

#### 3. Duplicate Prevention

```javascript
function removeDuplicateProposals(scoredReviews) {
  const uniqueReviews = [];
  const seenProposals = new Set();
  
  for (const scoredReview of scoredReviews) {
    const proposalId = scoredReview.review.proposalId.toString();
    
    if (!seenProposals.has(proposalId)) {
      uniqueReviews.push(scoredReview);
      seenProposals.add(proposalId);
    }
  }
  
  return uniqueReviews;
}
```

This ensures users only get **one peer-review per proposal** to maintain review diversity.

## Database Query Optimization

### Proposal Assignment Query

```javascript
const eligibleProposals = await Proposal.aggregate([
  // 1. Match active proposals
  {
    $match: {
      reviewingEnabled: true,
      status: { $in: ['inactive', 'active'] }
    }
  },
  
  // 2. Lookup existing reviews by user
  {
    $lookup: {
      from: 'reviews',
      let: { proposalId: '$_id' },
      pipeline: [{
        $match: {
          $expr: { 
            $and: [
              { $eq: ['$proposalId', '$$proposalId'] },
              { $eq: ['$reviewerId', userId] }
            ]
          }
        }
      }],
      as: 'userReviews'
    }
  },
  
  // 3. Lookup peer reviews by user for this proposal
  {
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
                { $eq: ['$assignedTo', userId] },
                { $eq: [{ $arrayElemAt: ['$review.proposalId', 0] }, '$$proposalId'] }
              ]
            }
          }
        }
      ],
      as: 'userPeerReviews'
    }
  },
  
  // 4. Calculate review statistics
  {
    $lookup: {
      from: 'reviews',
      localField: '_id',
      foreignField: 'proposalId',
      as: 'allReviews'
    }
  },
  
  // 5. Filter and project
  {
    $match: {
      userReviews: { $size: 0 },
      userPeerReviews: { $size: 0 }
    }
  },
  
  {
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
  }
]);
```

### Performance Optimizations

**Database Indexes:**
```javascript
// User collection
db.users.createIndex({ "_id": 1, "reviewerStatus": 1 });
db.users.createIndex({ "onboardingData.interests": 1 });

// Proposal collection  
db.proposals.createIndex({ "reviewingEnabled": 1, "status": 1 });
db.proposals.createIndex({ "metadata.tags": 1 });

// Review collection
db.reviews.createIndex({ "reviewerId": 1, "proposalId": 1 });
db.reviews.createIndex({ "proposalId": 1, "status": 1 });
db.reviews.createIndex({ "status": 1, "submittedAt": 1 });

// PeerReview collection
db.peerreviews.createIndex({ "assignedTo": 1, "reviewId": 1 });
db.peerreviews.createIndex({ "reviewId": 1, "status": 1 });
```

## Assignment Quality Metrics

### Success Metrics

**Interest Matching Accuracy:**
```javascript
const matchAccuracy = assignedProposals.filter(proposal => {
  const proposalTags = proposal.metadata?.tags || [];
  return userInterests.some(interest => proposalTags.includes(interest));
}).length / assignedProposals.length;
```

**Workload Distribution:**
```javascript
const workloadBalance = {
  avgAssignedReviews: totalAssignedReviews / activeReviewers,
  stdDeviation: calculateStdDev(reviewerWorkloads),
  maxWorkloadRatio: maxReviewerWorkload / avgWorkload
};
```

**Urgency Coverage:**
```javascript
const urgencyCoverage = {
  urgentProposals: proposalsWithZeroReviews.length,
  assignedUrgent: urgentAssignments.length,
  coverageRate: assignedUrgent / urgentProposals
};
```

### Quality Thresholds

**Good Assignment Quality:**
- Interest matching: >70% assignments match user interests
- Workload balance: Standard deviation <20% of mean
- Urgency coverage: >90% of urgent proposals assigned

## Algorithm Evolution

### Version History

**v1.0 - Basic Interest Matching:**
- Simple interest-based scoring
- Combined urgency + interest scoring

**v1.1 - Interest-First Priority:**
- Separate interest-matched from non-matched
- Urgency sorting within each group
- Current implementation

**Future Improvements:**

**v1.2 - Expertise Weighting:**
```javascript
const expertiseBonus = calculateExpertiseMatch(user.expertise, proposal.complexity);
const finalScore = baseUrgencyScore + expertiseBonus;
```

**v1.3 - Historical Performance:**
```javascript
const performanceMultiplier = calculateReviewerQuality(userId);
const adjustedWorkload = baseWorkload * performanceMultiplier;
```

**v1.4 - Machine Learning:**
- Training on historical review quality
- Predicting optimal reviewer-proposal matches
- Dynamic scoring adjustment

## Testing Assignment Algorithms

### Unit Tests

```javascript
describe('Smart Assignment Algorithm', () => {
  test('interest matches get priority over urgency', async () => {
    const user = createTestUser(['defi', 'governance']);
    const proposals = [
      createTestProposal({ urgency: 100, tags: ['nft'] }),        // No match, high urgency
      createTestProposal({ urgency: 50, tags: ['defi'] })         // Match, lower urgency
    ];
    
    const assignments = await assignProposals(user, proposals, 1);
    expect(assignments[0].tags).toContain('defi'); // Interest match wins
  });
  
  test('conflict of interest prevents assignment', async () => {
    const user = createTestUser([], { affiliations: { proposalList: 'PROP123' }});
    const proposal = createTestProposal({ proposalId: 'PROP123' });
    
    const assignments = await assignProposals(user, [proposal], 1);
    expect(assignments).toHaveLength(0);
  });
});
```

### Integration Tests

```javascript
describe('Assignment System Integration', () => {
  test('full assignment workflow', async () => {
    // Create test data
    const reviewer = await createTestReviewer();
    const proposals = await createTestProposals(10);
    
    // Run assignment
    const result = await assignAdditionalReviews(reviewer._id, 3);
    
    // Verify results
    expect(result.assignments).toHaveLength(3);
    expect(result.stats.avgScore).toBeGreaterThan(0);
  });
});
```

### Performance Testing

```bash
# Load test assignment endpoint
artillery run assignment-load-test.yml

# Test with large datasets
npm run test:assignment:stress -- --proposals=1000 --reviewers=100
```

## 📈 Monitoring & Analytics

### Assignment Metrics Dashboard

```javascript
const assignmentMetrics = {
  dailyAssignments: await getDailyAssignmentCount(),
  interestMatchRate: await calculateInterestMatchRate(),
  workloadDistribution: await getWorkloadDistribution(),
  urgencyCoverage: await getUrgencyCoverage(),
  conflictDetection: await getConflictStats()
};
```

### Algorithm Performance Tracking

```javascript
// Track assignment quality over time
db.assignment_metrics.insertOne({
  timestamp: new Date(),
  algorithm_version: '1.1',
  batch_size: assignments.length,
  interest_match_rate: calculateMatchRate(assignments),
  avg_urgency_score: calculateAvgScore(assignments),
  processing_time_ms: processingTime
});
```

---

For API implementation details, see [API Reference](./api-reference.md).  