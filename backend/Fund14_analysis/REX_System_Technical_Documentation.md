# REX System: Technical Documentation - Alpha Version

## Executive Summary

The **REX (Reputation-Expertise) System** is a sophisticated framework that transforms individual reviews into weighted, reliable proposal rankings through Bayesian modeling.

Unlike traditional averaging systems that treat all opinions equally, REX dynamically weighting reviewer contributions based on demonstrated expertise and historical performance.

---

# System Overview: Intelligent Proposal Evaluation

## The Problem with Traditional Averaging

Most proposal evaluation systems simply average reviewer scores, treating all opinions equally. This creates fundamental problems:

**Example**: Three reviewers evaluate a proposal
- Expert researcher with 10 years experience: Rating 6/10
- Novice with limited domain knowledge: Rating 9/10
- Unengaged reviewer who barely read it: Rating 8/10
- **Traditional average**: 7.7/10

The novice's overenthusiastic rating and the unengaged reviewer's superficial assessment carry the same weight as the expert's informed judgment. The result misleads decision-makers about true proposal quality.

## The REX Innovation: Reputation-Expertise Weighting

The REX system fundamentally changes this by asking: **"How much should we trust each reviewer's opinion?"**

Instead of equal weighting, REX calculates a dynamic trust score for each review based on two key factors:

**Reputation (R)**: How reliable has this reviewer been historically?
**Expertise (Ex)**: How qualified are they for this specific proposal?


## Three-Phase Intelligence System

### Phase 1: Reviewer Reputation Building
The system tracks three types of reviewer performance:
- **Peer Assessment Quality**: How well do other expert reviewers rate their review quality?
- **Proactive Quality Detection**: How accurately do they identify problematic proposals?
- **Consensus Awareness**: Do they catch quality issues that most other reviewers also identify?

These create a comprehensive reputation score that reflects real reviewing competence, not just participation.

### Phase 2: Review-Specific Expertise Scoring
For each individual review, the system evaluates:
- **Domain Match**: Does the reviewer's background align with the proposal's technical focus?
- **Confidence Level**: How confident is the reviewer in their assessment of this specific proposal?
- **Administrative Validation**: What do expert administrators think of this reviewer's capabilities?

The same reviewer might be highly qualified for defi proposals but less suited for governance proposals.

### Phase 3: Intelligent Proposal Aggregation
The system combines reviewer opinions using two independent channels:

**Quality Assessment**: Reviews with detailed scoring get weighted by reviewer trustworthiness and aggregated using Bayesian statistical methods that provide uncertainty estimates, not just point scores.

**Risk Detection**: All reviews are analyzed for warning signs (self-flagged concerns, reviewer expertise mismatches) to identify potentially problematic proposals regardless of their average scores.

## Bayesian Statistical Foundation

Unlike simple averaging, REX uses Bayesian methods that:
- **Handle Uncertainty**: Provide confidence intervals, not just single numbers
- **Robust Against Outliers**: Extreme opinions from unreliable reviewers get naturally downweighted
- **Data-Driven Learning**: The system improves as more review data becomes available
- **Prior Knowledge Integration**: Incorporates reasonable expectations while letting evidence dominate

Additionally, quality scores use generalized means rather than arithmetic averages, making the aggregation more sensitive to low-quality aspects when high-confidence reviewers are involved.

---

# Phase 1: Reviewer Reputation Calculation (R_profile)

The **Reviewer Reputation (R_profile)** is calculated through a three-component system with equal weighting:

```
R_profile = (Peer_Rep + Flag_Rep + Miss_Rep) / available_components
```

## Component 1: Peer Reputation (33% weight)

**Data Source**: Peer assessments on 3 criteria (specificity, clarity, insightful) rated [-3, +3]

### Step 1: Average Peer Score Calculation

For each reviewer, collect all peer assessments:
- Assessment 1: { specificity: 2, clarity: 1, insightful: 2 }
- Assessment 2: { specificity: -1, clarity: 0, insightful: 1 }
- ... more assessments

Calculate average per criterion, then overall average:
```
avgSpecificity = Σ(specificity) / n
avgClarity = Σ(clarity) / n
avgInsightful = Σ(insightful) / n
avgPeerScore = (avgSpecificity + avgClarity + avgInsightful) / 3
```

### Step 2: Bayesian Shrinkage

Normalize to [0,1] range:
```
normalizedScore = (avgPeerScore + 3) / 6  // [-3,3] → [0,1]
```

Bayesian parameters:
- prior = 0.5 (Neutral expectation)
- priorWeight = 2 (Conservative shrinkage)
- observationCount = totalPeerReviews

Bayesian posterior mean:
```
peerReputation = (prior × priorWeight + normalizedScore × observationCount) /
                 (priorWeight + observationCount)
```

**Example: Reviewer A**
```
avgPeerScore = 1.14
normalizedScore = (1.14 + 3) / 6 = 0.69
totalPeerReviews = 12
peerReputation = (0.5 × 2 + 0.69 × 12) / (2 + 12) = 9.28 / 14 = 0.663
```

## Component 2: Flag Reputation (33% weight)

**Data Source**: Reviews where reviewer flagged proposals as "low-quality"

### Step 1: Flag Precision
```
flagPrecision = confirmedFlags / totalFlagsRaised
```

### Step 2: Ramp-Up Factor
(Confidence adjustment for reviewers with few flags)
```
rampUpThreshold = 3
rampUp = 1 - e^(-flagsRaised / rampUpThreshold)
```

### Step 3: Flag Reputation
```
flagReputation = flagPrecision × rampUp
```

**Example: Reviewer A**
```
flagsRaised = 17, confirmedFlags = 17
flagPrecision = 17/17 = 1.0
rampUp = 1 - e^(-17/3) = 1 - e^(-5.67) ≈ 1.0
flagReputation = 1.0 × 1.0 = 0.997
```

## Component 3: Miss Reputation (33% weight)

**Data Source**: Reviewer's performance in detecting consensus low-quality proposals

### Step 1: Identify Consensus Low-Quality Proposals
For each proposal, calculate flag rate:
```
flagRate = reviewersWhoFlagged / totalReviewers
```

Proposals with ≥60% flag rate are "consensus low-quality":
```
consensusLowQuality = proposals.filter(p => p.flagRate >= 0.6)
```

### Step 2: Calculate Miss Rate per Reviewer
For each reviewer, count missed opportunities:
```
flagOpportunities = consensusProposals.reviewedByThisReviewer.length
missedFlags = flagOpportunities - proposalsFlaggedByReviewer
missRate = missedFlags / flagOpportunities
```

### Step 3: Miss Reputation
```
missReputation = 1 - missRate  // Perfect detection = 1.0, total miss = 0.0
```

**Example: Reviewer A**
```
flagOpportunities = 11  // Reviewed 11 consensus low-quality proposals
missedFlags = 0         // Correctly flagged all of them
missRate = 0/11 = 0.0
missReputation = 1 - 0.0 = 1.000
```

## Final R_profile Calculation

### Equal Weighting System

Collect available components:
1. If peerReputation exists: add to components with weight 1.0
2. If flagReputation exists: add to components with weight 1.0
3. If missReputation exists: add to components with weight 1.0

Normalize weights to sum to 1:
```
totalWeight = sum of all weights
normalizedWeights = each weight / totalWeight
```

Calculate weighted average:
```
R_profile = Σ(component × normalizedWeight)
```

### Example: Reviewer A (All 3 Components)
```
components = [0.663, 0.997, 1.000]  // [peer, flag, miss]
weights = [1.0, 1.0, 1.0]
normalizedWeights = [0.333, 0.333, 0.333]  // Equal weighting
R_profile = 0.663×0.333 + 0.997×0.333 + 1.000×0.333 = 0.886
```

### Example: Reviewer C (Flag + Miss only)
```
components = [0.649, 1.000]  // [flag, miss] - no peer data
weights = [1.0, 1.0]
normalizedWeights = [0.5, 0.5]
R_profile = 0.649×0.5 + 1.000×0.5 = 0.824
```

## Special Cases

### Miss-Only Baseline
For reviewers with only miss penalty data:
```
baselineReputation = 0.25  // Poor baseline for reviewers with minimal activity
components = [missReputation, baselineReputation]
weights = [1.0, 1.0]
```

### Data Validation Requirements
- **Peer Reputation**: Minimum 2 peer reviews required
- **Flag Reputation**: Minimum 1 flag raised required
- **Miss Reputation**: Minimum 1 consensus proposal reviewed required
- **Exclusion**: Reviewers with no valid data are excluded from system

---

# Phase 2: Review-Level REX Score Calculation

The **Review REX Score** combines reviewer reputation with review-specific expertise to generate a quality-weighted score for each individual review.

```
REX_i = √(R_profile × E_total)
```

## Expertise Calculation (E_total)

The expertise score is calculated using four weighted components:

```
E_total = 0.20×Self + 0.50×Admin + 0.20×Confidence + 0.10×ThemeMatch
```

### Component 1: Self Assessment (20% weight)

**Data Source**: Reviewer's onboarding expertise levels in technical and product domains

**Calculation**:
- Extract technical expertise level (1-5 scale)
- Extract product expertise level (1-5 scale)
```
avgOnboardingExpertise = (technical + product) / 2
self = (avgOnboardingExpertise - 1) / 4  // Normalize 1-5 → 0-1
```

**Example: Reviewer A**
```
technicalExpertise = 5, productExpertise = 5
avgOnboardingExpertise = (5 + 5) / 2 = 5.0
self = (5.0 - 1) / 4 = 1.000
```

### Component 2: Admin Validation (50% weight)

**Data Source**: Manual expert assessment of reviewer capability stored in reviewer database

**Calculation**:
```
adminValidation = expertiseValidation field from reviewer_data.json
Default value: 0.5 (neutral) if not set
Range: 0.0 (poor) to 1.0 (excellent)
```

**Example: Reviewer A**
```
adminValidation = 0.9  // manually set by administrators
```

### Component 3: Confidence (20% weight)

**Data Source**: Pre-review self-reported confidence level from reviewerAssessment

**Calculation**:
- Extract selfExpertiseLevel from review (1-5 scale)
```
confidence = (selfExpertiseLevel - 1) / 4  // Normalize 1-5 → 0-1
```

**Example: Reviewer A reviewing Proposal X**
```
selfExpertiseLevel = 5  // very confident
confidence = (5 - 1) / 4 = 1.000
```

### Component 4: Theme Match (10% weight)

**Data Source**: Binary match between reviewer interests and proposal domain tags

**Calculation**:
```
userInterests = reviewer's onboarding interest tags
proposalTags = proposal's metadata tags
themeMatch = userInterests.overlaps(proposalTags) ? 1.0 : 0.0
```

**Example: Reviewer A reviewing Proposal X**
```
userInterests = ["defi", "smart_contracts", "development_tools"]
proposalTags = ["defi", "smart_contracts"]
Match found: "defi" and "smart_contracts" both present
themeMatch = 1.0
```

## Final Expertise Score

**Example: Reviewer A reviewing Proposal X**
```
self = 1.000 (weight: 0.20)
adminValidation = 0.900 (weight: 0.50)
confidence = 1.000 (weight: 0.20)
themeMatch = 1.000 (weight: 0.10)

E_total = 0.20×1.000 + 0.50×0.900 + 0.20×1.000 + 0.10×1.000
E_total = 0.200 + 0.450 + 0.200 + 0.100 = 0.950
```

## REX Score Calculation

**Formula**:
```
REX_i = √(R_profile × E_total)
```

**Example: Reviewer A reviewing Proposal X**
```
R_profile = 0.886  // from reputation calculation
E_total = 0.950    // from expertise calculation above
REX = √(0.886 × 0.950) = √0.842 = 0.917
```

## Reliability and Effective Weight

### Reliability Calculation (Sigmoid Function)
```
reliability = 1 / (1 + e^(-4×(REX-0.5)))
```

This sigmoid function:
- REX = 0.5 → reliability = 0.5 (neutral)
- REX > 0.5 → exponentially higher reliability
- REX < 0.5 → exponentially lower reliability

**Example: Reviewer A's Proposal X Review**
```
REX = 0.917
reliability = 1 / (1 + e^(-4×(0.917-0.5))) = 1 / (1 + e^(-1.668)) = 0.842
```

### Effective Weight Calculation
```
effectiveWeight = 2 × reliability
```

**Example: Reviewer A's Proposal X Review**
```
reliability = 0.842
effectiveWeight = 2 × 0.842 = 1.683
```

## Quality Score Calculation

**Data Source**: Original detailed scores on 6 criteria (relevance, innovation, impact, feasibility, team, budget)

### Step 1: Normalize Criteria Scores
Convert each criterion from [-3, +3] to [0, 1]:
```
normalizedScore = (originalScore + 3) / 6
```

### Step 2: Reliability-Dependent Exponent
```
exponent = 0.6 + 1.2 × reliability
```

This makes the aggregation:
- More sensitive to low scores when reliability is high (punish outliers)
- More forgiving when reliability is low (geometric mean approach)

### Step 3: Generalized Mean
```
qualityScore = (Σ(normalizedScore^exponent) / 6)^(1/exponent)
```

**Example: Reviewer A reviewing Proposal X**
```
originalScores = {budget:1, feasibility:2, impact:1, innovation:0, relevance:2, team:2}
Normalized: [0.67, 0.83, 0.67, 0.50, 0.83, 0.83]
reliability = 0.842
exponent = 0.6 + 1.2×0.842 = 1.610
qualityScore = ((0.67^1.61 + 0.83^1.61 + 0.67^1.61 + 0.50^1.61 + 0.83^1.61 + 0.83^1.61) / 6)^(1/1.61) = 0.728
```

## Complete Review REX Object

**Example: Reviewer A's Review of Proposal X**

```json
{
  "reviewId": "68ade10537379d0c423faa9f",
  "reviewerId": "68adc353fb9e2c035447e770",
  "proposalTitle": "Proposal X",

  "expertise": {
    "self": 1.000,
    "adminValidation": 0.900,
    "confidence": 1.000,
    "themeMatch": 1.000,
    "total": 0.950
  },

  "rProfilePrior": 0.886,
  "rex": 0.917,
  "reliability": 0.842,
  "effectiveWeight": 1.683,
  "qualityScore": 0.728
}
```

---

# Phase 3: Proposal Aggregation

The **Final Proposal Score** aggregates multiple review REX scores through a sophisticated dual-channel Bayesian system that separates quality assessment from risk evaluation.

## Dual-Channel Architecture

### Quality Channel: "How good is this proposal?"
- Uses only reviews with detailed quality scores
- Bayesian Beta posterior for robust quality estimation
- Weighted by review reliability (REX-derived)

### Risk Channel: "How risky is this proposal?"
- Uses all reviews regardless of detailed scores
- Tracks self-flagging behavior vs. reviewer expertise
- Independent assessment of potential issues

## Quality Channel Calculation

### Step 1: Weighted Quality Aggregation

**Data Collection:**
```
For each review with qualityScore ≠ null:
  yi = review.qualityScore  (0-1 range)
  ki = review.effectiveWeight  (REX-derived)
```

**Weighted Sums:**
```
totalWeightedQuality = Σ(ki × yi)
totalWeight = Σ(ki)
```

### Step 2: Bayesian Beta Posterior

**Prior Parameters** (minimal shrinkage):
```
α_prior = 0.1
β_prior = 0.1
```

**Posterior Parameters:**
```
α = α_prior + totalWeightedQuality
β = β_prior + totalWeight - totalWeightedQuality
```

**Quality Score:**
```
Q = α / (α + β)
```

### Step 3: High-Quality Probability

**Calculation:**
```
p_high = 1 - BetaCDF(τ = 0.65, α, β)
```

Where BetaCDF is the cumulative distribution function of the Beta distribution evaluated at threshold τ = 0.65.

**Interpretation:** Probability that true proposal quality exceeds 65%

## Risk Channel Calculation

### Step 1: Flag and Counter Mass

**Flag Mass** (evidence of problems):
```
flagMass = 0
For each review:
  if review.temperatureCheck == 'low-quality':
    flagMass += review.effectiveWeight
```

**Counter Mass** (reviewer expertise defending proposal):
```
counterMass = 0
For each review:
  counterMass += review.expertise.total
```

### Step 2: Risk Beta Posterior

**Prior Parameters** (conservative - expect low risk):
```
a_prior = 1
b_prior = 4
```

**Posterior Parameters:**
```
a = a_prior + flagMass
b = b_prior + counterMass
```

**Risk Probability:**
```
p_low = a / (a + b)
```

**Interpretation:** Probability that proposal has quality issues

## Status Classification

### Quorum Check
```
hasQuorum = (reviewCount ≥ 3) OR (totalWeight ≥ 2.0)
```

### Classification Rules
```
if (hasQuorum AND p_high ≥ 0.60 AND p_low < 0.25):
    status = "HIGH"
elif (p_high < 0.40 OR p_low ≥ 0.50):
    status = "LOW"
else:
    status = "GREY"
```

### Ranking Score
```
rankingScore = 10 × Q × (1 - λ × p_low)
```

Where λ = 1.0 (risk aversion parameter)

## Complete Example: Proposal X

### Input Data
**4 Reviews with Quality Scores:**

| Reviewer | REX | Reliability | Weight | Quality Score | Self-Flagged |
|----------|-----|-------------|--------|---------------|--------------|
| Reviewer A | 0.842 | 0.797 | 1.594 | 0.728 | No |
| Reviewer B | 0.677 | 0.670 | 1.340 | 0.701 | No |
| Reviewer C | 0.584 | 0.584 | 1.167 | 1.000 | No |
| Reviewer D | 0.338 | 0.343 | 0.686 | 0.945 | No |

**Expertise Totals:**
- Reviewer A: 0.950, Reviewer B: 0.550, Reviewer C: 0.600, Reviewer D: 0.325

### Quality Channel Calculation

**Step 1: Weighted Aggregation**
```
totalWeightedQuality = 1.594×0.728 + 1.340×0.701 + 1.167×1.000 + 0.686×0.945
                     = 1.160 + 0.939 + 1.167 + 0.648 = 3.914

totalWeight = 1.594 + 1.340 + 1.167 + 0.686 = 4.787
```

**Step 2: Beta Posterior**
```
α = 0.1 + 3.914 = 4.014
β = 0.1 + 4.787 - 3.914 = 0.973

Q = 4.014 / (4.014 + 0.973) = 0.805
```

**Step 3: High-Quality Probability**
```
p_high = 1 - BetaCDF(0.65, 4.014, 0.973) = 0.633
```

### Risk Channel Calculation

**Step 1: Mass Calculation**
```
flagMass = 0  // No reviews flagged as 'low-quality'

counterMass = 0.950 + 0.550 + 0.600 + 0.325 = 2.425
```

**Step 2: Risk Posterior**
```
a = 1 + 0 = 1
b = 4 + 2.425 = 6.425

p_low = 1 / (1 + 6.425) = 0.135
```

### Final Classification

**Status Determination:**
```
hasQuorum = true  (4 reviews ≥ 3)
p_high = 0.633 ≥ 0.60 ✓
p_low = 0.135 < 0.25 ✓

→ status = "HIGH"
```

**Ranking Score:**
```
rankingScore = 10 × 0.805 × (1 - 1.0 × 0.135) = 8.05 × 0.865 = 6.96 ≈ 7.0
```

## Complete Proposal Result Object

```json
{
  "proposalTitle": "Proposal X",
  "reviewCount": 4,
  "totalWeight": 4.787,
  "qualityScore": 0.805,
  "pHigh": 0.633,
  "pLow": 0.135,
  "disagreement": 0.015,
  "status": "HIGH",
  "rankingScore": 7.0,

  "betaPosterior": { "alpha": 4.014, "beta": 0.973 },
  "riskPosterior": { "a": 1, "b": 6.425 },

  "reviews": [
    {
      "reviewerId": "68adc353fb9e2c035447e770",
      "rex": 0.842,
      "reliability": 0.797,
      "qualityScore": 0.728,
      "effectiveWeight": 1.594
    }
    // ... other reviews (anonymized)
  ]
}
```

---

# Key Advantages & Design Principles

## Advantages Over Traditional Systems

### Gaming Resistance
- Reviewers can't inflate scores without building genuine expertise
- Self-aware poor reviewers who honestly flag their limitations get credit for honesty
- System rewards quality over quantity of reviews

### Fair Incentivization
- Expert reviewers see their opinions carry appropriate weight
- Poor reviewers face natural consequences for low-quality work
- Creates incentives for reviewer skill development

### Transparent Uncertainty
- Decision-makers see confidence levels, not just final scores
- Risk assessments highlight potential concerns
- Bayesian posteriors quantify evaluation certainty

### Adaptive Intelligence
- System learns from reviewer track records
- Expertise matching improves over time
- New reviewers get fair opportunities to build reputation

## Core Design Principles

### 1. Review-Specific Adaptation
- Same reviewer gets different REX scores for different proposals
- Expertise varies based on domain match and confidence level
- Quality assessment reflects actual review content

### 2. Exponential Reliability Scaling
- High REX scores (>0.5) get exponentially more influence
- Low REX scores (<0.5) get exponentially less influence
- Creates strong incentives for reviewer quality improvement

### 3. Bayesian Robustness
- Minimal shrinkage priors let data dominate while providing stability
- Uncertainty quantification through posterior distributions
- Handles varying numbers of reviews per proposal gracefully

### 4. Dual-Channel Independence
- Quality assessment separate from risk evaluation
- Self-flagging detection independent of detailed scoring
- Prevents gaming through single-channel manipulation

### 5. Conservative Classification
- HIGH status requires both high quality probability (≥60%) AND low risk (≤25%)
- Strict thresholds ensure only truly exceptional proposals get top rating
- Three-tier system (HIGH/GREY/LOW) provides nuanced classification

## Beyond Simple Democracy

Traditional evaluation treats all opinions as equal votes in a democracy. REX recognizes that expertise matters—it's more like a weighted council where expert voices carry influence proportional to their demonstrated knowledge and reliability.

This doesn't create unfair hierarchies. Any reviewer can build reputation through consistently good work. But it prevents the common scenario where uninformed enthusiasm drowns out expert caution, or where gaming the system through volume undermines quality assessment.

The result is **intelligent aggregation** that preserves the benefits of diverse perspectives while ensuring that expertise and track record matter in the final evaluation.

---

# Technical Implementation

## Mathematical Foundation

The REX system is built on rigorous mathematical principles:

- **Bayesian Statistics**: For uncertainty quantification and robust parameter estimation
- **Sigmoid Functions**: For smooth, exponential reliability scaling
- **Generalized Means**: For context-sensitive quality score aggregation
- **Beta Distributions**: For principled probability modeling with conjugate priors

## System Requirements

### Data Requirements
- Reviewer peer assessment history (minimum 2 assessments per reviewer)
- Proposal flagging behavior and outcomes
- Review content with detailed criteria scoring
- Reviewer domain expertise and confidence self-reports

### Computational Complexity
- **Phase 1**: O(n) where n = number of reviewers
- **Phase 2**: O(r) where r = number of reviews
- **Phase 3**: O(p×r_p) where p = proposals, r_p = reviews per proposal

### Scalability
- Designed for 10-1000 reviewers
- Handles 100-10000 reviews efficiently
- Supports 10-1000 proposals per evaluation round

## Integration Benefits

**For Review Systems:**
- Automated quality control reduces manual oversight burden
- Fair incentivization rewards good reviewers, penalizes poor performance
- Robust rankings resistant to gaming and manipulation
- Transparent methodology with auditable calculations

**For Proposal Evaluation:**
- Weighted consensus where expert opinions carry appropriate influence
- Risk assessment flags potentially problematic proposals
- Confidence intervals provide uncertainty quantification via Bayesian posteriors
- Scalable framework handles varying numbers of reviews per proposal

The system transforms **subjective, variable-quality reviews** into **objective, mathematically-grounded proposal rankings** while maintaining fairness and transparency throughout the evaluation process.