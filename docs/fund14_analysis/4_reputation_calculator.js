// Fund14_analysis/4_reputation_calculator.js

// Reputation calculation per reviewer

const fs = require('fs');

function calculateReputation() {
  console.log('🧮 Calculating Reviewer Reputation Scores\n');

  // Load unified reviewer data
  const reviewerData = JSON.parse(fs.readFileSync('./Fund14_analysis/results/reviewer_data.json', 'utf8'));


  // Process all reviewers from unified data
  Object.keys(reviewerData.reviewers).forEach(reviewerId => {
    const reviewer = reviewerData.reviewers[reviewerId];
    const peerStats = reviewer.peerStats;
    const flagStats = reviewer.flagStats;
    const missStats = reviewer.missStats;

    // Skip reviewers without any reputation data
    if (!peerStats && !flagStats && !missStats) {
      console.log(`⏭️  Skipping ${reviewer.name} - no reputation data`);
      return;
    }

    let components = [];
    let weights = [];
    let componentScores = {};

    // 1. Peer Reputation Component (only if has peer data)
    if (peerStats && peerStats.totalPeerReviews > 0) {
      // Less aggressive Bayesian shrinkage
      const normalizedScore = (peerStats.avgPeerScore + 3) / 6; // [-3,3] → [0,1]
      const prior = 0.5;
      const priorWeight = 2; // Reduced from 5 to 2
      const observationCount = peerStats.totalPeerReviews;

      const peerReputation = (prior * priorWeight + normalizedScore * observationCount) / (priorWeight + observationCount);

      components.push(peerReputation);
      weights.push(1.0);
      componentScores.peerReputation = Math.round(peerReputation * 1000) / 1000;
    }

    // 2. Flag Reputation Component (only if has flag data)
    if (flagStats && flagStats.flagsRaised > 0) {
      const flagPrecision = flagStats.flagPrecision;

      // Ramp-up factor
      const rampUpThreshold = 3;
      const rampUp = 1 - Math.exp(-flagStats.flagsRaised / rampUpThreshold);

      const flagReputation = flagPrecision * rampUp;

      components.push(flagReputation);
      weights.push(1.0);
      componentScores.flagReputation = Math.round(flagReputation * 1000) / 1000;
    }

    // 3. Miss Penalty Component (if has miss data)
    if (missStats && missStats.flagOpportunities > 0) {
      const missReputation = missStats.missPenalty; // Direct penalty score

      components.push(missReputation);
      weights.push(1.0);
      componentScores.missReputation = Math.round(missReputation * 1000) / 1000;
    }

    // 4. Miss-only Baseline Component (if no other data but has miss data)
    if (components.length === 1 && componentScores.missReputation !== undefined && !componentScores.peerReputation && !componentScores.flagReputation) {
      // Miss-only reviewers get poor baseline reputation
      const baselineReputation = 0.25; // Poor baseline (bottom quartile)

      components.push(baselineReputation);
      weights.push(1.0);
      componentScores.missOnlyBaseline = Math.round(baselineReputation * 1000) / 1000;

      console.log(`   ${reviewer.name} - Miss-only: baseline ${baselineReputation} + miss penalty ${missStats.missPenalty.toFixed(2)}`);
    }

    // Skip if still no valid components
    if (components.length === 0) {
      console.log(`⏭️  Skipping ${reviewer.name} - no reputation data at all`);
      return;
    }

    // Calculate weighted average of available components
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);

    const finalReputation = components.reduce((sum, score, i) => sum + score * normalizedWeights[i], 0);

    // Add reputation data directly to the existing reviewer in reviewerData
    reviewerData.reviewers[reviewerId].reputationScore = Math.round(finalReputation * 1000) / 1000;
    reviewerData.reviewers[reviewerId].reputationComponents = componentScores;
    reviewerData.reviewers[reviewerId].availableComponents = components.length;
    reviewerData.reviewers[reviewerId].weightInfo = weights.map(w => w.toFixed(2)).join('/');
  });

  // Display results
  console.log('\n=== REVIEWER REPUTATION SCORES (Quality-Adjusted Weighting) ===');
  console.log('Reviewer\t\tComponents\tPeer\tFlag\tWeights\tFinal');
  console.log('─'.repeat(70));

  const sortedReviewers = Object.entries(reviewerData.reviewers)
    .filter(([id, reviewer]) => reviewer.reputationScore !== undefined)
    .map(([id, reviewer]) => ({ id, ...reviewer }))
    .sort((a, b) => b.reputationScore - a.reputationScore);

  sortedReviewers.forEach(data => {
    const name = data.name.substring(0, 15).padEnd(15);
    const comps = data.availableComponents.toString().padStart(10);
    const peer = (data.reputationComponents?.peerReputation || 'N/A').toString().padStart(4);
    const flag = (data.reputationComponents?.flagReputation || 'N/A').toString().padStart(4);
    const weights = data.weightInfo || 'N/A';
    const final = data.reputationScore.toFixed(3).padStart(5);

    console.log(`${name}\t${comps}\t${peer}\t${flag}\t${weights}\t${final}`);
  });

  // Update timestamp and add methodology info
  reviewerData.timestamp = new Date();
  reviewerData.reputationMethodology = {
    description: 'Reviewer Reputation - no defaults, only real data',
    changes: [
      'Reduced Bayesian prior weight from 5 to 2',
      'Changed prior from 0.6 to 0.5 (neutral)',
      'No default values - skip reviewers without data',
      'Keep miss penalty hard as requested',
      'Quality-Adjusted Dynamic Weighting: (reviews × reliability) / 10',
      'Miss-only reviewers get baseline 0.25 × missPenalty (poor but fair)'
    ]
  };

  const reviewersWithReputation = sortedReviewers.length;
  const reviewersSkipped = reviewerData.totalReviewers - reviewersWithReputation;

  // Save back to unified reviewer_data.json
  fs.writeFileSync('./Fund14_analysis/results/reviewer_data.json', JSON.stringify(reviewerData, null, 2));

  console.log(`\n💾 Results saved to results/reviewer_data.json`);
  console.log(`📊 ${reviewersWithReputation} reviewers with reputation scores`);
  console.log(`⏭️  ${reviewersSkipped} reviewers skipped (no data)`);

  // Show comparison with top performers
  console.log('\n=== TOP 5 PERFORMERS ===');
  sortedReviewers.slice(0, 5).forEach((reviewer, i) => {
    const peer = reviewer.reputationComponents?.peerReputation || 'N/A';
    const flag = reviewer.reputationComponents?.flagReputation || 'N/A';
    console.log(`${i+1}. ${reviewer.name}: ${reviewer.reputationScore} (Peer: ${peer}, Flag: ${flag})`);
  });

  return reviewerData;
}

if (require.main === module) {
  calculateReputation();
}

module.exports = { calculateReputation };