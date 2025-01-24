from dataclasses import dataclass, field
from typing import List, Set, Optional, Dict
from enum import Enum

class ExpertiseLevel(str, Enum):
    NONE = "none"
    BASIC = "basic"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"

class ExpertiseArea(str, Enum):
    TECHNICAL = "technical"
    COMMUNITY = "community"
    PRODUCT = "product"

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
    """Simplified reviewer profile with primary expertise and interests"""
    reviewer_id: str
    primary_expertise: ExpertiseArea
    expertise_level: ExpertiseLevel
    interests: Set[str]  # Tags they're interested in
    active_reviews: int = 0
    max_capacity: int = 5

@dataclass
class ProposalInfo:
    """Proposal information"""
    proposal_id: str
    category: ExpertiseArea
    tags: Set[str]
    current_reviews: int
    min_required_reviews: int = 5

@dataclass
class AssignmentGroup:
    """Group of proposals based on expertise match level"""
    direct_match: List[ProposalInfo] = field(default_factory=list)
    related_match: List[ProposalInfo] = field(default_factory=list)
    other_match: List[ProposalInfo] = field(default_factory=list)

class ProposalAssignmentService:
    def __init__(self):
        self.MIN_REVIEWS_PER_PROPOSAL = 5

    async def create_assignments(
        self,
        reviewers: List[ReviewerProfile],
        proposals: List[ProposalInfo],
        fund_preferences: Dict[str, FundPreferences]
    ) -> List[tuple[str, str]]:  # List of (reviewer_id, proposal_id) pairs
        assignments = []

        # Step 1: For each reviewer, create hierarchical proposal groups
        for reviewer in reviewers:
            # Skip if reviewer is at capacity
            if reviewer.active_reviews >= reviewer.max_capacity:
                continue

            # Get fund preferences
            pref = fund_preferences.get(reviewer.reviewer_id)
            if not pref:
                continue

            # Filter proposals based on fund preferences
            eligible_proposals = self._filter_by_preferences(proposals, pref)
            if not eligible_proposals:
                continue

            # Group proposals by expertise match
            proposal_groups = self._group_proposals_by_expertise(
                eligible_proposals,
                reviewer
            )

            # Create assignments following hierarchy
            new_assignments = self._create_hierarchical_assignments(
                reviewer,
                proposal_groups
            )
            assignments.extend(new_assignments)

            # Update reviewer capacity
            reviewer.active_reviews += len(new_assignments)

        return assignments

    def _filter_by_preferences(
        self,
        proposals: List[ProposalInfo],
        preferences: FundPreferences
    ) -> List[ProposalInfo]:
        """Filter proposals based on fund preferences"""
        # Remove excluded proposals
        filtered = [p for p in proposals if p.proposal_id not in preferences.excluded_proposals]

        # Apply review scope filters
        if preferences.review_scope == ReviewScope.CATEGORY:
            filtered = [p for p in filtered if p.category in preferences.selected_categories]
        elif preferences.review_scope == ReviewScope.MAX_EXPERTISE:
            # Only return up to max_reviews
            filtered = filtered[:preferences.max_reviews]
        elif preferences.review_scope == ReviewScope.RANDOM:
            import random
            random.shuffle(filtered)

        return filtered

    def _group_proposals_by_expertise(
        self,
        proposals: List[ProposalInfo],
        reviewer: ReviewerProfile
    ) -> AssignmentGroup:
        """Group proposals by expertise match level"""
        groups = AssignmentGroup()

        for proposal in proposals:
            # Skip if proposal has enough reviews
            if proposal.current_reviews >= self.MIN_REVIEWS_PER_PROPOSAL:
                continue

            # Direct expertise match
            if proposal.category == reviewer.primary_expertise:
                groups.direct_match.append(proposal)
            # Related match (can define relationships between areas)
            elif self._is_related_expertise(proposal.category, reviewer.primary_expertise):
                groups.related_match.append(proposal)
            # Other
            else:
                groups.other_match.append(proposal)

        # Sort each group by tag matches
        for group in [groups.direct_match, groups.related_match, groups.other_match]:
            self._sort_by_tag_matches(group, reviewer.interests)

        return groups

    def _is_related_expertise(self, category: ExpertiseArea, expertise: ExpertiseArea) -> bool:
        """Define related expertise areas"""
        # Example relationships
        relationships = {
            ExpertiseArea.TECHNICAL: {ExpertiseArea.PRODUCT},
            ExpertiseArea.PRODUCT: {ExpertiseArea.TECHNICAL, ExpertiseArea.COMMUNITY},
            ExpertiseArea.COMMUNITY: {ExpertiseArea.PRODUCT}
        }
        return category in relationships.get(expertise, set())

    def _sort_by_tag_matches(
        self,
        proposals: List[ProposalInfo],
        reviewer_interests: Set[str]
    ) -> None:
        """Sort proposals by number of matching tags"""
        proposals.sort(
            key=lambda p: len(p.tags.intersection(reviewer_interests)),
            reverse=True
        )

    def _create_hierarchical_assignments(
        self,
        reviewer: ReviewerProfile,
        groups: AssignmentGroup
    ) -> List[tuple[str, str]]:
        """Create assignments following hierarchical priority"""
        assignments = []
        remaining_capacity = reviewer.max_capacity - reviewer.active_reviews

        # Helper function to add assignments from a group
        def add_from_group(group: List[ProposalInfo]) -> None:
            nonlocal remaining_capacity
            for proposal in group:
                if remaining_capacity <= 0:
                    break
                if proposal.current_reviews < self.MIN_REVIEWS_PER_PROPOSAL:
                    assignments.append((reviewer.reviewer_id, proposal.proposal_id))
                    proposal.current_reviews += 1
                    remaining_capacity -= 1

        # Follow hierarchical priority
        add_from_group(groups.direct_match)
        if remaining_capacity > 0:
            add_from_group(groups.related_match)
        if remaining_capacity > 0:
            add_from_group(groups.other_match)

        return assignments

# Example usage
if __name__ == "__main__":
    # Example reviewer
    reviewer = ReviewerProfile(
        reviewer_id="r1",
        primary_expertise=ExpertiseArea.TECHNICAL,
        expertise_level=ExpertiseLevel.ADVANCED,
        interests={"defi", "smart_contracts"}
    )

    # Example proposals
    proposals = [
        ProposalInfo(
            proposal_id="p1",
            category=ExpertiseArea.TECHNICAL,
            tags={"defi", "smart_contracts"},
            current_reviews=2
        ),
        ProposalInfo(
            proposal_id="p2",
            category=ExpertiseArea.PRODUCT,
            tags={"defi", "marketplace"},
            current_reviews=3
        )
    ]

    # Example fund preferences
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
        reviewers=[reviewer],
        proposals=proposals,
        fund_preferences=preferences
    )
