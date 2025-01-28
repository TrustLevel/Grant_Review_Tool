# First draft of the peer review assignment service.
# NOT completely aligned with other files yet


from typing import List, Dict, Set, Optional, Tuple
from datetime import datetime, timedelta
from models import (
    ReviewerProfile, Review, PeerEvaluation, 
    ExpertiseArea, ReviewStatus, PeerEvaluationCriteria,
    TagCategory
)

class PeerReviewAssignmentService:
    """Handles assignment of peer reviews using panel approach"""
    
    def __init__(self):
        self.MIN_PEER_REVIEWS = 2
        self.MAX_PEER_REVIEW_CAPACITY = 6  # 2/3 of total capacity (9)
        self.MIN_TOTAL_REVIEWS = 5
        
    async def assign_peer_reviewers(self, review: Review) -> List[str]:
        """
        Main entry point for assigning peer reviewers to a completed review.
        Returns list of assigned reviewer IDs.
        """
        # Get original reviewer's profile
        original_reviewer = await self._get_reviewer_profile(review.reviewer_id)
        if not original_reviewer:
            raise ValueError("Original reviewer not found")
            
        # Get pools of eligible reviewers
        same_expertise_pool, diff_expertise_pool = await self._get_reviewer_pools(
            review=review,
            original_expertise=original_reviewer.primary_expertise,
            excluded_ids={review.reviewer_id}
        )
        
        # Create panel assignments
        assignments = await self._create_panel_assignments(
            review=review,
            same_expertise_pool=same_expertise_pool,
            diff_expertise_pool=diff_expertise_pool,
            interests=set(original_reviewer.interests)
        )
        
        if assignments:
            await self._store_peer_assignments(review.id, assignments)
            
        return assignments
        
    async def _get_reviewer_pools(
        self, 
        review: Review,
        original_expertise: ExpertiseArea,
        excluded_ids: Set[str]
    ) -> Tuple[List[ReviewerProfile], List[ReviewerProfile]]:
        """Split eligible reviewers into same/different expertise pools"""
        
        # Get all active reviewers
        all_reviewers = await db.reviewers.find({
            "reviewer_id": {"$nin": list(excluded_ids)},
            "status": "active"
        }).to_list(None)
        
        same_expertise = []
        diff_expertise = []
        
        for reviewer_data in all_reviewers:
            reviewer = ReviewerProfile(**reviewer_data)
            
            # Check eligibility
            if not await self._is_eligible_for_peer_review(reviewer.reviewer_id, review):
                continue
                
            # Sort into pools based on expertise
            if reviewer.primary_expertise == original_expertise:
                same_expertise.append(reviewer)
            else:
                diff_expertise.append(reviewer)
                
        return same_expertise, diff_expertise
        
    async def _is_eligible_for_peer_review(
        self,
        reviewer_id: str,
        review: Review
    ) -> bool:
        """Check if reviewer is eligible for this peer review"""
        
        # Check if they've already reviewed this proposal
        has_reviewed = await db.reviews.find_one({
            "reviewer_id": reviewer_id,
            "proposal_id": review.proposal_id
        })
        if has_reviewed:
            return False
            
        # Check peer review capacity
        current_peer_reviews = await db.peer_reviews.count_documents({
            "reviewer_id": reviewer_id,
            "status": {"$in": ["assigned", "in_progress"]}
        })
        if current_peer_reviews >= self.MAX_PEER_REVIEW_CAPACITY:
            return False
            
        # Could add more checks here (e.g., conflicts of interest)
        return True
        
    async def _create_panel_assignments(
        self,
        review: Review,
        same_expertise_pool: List[ReviewerProfile],
        diff_expertise_pool: List[ReviewerProfile],
        interests: Set[TagCategory]
    ) -> List[str]:
        """Create balanced panel of peer reviewers"""
        
        assignments = []
        
        # Sort pools by interest match
        def sort_by_interests(reviewers: List[ReviewerProfile]) -> List[ReviewerProfile]:
            return sorted(
                reviewers,
                key=lambda r: len(set(r.interests) & interests),
                reverse=True
            )
            
        same_expertise_pool = sort_by_interests(same_expertise_pool)
        diff_expertise_pool = sort_by_interests(diff_expertise_pool)
        
        # Try to get one from each pool
        if same_expertise_pool:
            assignments.append(same_expertise_pool[0].reviewer_id)
            
        if diff_expertise_pool:
            assignments.append(diff_expertise_pool[0].reviewer_id)
            
        # If we still need reviewers, take from any pool
        remaining_needed = self.MIN_PEER_REVIEWS - len(assignments)
        if remaining_needed > 0:
            # Combine remaining eligible reviewers
            remaining_pool = sort_by_interests(
                [r for r in same_expertise_pool[1:] + diff_expertise_pool[1:]
                 if r.reviewer_id not in assignments]
            )
            
            # Take what we need
            for reviewer in remaining_pool[:remaining_needed]:
                assignments.append(reviewer.reviewer_id)
                
        return assignments
        
    async def _store_peer_assignments(self, review_id: str, reviewer_ids: List[str]):
        """Store peer review assignments in database"""
        
        now = datetime.utcnow()
        assignments = []
        
        for reviewer_id in reviewer_ids:
            peer_evaluation = PeerEvaluation(
                id=f"peer_{review_id}_{reviewer_id}",
                review_id=review_id,
                evaluator_id=reviewer_id,
                scores={},  # Will be filled during review
                created_at=now,
                status="assigned"
            )
            
            assignments.append(peer_evaluation.dict())
            
        if assignments:
            await db.peer_reviews.insert_many(assignments)
            
    async def _get_reviewer_profile(self, reviewer_id: str) -> Optional[ReviewerProfile]:
        """Get reviewer profile from database"""
        data = await db.reviewers.find_one({"reviewer_id": reviewer_id})
        return ReviewerProfile(**data) if data else None