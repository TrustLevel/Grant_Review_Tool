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
   interests: Set[TagCategory]
   detailed_interests: Set[str] = set()  # Optional: detaillierte Tags
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
    primary_tag: TagCategory  # Hauptkategorie
    detailed_tags: Set[str]  # Spezifische Tags
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

class TagCategory(str, Enum):
    GOVERNANCE = "governance"
    EDUCATION = "education"
    COMMUNITY = "community_outreach"
    DEVELOPMENT = "development_tools"
    IDENTITY = "identity_security"
    DEFI = "defi"
    RWA = "real_world_applications"
    EVENTS = "events_marketing"
    INTEROP = "interoperability"
    SUSTAINABILITY = "sustainability"
    SMART_CONTRACTS = "smart_contracts"
    GAMEFI = "gamefi"
    NFT = "nft"

class TagMapping(BaseModel):
    """Mapping zwischen Hauptkategorien und ihren spezifischen Tags"""
    MAPPING: Dict[TagCategory, Set[str]] = {
        TagCategory.GOVERNANCE: {"governance", "dao"},
        TagCategory.EDUCATION: {"education", "learn_to_earn", "training", "translation"},
        TagCategory.COMMUNITY: {"connected_community", "community", "community_outreach", "social_media"},
        TagCategory.DEVELOPMENT: {"developer_tools", "l2", "infrastructure", "analytics", "ai", "research", "utxo", "p2p"},
        TagCategory.IDENTITY: {"identity_verification", "cybersecurity", "security", "authentication", "privacy"},
        TagCategory.DEFI: {"defi", "payments", "stablecoin", "risk_management", "yield", "staking", "lending"},
        TagCategory.RWA: {"wallet", "marketplace", "manufacturing", "iot", "financial_services", "ecommerce", 
                         "business_services", "supply_chain", "real_estate", "healthcare", "tourism", 
                         "entertainment", "rwa", "music", "tokenization"},
        TagCategory.EVENTS: {"events", "marketing", "hackathons", "accelerator", "incubator"},
        TagCategory.INTEROP: {"cross_chain", "interoperability", "off_chain", "legal", "policy_advocacy", "standards"},
        TagCategory.SUSTAINABILITY: {"sustainability", "environment", "agriculture"},
        TagCategory.SMART_CONTRACTS: {"smart_contract", "smart_contracts", "audit", "oracles"},
        TagCategory.GAMEFI: {"gaming", "gamefi", "entertainment", "metaverse"},
        TagCategory.NFT: {"nft", "cnft", "collectibles", "digital_twin"}
    }


# Assignment related
class AssignmentGroup(BaseModel):
   """Group of proposals based on expertise match level"""
   direct_match: List[str] = []    # List of proposal_ids
   related_match: List[str] = []   # List of proposal_ids
   other_match: List[str] = []     # List of proposal_ids
