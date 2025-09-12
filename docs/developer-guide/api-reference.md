# API Reference

Complete REST API documentation for TrustLevel backend services.

## Base URL
- **Development**: `http://localhost:3001`
- **Production**: `https://your-app-runner-url.com`

## Authentication

All protected endpoints require JWT authentication via `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

Tokens are obtained through Supabase authentication flow and validated by the backend.

## Authentication Endpoints

### POST /api/auth/supabase
Verify Supabase JWT and create backend session.

**Request:**
```json
{
  "supabaseToken": "supabase_jwt_token"
}
```

**Response:**
```json
{
  "token": "backend_jwt_token",
  "user": {
    "_id": "user_id",
    "email": "user@example.com",
    "reviewerStatus": "approved",
    "role": "reviewer"
  }
}
```

### GET /api/auth/me
Get current user profile (requires authentication).

**Response:**
```json
{
  "_id": "user_id",
  "email": "user@example.com",
  "username": "reviewer123",
  "reviewerStatus": "approved",
  "role": "reviewer",
  "repPoints": 150,
  "onboardingData": { ... }
}
```

## User Management

### POST /api/onboarding
Complete user onboarding process.

**Request:**
```json
{
  "username": "reviewer123",
  "onboardingData": {
    "expertise": [
      { "area": "technical", "level": 4 },
      { "area": "product", "level": 3 }
    ],
    "interests": ["defi", "smart_contracts", "governance"],
    "reviewCapacity": "medium",
    "affiliations": {
      "hasAffiliations": false,
      "proposalList": ""
    },
    "previousFunds": ["Fund 12", "Fund 11"],
    "otherGrants": "Gitcoin, MakerDAO"
  },
  "telegram": "@username",
  "discord": "user#1234",
  "acceptedGuidelines": true
}
```

**Response:**
```json
{
  "success": true,
  "user": { ... },
  "message": "Onboarding completed successfully"
}
```

### GET /api/users/:id
Get user profile by ID (admin only).

**Response:**
```json
{
  "_id": "user_id",
  "email": "user@example.com",
  "username": "reviewer123",
  "reviewerStatus": "approved",
  "onboardingData": { ... },
  "repPoints": 150,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## Review Management

### GET /api/reviews
Get assigned reviews for current user.

**Response:**
```json
[
  {
    "_id": "review_id",
    "proposalId": "proposal_id",
    "proposalTitle": "Amazing DeFi Protocol",
    "author": "Proposer Name",
    "requestedFunds": "150,000 ADA",
    "dueDate": "2024-02-01T23:59:59.000Z",
    "status": "assigned",
    "reward": "50 REP",
    "tags": ["defi", "smart_contracts"]
  }
]
```

### GET /api/reviews/:id
Get specific review details.

**Response:**
```json
{
  "_id": "review_id",
  "proposalId": "proposal_id",
  "reviewerId": "user_id",
  "status": "in_progress",
  "assignment": {
    "assignedAt": "2024-01-15T10:00:00.000Z",
    "dueDate": "2024-02-01T23:59:59.000Z"
  },
  "reviewProgress": {
    "relevance": { "completed": true, "score": 2, "comment": "Well aligned" },
    "innovation": { "completed": false },
    "impact": { "completed": false },
    "feasibility": { "completed": false },
    "team": { "completed": false },
    "budget": { "completed": false }
  },
  "reviewerAssessment": {
    "expertiseLevel": 4,
    "temperatureCheck": "promising"
  },
  "proposal": {
    "_id": "proposal_id",
    "proposalTitle": "Amazing DeFi Protocol",
    "author": "Proposer Name",
    "metadata": {
      "summary": "AI-generated summary...",
      "tags": ["defi", "smart_contracts"],
      "budget": { "total": 150000 }
    }
  }
}
```

### POST /api/reviews/:id/assessment
Save reviewer assessment (expertise + temperature check).

**Request:**
```json
{
  "expertiseLevel": 4,
  "temperatureCheck": "promising",
  "qualityIssues": [],
  "qualityComment": ""
}
```

### POST /api/reviews/:id/category
Save category scoring and comments.

**Request:**
```json
{
  "category": "relevance",
  "score": 2,
  "comment": "Well aligned with challenge objectives. Clear connection to stated goals.",
  "completed": true
}
```

### POST /api/reviews/:id/submit
Submit completed review.

**Request:**
```json
{
  "overallComment": "Strong proposal with solid technical approach...",
  "recommendationsForImprovement": "Consider adding more detail on risk mitigation..."
}
```

### POST /api/reviews/:id/submit-early
Submit early exit review (low-quality proposals).

**Request:**
```json
{
  "qualityIssues": ["incomplete_proposal", "poor_budget_justification"],
  "overallComment": "Proposal lacks sufficient detail for evaluation."
}
```

## Peer Review Management

### GET /api/peer-reviews
Get assigned peer reviews for current user.

**Response:**
```json
[
  {
    "_id": "peer_review_id",
    "reviewId": "review_id",
    "proposalId": "proposal_id",
    "proposalTitle": "Amazing DeFi Protocol",
    "reviewerName": "Other Reviewer",
    "status": "pending",
    "dueDate": "2024-02-05T23:59:59.000Z",
    "reward": "15 REP",
    "estimatedTimeMinutes": 30
  }
]
```

### GET /api/peer-reviews/:id
Get peer review details with original review.

**Response:**
```json
{
  "_id": "peer_review_id",
  "reviewId": "review_id",
  "assignedTo": "user_id",
  "status": "pending",
  "originalReview": {
    "_id": "review_id",
    "proposalTitle": "Amazing DeFi Protocol",
    "reviewProgress": { ... },
    "overallComment": "Strong proposal...",
    "reviewer": {
      "username": "other_reviewer",
      "expertise": [...]
    }
  },
  "proposal": { ... }
}
```

### POST /api/peer-reviews/:id/submit
Submit peer review assessment.

**Request:**
```json
{
  "assessment": {
    "reviewQuality": "constructive",
    "scoringConsistency": "consistent",
    "feedbackHelpfulness": "very_helpful"
  },
  "comment": "Thorough review with helpful suggestions for improvement.",
  "overallRating": "excellent"
}
```

## Admin Endpoints

### GET /api/admin/stats
Get system statistics (admin only).

**Response:**
```json
{
  "totalUsers": 45,
  "approvedReviewers": 38,
  "pendingReviewers": 7,
  "totalReviews": 156,
  "completedReviews": 89,
  "totalPeerReviews": 134,
  "completedPeerReviews": 76,
  "pendingAssignmentRequests": 3
}
```

### GET /api/admin/users
Get all users with review statistics (admin only).

**Response:**
```json
[
  {
    "_id": "user_id",
    "email": "user@example.com",
    "username": "reviewer123",
    "reviewerStatus": "approved",
    "repPoints": 150,
    "reviews": {
      "assigned": 3,
      "in_progress": 1,
      "submitted": 5,
      "total": 9
    },
    "peerReviews": {
      "pending": 2,
      "completed": 8,
      "total": 10
    }
  }
]
```

### POST /api/admin/users/:id/approve
Approve pending reviewer (admin only).

**Response:**
```json
{
  "success": true,
  "message": "User approved successfully"
}
```

### POST /api/admin/users/:id/reject
Reject pending reviewer (admin only).

**Request:**
```json
{
  "reason": "Insufficient experience for current review requirements"
}
```

### GET /api/admin/proposal-overview
Get proposal statistics (admin only).

**Response:**
```json
[
  {
    "id": "proposal_id",
    "title": "Amazing DeFi Protocol",
    "author": "Proposer Name",
    "budget": 150000,
    "reviews": {
      "assigned": 3,
      "in_progress": 1,
      "submitted": 2,
      "total": 6
    },
    "peerReviews": {
      "pending": 4,
      "completed": 2,
      "total": 6
    },
    "reviewCompletion": 33.3,
    "peerReviewCompletion": 33.3
  }
]
```

### POST /api/admin/assign-reviews
Manually assign reviews (admin only).

**Request:**
```json
{
  "userId": "user_id",
  "count": 3,
  "simulation": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully assigned 3 reviews",
  "assignments": [
    {
      "proposalId": "proposal_id",
      "proposalTitle": "Amazing DeFi Protocol",
      "score": 185.5,
      "reason": "Interest match + urgent (2 tags)"
    }
  ]
}
```

### POST /api/admin/assign-peer-reviews
Manually assign peer reviews (admin only).

**Request:**
```json
{
  "userId": "user_id", 
  "count": 5,
  "simulation": false
}
```

## 📊 Data Export

### GET /api/admin/export-reviews
Export review data (admin only).

**Query Parameters:**
- `format`: `json` | `csv` (default: `json`)
- `status`: Filter by review status
- `startDate`: ISO date string
- `endDate`: ISO date string

**Response:**
CSV or JSON with complete review data including scores, comments, and metadata.

## System Health

### GET /health
Basic health check.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

### GET /api/health
Database connectivity check.

**Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

## 📈 Fund Information

### GET /api/fund/status
Get current fund information.

**Response:**
```json
{
  "fundNumber": 14,
  "name": "Cardano Use Cases: Partners & Products",
  "status": "review",
  "budget": {
    "total": 25000000,
    "currency": "ADA"
  },
  "timeline": {
    "reviewStart": "2024-01-01T00:00:00.000Z",
    "reviewEnd": "2024-02-15T23:59:59.000Z"
  },
  "isActive": true
}
```

## Error Responses

All endpoints return consistent error formats:

**400 Bad Request:**
```json
{
  "error": "Validation failed",
  "details": {
    "field": "username",
    "message": "Username is required"
  }
}
```

**401 Unauthorized:**
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "error": "Insufficient permissions"
}
```

**404 Not Found:**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "message": "Database connection failed"
}
```

## 🔄 Rate Limiting

- **General endpoints**: 100 requests/minute per IP
- **Authentication**: 10 requests/minute per IP
- **Admin endpoints**: 200 requests/minute per authenticated admin

Rate limit headers included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642234800
```

## Request/Response Examples

### Complete Review Submission Flow

1. **Get Review Details**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/reviews/review_id
```

2. **Save Assessment**
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expertiseLevel": 4, "temperatureCheck": "promising"}' \
  http://localhost:3001/api/reviews/review_id/assessment
```

3. **Save Category Scores**
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category": "relevance", "score": 2, "comment": "Well aligned", "completed": true}' \
  http://localhost:3001/api/reviews/review_id/category
```

4. **Submit Review**
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"overallComment": "Strong proposal", "recommendationsForImprovement": "Add risk analysis"}' \
  http://localhost:3001/api/reviews/review_id/submit
```

---

For implementation details and algorithm explanations, see [Assignment Algorithms](./algorithms.md).