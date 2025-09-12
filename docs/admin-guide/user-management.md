# User Management Guide

Complete guide for administrators to manage reviewers and system operations in TrustLevel.

## Admin Access

### Getting Admin Access
1. Admin role must be set directly in the database
2. Update user document: `{ role: 'admin' }`
3. Admin panel available at `/admin` after login

### Admin Dashboard Overview
- **System Statistics**: Users, reviews, peer reviews
- **User Management**: Approve/reject reviewers
- **Assignment Management**: Manual review distribution

## Reviewer Management

### User Approval Workflow

#### 1. Pending Reviewers
New users appear in "Pending" status after completing onboarding:
- Navigate to **Admin > User Approval**
- Review onboarding submissions
- Check expertise levels and interests
- Verify communication channels

#### 2. Approval Process
**Approve Reviewer:**
1. Click **"Approve"** button
2. User status changes to `approved`
3. User gains access to dashboard and review assignments
4. Automatic email notification (if configured)

**Reject Reviewer:**
1. Click **"Reject"** button  
2. Provide rejection reason
3. User status changes to `rejected`
4. User receives notification with reason

#### 3. Bulk Operations
**Mass Approval:**
```bash
# Via admin API
POST /api/admin/users/bulk-approve
{
  "userIds": ["user1_id", "user2_id", "user3_id"],
  "reason": "Batch approval for beta testing"
}
```

### User List Management

#### Filtering and Search
- **Status Filter**: All, Approved, Pending, Rejected
- **Search**: By username or email
- **Sort**: By join date, REP points, review count

#### User Actions
**Individual User Management:**
- **View Profile**: Complete onboarding data and statistics
- **Change Status**: Approve, reject, or suspend users
- **Reset Password**: Force password reset
- **Add Notes**: Internal admin notes

**Bulk Actions:**
- Select multiple users for batch operations
- Mass approval/rejection
- Export user data

### REP Points Management

#### Viewing REP Scores
```javascript
// User REP breakdown
{
  "totalPoints": 315,
  "reviewPoints": 250,      // 5 reviews × 50 points
  "peerReviewPoints": 60,   // 4 peer reviews × 15 points
  "bonusPoints": 5,         // Quality bonus
  "missionPoints": 0        // Mission completion rewards
}
```

#### Manual REP Adjustments
**Add Bonus Points:**
```bash
POST /api/admin/users/:id/rep-adjustment
{
  "points": 25,
  "reason": "Exceptional review quality",
  "type": "bonus"
}
```

**Deduct Points (Penalties):**
```bash
POST /api/admin/users/:id/rep-adjustment  
{
  "points": -10,
  "reason": "Late review submission",
  "type": "penalty"
}
```

## Assignment Management

### Manual Review Assignment

#### Individual Assignment
1. **Admin > Assignment Requests** or direct assignment
2. Select user from approved reviewers
3. Choose number of reviews to assign (1-20)
4. **Simulation Mode**: Preview assignments without creating
5. **Execute**: Create actual assignments

**Assignment Algorithm:**
- **Interest matching** prioritized first
- **Urgency** as secondary factor (proposals needing reviews)
- **Conflict detection** prevents biased assignments

#### Assignment Results
```javascript
{
  "success": true,
  "message": "Successfully assigned 3 reviews",
  "assignments": [
    {
      "proposalId": "prop123",
      "proposalTitle": "DeFi Innovation Protocol",
      "score": 185.5,
      "reason": "Interest match + urgent (2 tags)"
    }
  ],
  "stats": {
    "totalEligible": 45,
    "assigned": 3,
    "avgScore": 167.8
  }
}
```

### Bulk Assignment Operations

#### Mass Review Assignment
```bash
POST /api/admin/bulk-assign-reviews
{
  "reviewersCount": 20,        # Top 20 available reviewers
  "reviewsPerReviewer": 3,     # 3 reviews each
  "includeNewReviewers": true, # Include recently approved
  "simulation": false          # Execute assignments
}
```

#### Mass Peer Review Assignment
```bash
POST /api/admin/bulk-assign-peer-reviews
{
  "reviewersCount": 15,
  "peerReviewsPerReviewer": 5,
  "prioritizeExperienced": true,
  "simulation": false
}
```

### Assignment Monitoring

#### Review Progress Tracking
- **Assigned**: Reviews waiting to be started
- **In Progress**: Reviews being worked on
- **Submitted**: Completed reviews

## Analytics & Reporting

### Data Export

#### Review Data Export
**CSV Format:**
```csv
proposal_id,title,reviewer,score_relevance,score_innovation,score_impact,overall_comment,submitted_at
prop123,"DeFi Protocol",reviewer1,2,1,2,"Strong technical approach...",2024-01-15T10:30:00Z
```

**JSON Format:**
```javascript
{
  "exportDate": "2024-01-15T10:00:00Z",
  "totalReviews": 89,
  "reviews": [
    {
      "proposalId": "prop123",
      "proposalTitle": "DeFi Protocol", 
      "reviewer": {
        "username": "reviewer1",
        "expertise": [{"area": "technical", "level": 4}]
      },
      "scores": {
        "relevance": 2,
        "innovation": 1,
        "impact": 2,
        "feasibility": 1,
        "team": 2,
        "budget": 0
      },
      "comments": { ... },
      "overallScore": 8,
      "submittedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Export Options
- **Date Range**: Filter by submission date
- **Status Filter**: Only completed, all statuses
- **Reviewer Filter**: Specific reviewers or all
- **Format**: CSV

### Quality Analysis

#### Review Quality Metrics
```javascript
{
  "reviewQuality": {
    "avgCommentLength": 245,      // Characters per category comment
    "scoreDistribution": {
      "negative": 15,             // -3 to -1 scores
      "neutral": 45,              // 0 scores  
      "positive": 140             // +1 to +3 scores
    },
    "categoryCompletion": 98.5,   // % reviews with all categories
    "peerReviewRatings": {
      "excellent": 35,
      "good": 42,
      "adequate": 18,
      "needsImprovement": 5
    }
  }
}
```

#### Reviewer Performance
```javascript
{
  "topReviewers": [
    {
      "username": "reviewer1",
      "reviewsCompleted": 8,
      "avgPeerRating": 4.7,
      "onTimeRate": 100,
      "repPoints": 420
    }
  ],
  "performanceIssues": [
    {
      "username": "reviewer2", 
      "issue": "Late submissions",
      "impactedReviews": 3
    }
  ]
}
```

## System Configuration

### Review Settings

#### Global Parameters
```javascript
// Configurable in admin panel or environment
const systemConfig = {
  "reviewDeadlineDays": 7,
  "peerReviewDeadlineDays": 5,
  "maxReviewsPerUser": 20,
  "minReviewersPerProposal": 3,
  "targetPeerReviewsPerReview": 3,
  "autoAssignmentEnabled": true
};
```

#### REP Point Configuration
```javascript
const repConfig = {
  "reviewCompletionPoints": 50,
  "peerReviewCompletionPoints": 15,
  "qualityBonusPoints": 10,
  "lateSubmissionPenalty": -5,
  "missionCompletionBonus": 100
};
```

### Assignment Algorithm Tuning

#### Interest Matching Weight
```javascript
// Currently: Interest-first, then urgency
// Alternative: Weighted combination
const assignmentConfig = {
  "interestMatchWeight": 1.0,    // Primary factor
  "urgencyWeight": 0.5,          // Secondary factor  
  "expertiseWeight": 0.3,        // Tertiary factor
  "workloadBalance": true        // Prevent overload
};
```

---

For technical details, see [API Reference](../developer-guide/api-reference.md).  
For system monitoring, see [Deployment Guide](../deployment/installation.md).