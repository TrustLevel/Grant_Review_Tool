# This file outline the assignemnt service structure, including "base", "bulk", and "individual" assignemnts

# base_assignment.py
from typing import List, Set, Dict, Tuple
from models import (
    ReviewerProfile, Proposal, Fund, 
    ReviewScope, ExpertiseArea, ChallengeCategory,
    FundPreferences
)

class BaseAssignmentService:
    """Base class with shared assignment logic"""
    
    def __init__(self):
        self.MIN_REVIEWS_PER_PROPOSAL = 5
        self.DEFAULT_CAPACITY = 5

    def _filter_eligible_proposals(
        self,
        proposals: List[Proposal],
        reviewer: ReviewerProfile,
        preferences: FundPreferences
    ) -> List[Proposal]:
        """Filter proposals based on eligibility and preferences"""
        eligible = [
            p for p in proposals 
            if p.proposal_id not in reviewer.excluded_proposals
            and p.current_reviews < self.MIN_REVIEWS_PER_PROPOSAL
        ]

        if preferences.review_scope == ReviewScope.CATEGORY:
            eligible = [
                p for p in eligible
                if p.challenge_category in preferences.selected_categories
            ]
        
        return eligible

    def _create_tiered_assignments(
        self,
        reviewer: ReviewerProfile,
        proposals: List[Proposal],
        capacity: int
    ) -> List[Tuple[str, str]]:
        """Core tiered assignment logic"""
        assignments = []
        remaining_capacity = capacity

        # TIER 1: Expertise Matching
        expertise_matches = [
            p for p in proposals
            if self._matches_expertise(p, reviewer.primary_expertise)
        ]
        
        if expertise_matches:
            expertise_matches.sort(
                key=lambda p: len(set(p.detailed_tags) & reviewer.interests),
                reverse=True
            )
            
            for proposal in expertise_matches[:remaining_capacity]:
                assignments.append((reviewer.reviewer_id, proposal.proposal_id))
                remaining_capacity -= 1
                
            if remaining_capacity <= 0:
                return assignments

        # Continue with Tier 2 and 3 similarly...
        # [Rest of tiered logic]
        
        return assignments

    def _matches_expertise(self, proposal: Proposal, expertise: ExpertiseArea) -> bool:
        """Check if proposal matches expertise area using mapping"""
        from models import EXPERTISE_CHALLENGE_MAPPING
        return proposal.challenge_category in EXPERTISE_CHALLENGE_MAPPING[expertise]

# bulk_assignment_service.py
from base_assignment import BaseAssignmentService
from typing import Dict, List, Tuple
from models import ReviewerProfile, Proposal, Fund, FundPreferences

class BulkAssignmentService(BaseAssignmentService):
    """Service for bulk assignment at start of review phase"""
    
    async def create_assignments(
        self,
        fund: Fund,
        reviewers: List[ReviewerProfile],
        proposals: List[Proposal],
        fund_preferences: Dict[str, FundPreferences]
    ) -> List[Tuple[str, str]]:
        """Create assignments for all reviewers at start of fund"""
        
        all_assignments = []
        # Process reviewers in random order for fairness
        import random
        shuffled_reviewers = list(reviewers)
        random.shuffle(shuffled_reviewers)

        for reviewer in shuffled_reviewers:
            preference = fund_preferences.get(reviewer.reviewer_id)
            if not preference:
                continue

            eligible_proposals = self._filter_eligible_proposals(
                proposals, reviewer, preference
            )

            # Create assignments based on review scope
            if preference.review_scope == ReviewScope.RANDOM:
                assignments = self._create_random_assignments(
                    reviewer.reviewer_id,
                    eligible_proposals,
                    self.DEFAULT_CAPACITY
                )
            else:
                capacity = (
                    preference.max_reviews 
                    if preference.review_scope == ReviewScope.EXPERTISE_BASED
                    else self.DEFAULT_CAPACITY
                )
                assignments = self._create_tiered_assignments(
                    reviewer,
                    eligible_proposals,
                    capacity
                )

            all_assignments.extend(assignments)
            
            # Update proposal review counts
            self._update_review_counts(proposals, assignments)

        # Store assignments in database
        await self._store_assignments(fund.id, all_assignments)
        
        return all_assignments

    async def _store_assignments(self, fund_id: str, assignments: List[Tuple[str, str]]):
        """Store assignments in MongoDB"""
        from datetime import datetime, timedelta
        
        assignment_docs = [
            {
                "fund_id": fund_id,
                "reviewer_id": reviewer_id,
                "proposal_id": proposal_id,
                "status": "assigned",
                "assigned_at": datetime.utcnow(),
                "due_date": datetime.utcnow() + timedelta(days=7),
                "created_at": datetime.utcnow()
            }
            for reviewer_id, proposal_id in assignments
        ]
        
        # MongoDB insert
        await db.assignments.insert_many(assignment_docs)

    def _update_review_counts(
        self,
        proposals: List[Proposal],
        assignments: List[Tuple[str, str]]
    ):
        """Update review counts for assigned proposals"""
        assignment_counts = {}
        for _, proposal_id in assignments:
            assignment_counts[proposal_id] = assignment_counts.get(proposal_id, 0) + 1
            
        for proposal in proposals:
            if proposal.proposal_id in assignment_counts:
                proposal.current_reviews += assignment_counts[proposal.proposal_id]

# individual_assignment_service.py
from base_assignment import BaseAssignmentService
from typing import List, Tuple
from models import ReviewerProfile, Proposal, FundPreferences

class IndividualAssignmentService(BaseAssignmentService):
    """Service for individual assignment requests"""
    
    async def create_assignment(
        self,
        reviewer: ReviewerProfile,
        fund_id: str,
        proposals: List[Proposal],
        preferences: FundPreferences
    ) -> List[Tuple[str, str]]:
        """Create assignments for individual reviewer request"""
        
        # First check if reviewer already has active assignments
        active_count = await self._get_active_assignment_count(reviewer.reviewer_id)
        if active_count >= self.DEFAULT_CAPACITY:
            return []

        # Prioritize proposals needing reviews
        sorted_proposals = sorted(
            proposals,
            key=lambda p: (p.current_reviews, p.requested_funding),
            reverse=True
        )

        eligible_proposals = self._filter_eligible_proposals(
            sorted_proposals, reviewer, preferences
        )

        # Create assignments based on review scope
        remaining_capacity = self.DEFAULT_CAPACITY - active_count
        
        if preferences.review_scope == ReviewScope.RANDOM:
            assignments = self._create_random_assignments(
                reviewer.reviewer_id,
                eligible_proposals,
                remaining_capacity
            )
        else:
            capacity = min(
                remaining_capacity,
                preferences.max_reviews if preferences.review_scope == ReviewScope.EXPERTISE_BASED
                else self.DEFAULT_CAPACITY
            )
            assignments = self._create_tiered_assignments(
                reviewer,
                eligible_proposals,
                capacity
            )

        # Store new assignments
        if assignments:
            await self._store_assignments(fund_id, assignments)
            self._update_review_counts(proposals, assignments)

        return assignments

    async def _get_active_assignment_count(self, reviewer_id: str) -> int:
        """Get count of reviewer's current active assignments"""
        return await db.assignments.count_documents({
            "reviewer_id": reviewer_id,
            "status": {"$in": ["assigned", "in_progress"]}
        })
