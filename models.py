# models.py
# Single source of truth for the entire data structure of the tool

from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Set
from enum import Enum

# --- Enums ---
class ChallengeCategory(str, Enum):
    CONCEPT = "concept_development"
    PRODUCT = "product_development"
    OPENSOURCE = "open_source_development"
    ECOSYSTEM = "ecosystem_development"
    PARTNERSHIP = "partnership"

class ExpertiseArea(str, Enum):
    TECHNICAL = "technical"
    COMMUNITY = "community"
    PRODUCT = "product"

# Mapping zwischen Expertise und Challenges
class ExpertiseChallengeMapping(BaseModel):
    TECHNICAL: Set[ChallengeCategory] = {
        ChallengeCategory.OPENSOURCE,
        ChallengeCategory.CONCEPT,
        ChallengeCategory.PRODUCT,
        ChallengeCategory.PARTNERSHIP
    }
    COMMUNITY: Set[ChallengeCategory] = {
        ChallengeCategory.ECOSYSTEM
    }
    PRODUCT: Set[ChallengeCategory] = {
        ChallengeCategory.CONCEPT,
        ChallengeCategory.PRODUCT,
        ChallengeCategory.PARTNERSHIP
    }

class ExpertiseLevel(str, Enum):
    NONE = "none"
    BASIC = "basic"
    INTERMEDIATE = "intermediate" 
    ADVANCED = "advanced"

class ReviewScope(str, Enum):
    ALL = "all"
    CHALLENGE = "challenge"    
    EXPERTISE = "expertise"
    RANDOM = "random"

# --- Core Models ---
class FundPreferences(BaseModel):
   reviewer_id: str
   fund_id: str
   review_scope: ReviewScope
   max_reviews: Optional[int]
   selected_categories: Set[str]
   excluded_proposals: Set[str]

class ReviewerProfile(BaseModel):
   reviewer_id: str
   primary_expertise: ExpertiseArea
   expertise_level: ExpertiseLevel  
   interests: Set[str]  # Tags they're interested in
   active_reviews: int = 0
   max_capacity: int
   name: str
   wallet_address: str
   created_at: datetime
   reputation_score: int = 0

class Proposal(BaseModel):
    proposal_id: str
    title: str
    description: str
    challenge_category: ChallengeCategory 
    tags: Set[str]
    current_reviews: int
    min_required_reviews: int = 5
    requested_funding: float
    status: str
    created_at: datetime
    external_id: str

class Review(BaseModel):
   id: str
   proposal_id: str  # Reference to Proposal
   reviewer_id: str  # Reference to ReviewerProfile
   content: str
   scores: Dict[str, int]  # Flexible scoring structure
   status: str
   created_at: datetime
   updated_at: datetime

class PeerEvaluation(BaseModel):
   id: str
   review_id: str       # Reference to Review
   evaluator_id: str    # Reference to ReviewerProfile
   quality_score: int
   feedback: str
   created_at: datetime

# Assignment related
class AssignmentGroup(BaseModel):
   """Group of proposals based on expertise match level"""
   direct_match: List[str] = []    # List of proposal_ids
   related_match: List[str] = []   # List of proposal_ids
   other_match: List[str] = []     # List of proposal_ids
