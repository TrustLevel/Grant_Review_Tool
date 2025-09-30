// Fund14_analysis/5_expertise_validation.js
// Add default expertise validation scores to reviewer_data.json

// No database connection needed - works with existing JSON data

function addExpertiseValidation() {
  console.log('🎯 Adding default expertise validation scores\n');

  const fs = require('fs');

  // Load existing reviewer data
  let reviewerData;
  try {
    reviewerData = JSON.parse(fs.readFileSync('./Fund14_analysis/results/reviewer_data.json', 'utf8'));
  } catch (error) {
    console.error('❌ Error: reviewer_data.json not found. Please run files 1-3 first.');
    process.exit(1);
  }

  // Add default expertise validation (0.5) to all reviewers
  let reviewersUpdated = 0;
  Object.keys(reviewerData.reviewers).forEach(reviewerId => {
    const reviewer = reviewerData.reviewers[reviewerId];

    // Only add if not already present
    if (!reviewer.hasOwnProperty('expertiseValidation')) {
      reviewer.expertiseValidation = 0.5; // Default neutral score
      reviewersUpdated++;
    }
  });

  // Update timestamp
  reviewerData.timestamp = new Date();

  // Save back to file
  fs.writeFileSync('./Fund14_analysis/results/reviewer_data.json', JSON.stringify(reviewerData, null, 2));

  console.log(`✅ Added default expertise validation (0.5) to ${reviewersUpdated} reviewers`);
  console.log(`📊 Total reviewers in dataset: ${Object.keys(reviewerData.reviewers).length}`);
  console.log('\n💾 Results updated in results/reviewer_data.json');
  console.log('📝 You can manually edit expertiseValidation values (0.0-1.0) in the JSON file');

  // Show preview of reviewers with their current data
  console.log('\n=== REVIEWER PREVIEW ===');
  const reviewers = Object.entries(reviewerData.reviewers)
    .map(([id, data]) => ({ id, ...data }))
    .slice(0, 10);

  reviewers.forEach((reviewer, i) => {
    const components = [];
    if (reviewer.peerStats) components.push('Peer');
    if (reviewer.flagStats) components.push('Flag');
    if (reviewer.missStats) components.push('Miss');

    console.log(`${i + 1}. ${reviewer.name} - Expertise: ${reviewer.expertiseValidation} (Components: ${components.join(', ')})`);
  });
}

if (require.main === module) {
  addExpertiseValidation();
}

module.exports = { addExpertiseValidation };