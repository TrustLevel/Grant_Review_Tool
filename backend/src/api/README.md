# Catalyst API Documentation

- Last Updated: 2026-01-23

This document maps the official Catalyst proposal structure to our internal Proposal model and compares it with what's available through the Catalyst Explorer API.
---

## 1a. Official Catalyst Proposal Structure

### Data as shown on the official Catalyst website (projectcatalyst.io)

#### Proposal Setup
```
- Proposal Title: string
- Problem Statement: text
- Solution Statement: text
- Budget Information: number (in ADA)
- Time: number (in months)
- Theme: string (e.g., "AI", "DeFi", "Governance")
```

#### Proposal Metadata
```
- Translation Information:
  - Auto-translated: boolean
  - Original Language: string (ISO code)
- Supporting Documentation: array of URLs
- Project Dependencies:
  - Has dependencies: boolean
  - Description: text
- Project Open Source:
  - Is open source: boolean
  - IP details: text
```

#### Campaign Category Questions 
```
- Established collaborations: text
- Funding commitments: text
- Key performance metrics: text
```

#### Your Project and Solution
```
- Solution: text (detailed description)
- Impact: text (positive impact on Cardano community)
- Capabilities & Feasibility: text
```

#### Milestones
```
Array of milestones, each containing:
- Milestone Title: string
- Milestone Outputs: text
- Acceptance Criteria: text
- Evidence of Completion: text
- Delivery Month: number
- Cost: number (in ADA)
- Progress: percentage
```

#### Final Pitch
```
- Budget & Costs: text (detailed breakdown)
- Value for Money: text (justification)
```

#### Self-Assessment
```
- Checklist of confirmations (varies by challenge)
```

#### Team (for each team member)
````
- Name
- Position
- Links
- Catalyst Profile ID
```

## 1b. Challenge/Category Data Structure

### Data as shown on the official Catalyst website

#### Challenge Overview
```
- Title: string (e.g., "Cardano Partners: Tier-1 Enterprise Integrations")
- Goal/Description: text (short description of the challenge purpose)
- Total Budget: number (in ADA)
```

#### About This Category
```
- Overview: text (detailed description of the challenge)
- Budget & Constraints: text (budget details and rules)
- Areas of Interest: array of text (bulleted list of focus areas)
- Core Eligibility: text (who can apply, detailed requirements)
- Defining Criteria: text (e.g., "Defining a Tier-1 Enterprise")
- Proposal Requirements: array of requirements with:
  - Requirement title: string
  - Requirement description: text
```

---

## 1c. Additional Information

Data NOT part of official Catalyst platform, but implemented as custom tool features.

### AI Summary (Implementation already done by TrustLevel)

```
{
  aiSummary: String,              // Generated summary text
  aiSummaryGeneratedAt: Date      // Timestamp when generated
}
```

---

### Proposer / Team Statistics (TBD - from Catalyst Explorer data)

To be implemented - will show:
- Number of submitted proposals (overall/this fund)
- Number of completed proposals
- Number of open proposals
- Success rate

---

### Official Catalyst Review Data (TBD - could be separate API)
- Community reviews per proposal
- Reviewer IDs

---

## 2. Fund 13 Catalyst Explorer API Structure

**Base URL:** `https://www.catalystexplorer.com/api/v1/proposals`

### Actual API Response

```json
{
  "data": [
    {
      "id": "string (UUID)",
      "title": "string",
      "slug": "string",
      "category": "string | null",
      "status": "complete | unfunded | pending",
      "funding_status": "funded | over_budget | not_approved | pending",
      "yes_votes_count": "number | null",
      "abstain_votes_count": "number | null",
      "no_votes_count": "number | null",
      "amount_requested": "number",
      "amount_received": "number | null",
      "currency": "USD | ADA",
      "problem": "string",
      "solution": "string",
      "experience": "string",
      "website": "string | null",
      "quickpitch": "string | null",
      "project_length": "number | null",
      "opensourced": "boolean | null",
      "funded_at": "ISO date string | null",
      "link": "string (URL to proposal page)",
      "campaign": {
        "id": "string (UUID)",
        "title": "string",
        "slug": "string",
        "excerpt": "string",
        "amount": "number",
        "launched_at": "ISO date string",
        "awarded_at": "ISO date string | null",
        "color": "string | null",
        "label": "string"
      },
      "team": [
        {
          "id": "string (UUID)",
          "ideascale_id": "number | null",
          "catalyst_id": "string | null",
          "username": "string | null",
          "name": "string",
          "bio": "string | null",
          "title": "string | null",
          "proposals_count": "number | null",
          "hero_img_url": "string | null"
        }
      ],
      "schedule": "object | null"
    }
  ],
}
```


---

## 3a. Proposal Field Mapping

### Official Catalyst Website (Section 1a) → Explorer API (Section 2) → Our Model

| Official Website Field | Explorer API Field | Our Model Field | API Status |
|------------------------|-------------------|-----------------|------------|
| **Proposal Setup** |
| Proposal Title | `title` | `proposalTitle` | ✅ Available |
| Problem Statement | `problem` | `content.problemStatement` | ✅ Available |
| Solution Statement | `solution` | `content.solutionSummary` | ✅ Available |
| Budget Information | `amount_requested` | `budget.total` | ✅ Available |
| Time (months) | `project_length` | `budget.duration.months` | ✅ Available |
| Theme | ❌ Not in API | `metadata.theme` | ❌ Missing |
| **Proposal Metadata** |
| Auto-translated | ❌ Not in API | `metadata.translation.needed` | ❌ Missing |
| Original Language | ❌ Not in API | `metadata.translation.originalLanguage` | ❌ Missing |
| Supporting Documentation | `website`, `link` | `content.supportingDocs[]` | ⚠️ Partial (2 URLs max) |
| Dependencies: Has | ❌ Not in API | N/A | ❌ Missing |
| Dependencies: Description | ❌ Not in API | `content.dependencies` | ❌ Missing |
| Open Source: Is Open | `opensourced` | `content.openSource.isOpen` | ⚠️ Partial (boolean only) |
| Open Source: IP Details | ❌ Not in API | `content.openSource.license` | ❌ Missing |
| **Campaign Category Questions** |
| Established collaborations | ❌ Not in API | N/A | ❌ Missing |
| Funding commitments | ❌ Not in API | N/A | ❌ Missing |
| Key performance metrics | ❌ Not in API | N/A | ❌ Missing |
| **Your Project and Solution** |
| Solution (detailed) | `solution` | `content.solution` | ⚠️ Partial (only as full proposal text) |
| Impact | ❌ Not in API | `content.impact` | ⚠️ Partial (only as full proposal text) |
| Capabilities & Feasibility | `experience` | `content.feasibility` | ⚠️ Partial (only as full proposal text) |
| **Milestones** |
| Milestone Title | `schedule.milestones[]?` | `milestones[].title` | ⚠️ Usually null |
| Milestone Outputs | ❌ Not in API | `milestones[].outputs` | ❌ Missing |
| Acceptance Criteria | ❌ Not in API | `milestones[].acceptanceCriteria` | ❌ Missing |
| Evidence of Completion | ❌ Not in API | `milestones[].evidence` | ❌ Missing |
| Delivery Month | ❌ Not in API | `milestones[].deliveryMonth` | ❌ Missing |
| Cost | ❌ Not in API | `milestones[].cost` | ❌ Missing |
| Progress | ❌ Not in API | `milestones[].progress` | ❌ Missing |
| **Final Pitch** |
| Budget & Costs | ❌ Not in API | N/A | ❌ Missing |
| Value for Money | ❌ Not in API | `budget.valueForMoney` | ❌ Missing |
| **Self-Assessment** |
| Checklist confirmations | ❌ Not in API | N/A | ❌ Missing |
| **Team** |
| Name | `team[].name` | `team[].name` | ✅ Available |
| Position | `team[].title` | `team[].role` | ✅ Available |
| Links | ❌ Not in API | `team[].linkedin`, `team[].github` | ❌ Missing |
| Catalyst Profile ID | `team[].catalyst_id` | N/A | ✅ Available (currently unused) |


---

## 3b. Challenge/Category Field Mapping

### Official Catalyst Website (Section 1b) → Explorer API (Section 2) → Our Challenge Model

**Note:** Challenge data was manually added in Fund 13 (not imported via API).

| Official Website Field | Explorer API Field | Our Model Field | API Status |
|------------------------|-------------------|-----------------|------------|
| **Challenge Overview** |
| Title | `campaign.title` | `name` | ✅ Available |
| Goal/Description | `campaign.excerpt` | `description` | ⚠️ Partial (short excerpt only) |
| Total Budget | `campaign.amount` | `budget.amount` | ✅ Available |
| **About This Category** |
| Overview (full text) | ❌ Not in API | `overview` | ❌ Missing |
| Budget & Constraints | ❌ Not in API | Part of `overview` | ❌ Missing |
| Areas of Interest | ❌ Not in API | `areasOfInterest[]` | ❌ Missing |
| Core Eligibility | ❌ Not in API | `whoShouldApply` | ❌ Missing |
| Defining Criteria | ❌ Not in API | Part of `overview` | ❌ Missing |
| Proposal Requirements | ❌ Not in API | `proposalGuidance[]` | ❌ Missing |


---

## 3c. Additional Information Field Mapping

### Our Custom Features (Section 1c) → Explorer API (Section 2)

| Feature from 1c | Explorer API Field | Our Model Field | API Status |
|-----------------|-------------------|-----------------|------------|
| **AI Summary** |
| AI Summary Text | ❌ Not in API | `aiSummary` | ✅ Available (via TrustLevel) |
| Generation Timestamp | ❌ Not in API | `aiSummaryGeneratedAt` | ✅ Available (vie TrustLevel) |
| **Proposer/Team Statistics (TBD)** |
| Submitted proposals (overall) | ❌ Not in API | N/A | ❌ Missing |
| Submitted proposals (this fund) | ❌ Not in API | N/A | ❌ Missing |
| Completed proposals | ❌ Not in API | N/A | ❌ Missing |
| Open proposals | ❌ Not in API | N/A | ❌ Missing |
| **Official Catalyst Review Data (TBD)** |
| Community reviews per proposal | ❌ Not in API | N/A | ❌ Missing |
| Reviewer IDs | ❌ Not in API | N/A | ❌ Missing |


---
- Catalyst Explorer API: https://www.catalystexplorer.com/api/v1/proposals
- Official Catalyst Platform: https://projectcatalyst.io