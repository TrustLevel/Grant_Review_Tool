# REX System: TL;DR

## What is REX?
The **REX (Reputation-Expertise) System** replaces simple averaging with intelligent weighting based on reviewer track record and expertise. Instead of treating all opinions equally, REX asks: "How much should we trust each reviewer's opinion?"

## The Problem REX Solves
**Traditional systems**: Expert (6/10) + Novice (9/10) + Unengaged (8/10) = 7.7/10 average
**REX approach**: Expert opinion gets more weight, final score reflects actual quality

## How It Works (3 Phases)

### Phase 1: Reviewer Reputation (R_profile)
**Equal weighting of 3 components (33% each):**

1. **Peer Reputation**: How do other expert reviewers rate their review quality?
   - Formula: Bayesian shrinkage of peer scores [-3,+3] → [0,1]

2. **Flag Reputation**: How accurately do they identify problematic proposals?
   - Formula: `Precision × (1-e^(-flags/3))`

3. **Miss Reputation**: Do they catch consensus low-quality proposals (≥60% flagged)?
   - Formula: `1 - missRate`

4. **Addition for next version: Historical Accuracy**: How good was the reviewer in the past?
   - Formula not part of the alpha verison due to lack of real data

### Phase 2: Review-Level REX Score
**For each individual review:**
```
REX = √(R_profile × E_total)
```

**Expertise (E_total) = weighted combination:**
- 20% Self-assessment (onboarding expertise)
- 50% Expertise validation
- 20% Confidence (pre-review self-confidence)
- 10% Theme match (interests ∩ proposal tags)

(That part will be replaced/complemented with a more robust "endorsement" approach)

### Phase 3: Proposal Aggregation
**Dual-channel Bayesian system:**

**Quality Channel**: Reviews with detailed scores
- Weighted by reviewer reliability: `2 × sigmoid(REX)`
- Beta posterior: `Q = α/(α+β)` where α = weighted quality sum
- Confidence: `p_high = P(quality > 65%)`

**Risk Channel**: All reviews (independent)
- Flag mass vs. expertise counter-mass
- Risk probability: `p_low = flags/(flags + expertise)`

**Final Classification:**
- **HIGH**: p_high ≥ 60% AND p_low < 25% AND ≥3 reviews
- **LOW**: p_high < 40% OR p_low ≥ 50%
- **GREY**: Everything else

## Key Mathematical Features

- **Bayesian Statistics**: Provides confidence intervals, not just point estimates
- **Sigmoid Reliability**: `1/(1+e^(-4×(REX-0.5)))` - exponential scaling for high/low performers
- **Generalized Means**: Context-sensitive aggregation (harsh when reliable reviewers involved)
- **Gaming Resistance**: Multiple independent components, self-aware flagging rewarded

## Real-World Performance (Fund14)

- **14 reviewers** processed (reputation range: 0.111 - 0.886)
- **105 reviews** with REX scores (+9.7% improvement vs. traditional)
- **27 proposals** classified: 1 HIGH, 5 GREY, 21 LOW
- **51% self-flagging rate** shows functional risk detection

**Example Results:**
- Top reviewer gets 2.3× more weight than weakest reviewer
- Only 1/27 proposals achieved HIGH status (strict classification)
- System successfully differentiates reviewer quality

## Why It Matters

✅ **Expert opinions carry appropriate weight**
✅ **Poor reviewers face natural consequences**
✅ **Self-aware reviewers get credit for honesty**
✅ **Robust against gaming and manipulation**
✅ **Provides uncertainty quantification**
✅ **Scales efficiently with data volume**

**Bottom Line**: REX transforms subjective, variable-quality reviews into objective, mathematically-grounded proposal rankings while maintaining fairness and transparency.