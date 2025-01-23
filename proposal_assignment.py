from dataclasses import dataclass
from typing import List, Set, Optional, Dict
from enum import Enum
from datetime import datetime

class ReviewScope(str, Enum):
    ALL = "all"
    CATEGORY = "category"
    MAX_EXPERTISE = "max_expertise"
    RANDOM = "random"

@dataclass
class FundPreferences:
    """Reviewer preferences for a specific fund"""
    reviewer_id: str
    fund_id: str
    review_scope: ReviewScope
    max_reviews: Optional[int]
    selected_categories: Set[str]
    excluded_proposals: Set[str]

@dataclass
class ReviewerProfile:
    """Reviewer profile with expertise and interests"""
    reviewer_id: str
    technical_level: int  # 0-5
    product_level: int   # 0-5
    community_level: int # 0-5
    interests: Set[str]  # Tags they're interested in
    active_reviews: int
    max_capacity: int

@dataclass
class ProposalInfo:
    """Proposal information"""
    proposal_id: str
    category: str
    tags: Set[str]
    current_reviews: int
    min_required_reviews: int = 5
    review_confidence: float = 0.0

class ProposalAssignmentService:
    def __init__(self):
        self.MIN_REVIEWS_PER_PROPOSAL = 5
        self.MIN_CONFIDENCE_THRESHOLD = 0.6

    async def create_assignments(
        self,
        reviewers: List[ReviewerProfile],
        proposals: List[ProposalInfo],
        fund_preferences: Dict[str, FundPreferences]
    ) -> List[tuple[str, str]]:  # List of (reviewer_id, proposal_id) pairs
        assignments = []
        
        # Filter proposals needing reviews
        needs_review = [p for p in proposals if p.current_reviews < self.MIN_REVIEWS_PER_PROPOSAL]
        
        for proposal in needs_review:
            # Find eligible reviewers based on fund preferences
            eligible_reviewers = self._filter_eligible_reviewers(
                proposal, 
                reviewers, 
                fund_preferences
            )
            
            # Calculate how many more reviews needed
            reviews_needed = self.MIN_REVIEWS_PER_PROPOSAL - proposal.current_reviews
            
            # Sort reviewers by match score
            matched_reviewers = self._rank_reviewers(proposal, eligible_reviewers)
            
            # Create assignments
            for reviewer in matched_reviewers[:reviews_needed]:
                assignments.append((reviewer.reviewer_id, proposal.proposal_id))
                reviewer.active_reviews += 1
        
        return assignments

    def _filter_eligible_reviewers(
        self,
        proposal: ProposalInfo,
        reviewers: List[ReviewerProfile],
        fund_preferences: Dict[str, FundPreferences]
    ) -> List[ReviewerProfile]:
        """Filter reviewers based on fund preferences and availability"""
        eligible = []
        
        for reviewer in reviewers:
            pref = fund_preferences.get(reviewer.reviewer_id)
            if not pref:
                continue
                
            # Check if reviewer has capacity
            if reviewer.active_reviews >= reviewer.max_capacity:
                continue
                
            # Check exclusions
            if proposal.proposal_id in pref.excluded_proposals:
                continue
                
            # Apply review scope rules
            if pref.review_scope == ReviewScope.CATEGORY:
                if proposal.category not in pref.selected_categories:
                    continue
            elif pref.review_scope == ReviewScope.MAX_EXPERTISE:
                if reviewer.active_reviews >= pref.max_reviews:
                    continue
                    
            eligible.append(reviewer)
            
        return eligible

    def _rank_reviewers(
        self,
        proposal: ProposalInfo,
        reviewers: List[ReviewerProfile]
    ) -> List[ReviewerProfile]:
        """Rank reviewers by match score for a proposal"""
        scored_reviewers = []
        
        for reviewer in reviewers:
            score = self._calculate_match_score(proposal, reviewer)
            scored_reviewers.append((score, reviewer))
            
        # Sort by score descending
        scored_reviewers.sort(reverse=True)
        return [r for _, r in scored_reviewers]

    def _calculate_match_score(
        self,
        proposal: ProposalInfo,
        reviewer: ReviewerProfile
    ) -> float:
        """Calculate match score between reviewer and proposal"""
        # Calculate interest match
        matching_tags = proposal.tags.intersection(reviewer.interests)
        interest_score = len(matching_tags) / max(len(proposal.tags), 1)
        
        # Calculate expertise match based on category
        expertise_score = self._get_expertise_score(proposal.category, reviewer)
        
        # Weighted combination
        # Prioritize interest match (0.6) over expertise (0.4)
        # Since expertise will be used in confidence calculations
        return (0.6 * interest_score) + (0.4 * expertise_score)

    def _get_expertise_score(
        self,
        category: str,
        reviewer: ReviewerProfile
    ) -> float:
        """Get expertise score based on proposal category"""
        # Map category to relevant expertise
        if category in ["development", "smart_contracts"]:
            return reviewer.technical_level / 5
        elif category in ["defi", "product"]:
            return reviewer.product_level / 5
        elif category in ["community", "education"]:
            return reviewer.community_level / 5
        else:
            # For general categories, take highest expertise
            return max(
                reviewer.technical_level,
                reviewer.product_level,
                reviewer.community_level
            ) / 5

    def calculate_review_confidence(
        self,
        proposal: ProposalInfo,
        reviews: List[tuple[ReviewerProfile, float]]  # (reviewer, rating) pairs
    ) -> float:
        """Calculate confidence score for a proposal's reviews"""
        if not reviews:
            return 0.0
            
        # Coverage factor (0-1)
        coverage = min(len(reviews) / self.MIN_REVIEWS_PER_PROPOSAL, 1.0)
        
        # Quality factor based on reviewer expertise
        expertise_scores = []
        for reviewer, _ in reviews:
            expertise_score = self._get_expertise_score(proposal.category, reviewer)
            expertise_scores.append(expertise_score)
            
        avg_expertise = sum(expertise_scores) / len(expertise_scores)
        
        # Combine coverage and quality
        confidence = (0.5 * coverage) + (0.5 * avg_expertise)
        
        return confidence

# Example usage
if __name__ == "__main__":
    # Example setup
    reviewer1 = ReviewerProfile(
        reviewer_id="r1",
        technical_level=4,
        product_level=3,
        community_level=2,
        interests={"defi", "smart_contracts"},
        active_reviews=0,
        max_capacity=5
    )
    
    proposal1 = ProposalInfo(
        proposal_id="p1",
        category="defi",
        tags={"defi", "smart_contracts"},
        current_reviews=2
    )
    
    preferences = {
        "r1": FundPreferences(
            reviewer_id="r1",
            fund_id="f1",
            review_scope=ReviewScope.ALL,
            max_reviews=None,
            selected_categories=set(),
            excluded_proposals=set()
        )
    }
    
    # Create service and assignments
    service = ProposalAssignmentService()
    assignments = service.create_assignments(
        reviewers=[reviewer1],
        proposals=[proposal1],
        fund_preferences=preferences
    )
