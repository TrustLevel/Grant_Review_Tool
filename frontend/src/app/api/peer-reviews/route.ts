// src/app/api/peer-reviews/route.ts

// Mock data for submitted reviews that need peer assessment
const mockSubmittedReviews = {
  "review-1": {
    id: "review-1",
    proposalId: "1200193",
    proposalTitle: "DeFi Integration Proposal",
    reviewerId: "reviewer-123",
    reviewerName: "Sarah K.",
    submittedAt: "2025-01-08T10:00:00Z",
    expertise: 4,
    temperatureCheck: "promising",
    ratings: {
      relevance: {
        score: 2,
        comment: "The proposal directly addresses the challenge goals by providing a comprehensive DeFi integration solution. The alignment with Cardano's ecosystem needs is clear."
      },
      innovation: {
        score: 2,
        comment: "The proposal demonstrates innovative thinking in its approach to DeFi integration. The use of novel consensus mechanisms and cross-chain compatibility shows clear understanding of current limitations and provides unique solutions."
      },
      impact: {
        score: 3,
        comment: "Significant potential impact on the Cardano ecosystem. The proposed solution could onboard thousands of new users and increase TVL substantially."
      },
      feasibility: {
        score: 1,
        comment: "The timeline seems optimistic given the technical complexity. Some milestones may need adjustment, particularly the integration testing phase."
      },
      team: {
        score: 2,
        comment: "Strong team with proven track record in DeFi development. Previous projects show capability to deliver, though scaling concerns should be addressed."
      },
      budget: {
        score: 0,
        comment: "Budget allocation needs more detailed breakdown. Marketing costs seem underestimated for the scope of the project."
      }
    }
  },
  "review-2": {
    id: "review-2",
    proposalId: "1200194",
    proposalTitle: "Community Education Platform",
    reviewerId: "reviewer-456",
    reviewerName: "Alex M.",
    submittedAt: "2025-01-07T14:30:00Z",
    expertise: 3,
    temperatureCheck: "promising",
    ratings: {
      relevance: {
        score: 3,
        comment: "Perfectly aligned with the education challenge. Addresses the critical need for accessible Cardano education."
      },
      innovation: {
        score: 1,
        comment: "Good approach but not particularly innovative. Similar platforms exist in other ecosystems."
      },
      impact: {
        score: 2,
        comment: "Will definitely help onboard new users, though impact metrics could be better defined."
      },
      feasibility: {
        score: 2,
        comment: "Realistic timeline and clear milestones. Team has experience with similar projects."
      },
      team: {
        score: 1,
        comment: "Competent team but lacks blockchain-specific educational experience."
      },
      budget: {
        score: 1,
        comment: "Reasonable budget allocation with good cost breakdown."
      }
    }
  },
  "review-3": {
    id: "review-3",
    proposalId: "1200195",
    proposalTitle: "Smart Contract Audit Tool",
    reviewerId: "reviewer-789",
    reviewerName: "John D.",
    submittedAt: "2025-01-09T09:15:00Z",
    expertise: 5,
    temperatureCheck: "low-quality",
    temperatureCheckIssues: ["Incomplete", "Unclear Scope"],
    temperatureCheckComment: "The proposal lacks technical details about the audit methodology",
    ratings: {
      relevance: {
        score: 1,
        comment: "While security is important, the proposal doesn't clearly address the specific challenge requirements."
      },
      innovation: {
        score: -1,
        comment: "The proposed solution is too similar to existing tools. No clear differentiation or improvement."
      },
      impact: {
        score: 0,
        comment: "Limited impact potential. Target audience seems too narrow."
      },
      feasibility: {
        score: -2,
        comment: "Unrealistic timeline for the complexity involved. No clear technical roadmap."
      },
      team: {
        score: 0,
        comment: "Team credentials are not clearly presented. Missing key expertise areas."
      },
      budget: {
        score: -1,
        comment: "Budget seems inflated for the deliverables. No clear justification for costs."
      }
    }
  }
};

// Mock peer review assignments
const mockPeerReviewAssignments = [
  {
    id: "peer-1",
    reviewId: "review-1",
    proposalId: "1200193",
    proposalTitle: "DeFi Integration Proposal",
    reviewerName: "Sarah K.",
    assignedTo: "user-1",
    status: "pending",
    dueDate: "1 day",
    reward: " REP5"
  },
  {
    id: "peer-2",
    reviewId: "review-2",
    proposalId: "1200194",
    proposalTitle: "Community Education Platform",
    reviewerName: "Alex M.",
    assignedTo: "user-1",
    status: "pending",
    dueDate: "2 days",
    reward: " REP5"
  },
  {
    id: "peer-3",
    reviewId: "review-3",
    proposalId: "1200195",
    proposalTitle: "Smart Contract Audit Tool",
    reviewerName: "John D.",
    assignedTo: "user-1",
    status: "completed",
    dueDate: "Completed",
    reward: " REP5"
  }
];

// Mock proposal data (simplified version for peer review context)
const mockProposalData = {
  "1200193": {
    id: "1200193",
    title: "DeFi Integration Proposal",
    author: "Cardano Labs",
    requestedFunds: " REP45,000",
    summary: "This proposal aims to integrate advanced DeFi capabilities into the existing Cardano infrastructure...",
    tags: ["DeFi", "Integration"]
  },
  "1200194": {
    id: "1200194",
    title: "Community Education Platform",
    author: "Education Team",
    requestedFunds: " REP28,000",
    summary: "A comprehensive platform for educating the Cardano community about blockchain technology...",
    tags: ["Education", "Community"]
  },
  "1200195": {
    id: "1200195",
    title: "Smart Contract Audit Tool",
    author: "Security Labs",
    requestedFunds: " REP35,000",
    summary: "Advanced tooling for auditing smart contracts on the Cardano blockchain...",
    tags: ["Smart Contracts", "Security"]
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  // If an ID is provided, return specific peer review details
  if (id) {
    const assignment = mockPeerReviewAssignments.find(a => a.id === id);
    if (!assignment) {
      return Response.json({ error: 'Peer review not found' }, { status: 404 });
    }
    
    const review = mockSubmittedReviews[assignment.reviewId as keyof typeof mockSubmittedReviews];
    const proposal = mockProposalData[assignment.proposalId as keyof typeof mockProposalData];
    
    return Response.json({
      assignment,
      review,
      proposal
    });
  }
  
  // Otherwise, return list of all peer review assignments
  return Response.json(mockPeerReviewAssignments);
}