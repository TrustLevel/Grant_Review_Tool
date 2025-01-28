from typing import List, Set, Dict, Tuple
from models import (
    ReviewerProfile, ProposalInfo, FundPreferences,
    ReviewScope, ExpertiseArea, ChallengeCategory
)

class ProposalAssignmentService:
    def __init__(self):
        self.MIN_REVIEWS_PER_PROPOSAL = 5
        self.DEFAULT_CAPACITY = 5

    async def create_bulk_assignments(
        self,
        reviewers: List[ReviewerProfile],
        proposals: List[ProposalInfo],
        fund_preferences: Dict[str, FundPreferences]
    ) -> List[Tuple[str, str]]:  # List of (reviewer_id, proposal_id) pairs
        """
        Create assignments for all reviewers at start of review phase.
        """
        all_assignments = []
        # Process reviewers in random order for fairness
        import random
        shuffled_reviewers = list(reviewers)
        random.shuffle(shuffled_reviewers)

        for reviewer in shuffled_reviewers:
            assignments = await self._create_reviewer_assignments(
                reviewer,
                proposals,
                fund_preferences[reviewer.reviewer_id]
            )
            all_assignments.extend(assignments)
            # Update proposal review counts
            for _, proposal_id in assignments:
                for p in proposals:
                    if p.proposal_id == proposal_id:
                        p.current_reviews += 1

        return all_assignments

    async def create_individual_assignment(
        self,
        reviewer: ReviewerProfile,
        proposals: List[ProposalInfo],
        fund_preference: FundPreferences
    ) -> List[Tuple[str, str]]:
        """
        Create assignments for a single reviewer (new reviewer or requesting more).
        Prioritizes proposals needing minimum review count.
        """
        # Sort proposals by review need
        sorted_proposals = sorted(
            proposals,
            key=lambda p: p.current_reviews
        )
        return await self._create_reviewer_assignments(
            reviewer,
            sorted_proposals,
            fund_preference
        )

    async def _create_reviewer_assignments(
        self,
        reviewer: ReviewerProfile,
        proposals: List[ProposalInfo],
        fund_preference: FundPreferences
    ) -> List[Tuple[str, str]]:
        """
        Core assignment logic for a single reviewer.
        """
        # Set capacity based on preference type
        capacity = (
            fund_preference.max_reviews
            if fund_preference.review_scope == ReviewScope.EXPERTISE_BASED
            else self.DEFAULT_CAPACITY
        )

        # Filter out affiliated proposals
        eligible_proposals = [
            p for p in proposals
            if p.proposal_id not in fund_preference.excluded_proposals
            and p.current_reviews < self.MIN_REVIEWS_PER_PROPOSAL
        ]

        # Apply scope filtering
        if fund_preference.review_scope == ReviewScope.CATEGORY:
            eligible_proposals = [
                p for p in eligible_proposals
                if p.challenge_category in fund_preference.selected_categories
            ]

        # If random scope, shuffle and assign
        if fund_preference.review_scope == ReviewScope.RANDOM:
            return self._create_random_assignments(
                reviewer.reviewer_id,
                eligible_proposals,
                capacity
            )

        # For other scopes, apply tier-based assignment
        return await self._create_tiered_assignments(
            reviewer,
            eligible_proposals,
            capacity
        )

    def _create_random_assignments(
        self,
        reviewer_id: str,
        proposals: List[ProposalInfo],
        capacity: int
    ) -> List[Tuple[str, str]]:
        """
        Create random assignments up to capacity.
        """
        import random
        shuffled = list(proposals)
        random.shuffle(shuffled)
        assignments = []
        
        for proposal in shuffled[:capacity]:
            assignments.append((reviewer_id, proposal.proposal_id))
            
        return assignments

    async def _create_tiered_assignments(
        self,
        reviewer: ReviewerProfile,
        proposals: List[ProposalInfo],
        capacity: int
    ) -> List[Tuple[str, str]]:
        """
        Create assignments using 3-tier matching system.
        """
        assignments = []
        remaining_capacity = capacity

        # TIER 1: Expertise Matching
        expertise_matches = [
            p for p in proposals
            if p.category == reviewer.primary_expertise
        ]
        
        if len(expertise_matches) > remaining_capacity:
            # Sort by interest tag matches
            expertise_matches.sort(
                key=lambda p: len(p.tags.intersection(reviewer.interests)),
                reverse=True
            )
            
        for proposal in expertise_matches[:remaining_capacity]:
            assignments.append((reviewer.reviewer_id, proposal.proposal_id))
            remaining_capacity -= 1
            if remaining_capacity <= 0:
                return assignments

        # Remove assigned proposals from pool
        assigned_ids = {proposal_id for _, proposal_id in assignments}
        remaining_proposals = [
            p for p in proposals
            if p.proposal_id not in assigned_ids
        ]

        # TIER 2: Interest Matching
        if remaining_capacity > 0:
            interest_matches = [
                p for p in remaining_proposals
                if len(p.tags.intersection(reviewer.interests)) > 0
            ]
            interest_matches.sort(
                key=lambda p: len(p.tags.intersection(reviewer.interests)),
                reverse=True
            )
            
            for proposal in interest_matches[:remaining_capacity]:
                assignments.append((reviewer.reviewer_id, proposal.proposal_id))
                remaining_capacity -= 1
                if remaining_capacity <= 0:
                    return assignments

        # TIER 3: Random Assignment (if still needed)
        if remaining_capacity > 0:
            # Update remaining proposals pool
            assigned_ids = {proposal_id for _, proposal_id in assignments}
            remaining_proposals = [
                p for p in remaining_proposals
                if p.proposal_id not in assigned_ids
            ]
            
            random_assignments = self._create_random_assignments(
                reviewer.reviewer_id,
                remaining_proposals,
                remaining_capacity
            )
            assignments.extend(random_assignments)

        return assignments
