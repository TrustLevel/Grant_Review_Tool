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

class ReviewCriteria(str, Enum):
    RELEVANCE = "relevance"
    INNOVATION = "innovation"
    IMPACT = "impact"
    FEASIBILITY = "feasibility"
    TEAM = "team"
    BUDGET = "budget"

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

class ProposalIssue(str, Enum): # Do we need to change the tags?
    INCOMPLETE = "incomplete"
    UNCLEAR_SCOPE = "unclear_scope"
    DUPLICATE = "duplicate"
    AI_CREATED = "ai_created"

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

class ReviewStatus(str, Enum):
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FLAGGED = "flagged"

class PeerEvaluationCriteria(str, Enum):
    SPECIFICITY = "specificity"    # "How specific is the review..."
    CLARITY = "clarity"           # "How clearly does the reviewer state..."
    INSIGHT = "insight"           # "Does the review provide meaningful insights..."

class OnboardingStep(str, Enum):
    BASIC_INFO = "basic_info"
    EXPERTISE = "expertise"
    COMMUNITY = "community" 
    VALIDATION = "validation"
    COMPLETED = "completed"

class ReviewerStatus(str, Enum):
    PENDING = "pending"        # Warten auf Approval
    APPROVED = "approved"      # Kann Reviews durchführen
    INACTIVE = "inactive"      # Noch nicht onboarded

class ReviewerTier(str, Enum):
    JUNIOR = "junior"
    SENIOR = "senior"      # "Senior Reviewer" in Dashboard
    EXPERT = "expert"

class TaskType(str, Enum):
    PROPOSAL_REVIEW = "proposal_review"
    PEER_REVIEW = "peer_review"

class ReviewPriority(str, Enum):
    HIGH = "high"     # Mit rotem Priority Tag
    NORMAL = "normal"

class ReviewTab(str, Enum):
    ASSIGNED = "assigned"
    AVAILABLE = "available"
    COMPLETED = "completed"

class NotificationType(str, Enum):
    NEW_ASSIGNMENTS = "new_review_assignments"
    DEADLINE_REMINDERS = "review_deadline_reminders"
    MISSION_UPDATES = "mission_updates"

class MissionType(str, Enum):
    REVIEW_MILESTONE = "review_milestone"      # z.B. "Complete 5 reviews"
    PEER_REVIEW_MILESTONE = "peer_milestone"   # z.B. "Complete 3 peer reviews"

# --- Constants/Mappings ---

# Mapping zwischen Expertise und Challenges
EXPERTISE_CHALLENGE_MAPPING: Dict[ExpertiseArea, Set[ChallengeCategory]] = {
    ExpertiseArea.TECHNICAL: {
        ChallengeCategory.OPENSOURCE,
        ChallengeCategory.CONCEPT,
        ChallengeCategory.PRODUCT,
        ChallengeCategory.PARTNERSHIP
    },
    ExpertiseArea.COMMUNITY: {
        ChallengeCategory.ECOSYSTEM
    },
    ExpertiseArea.PRODUCT: {
        ChallengeCategory.CONCEPT,
        ChallengeCategory.PRODUCT,
        ChallengeCategory.PARTNERSHIP
    }
}

TAG_MAPPING: Dict[TagCategory, Set[str]] = {
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

# --- Core Models ---

# Fund related Models

class Fund(BaseModel):
    id: str
    name: str           # z.B. "Catalyst Fund 13"
    status: str         # active, completed, etc.
    start_date: datetime
    end_date: datetime
    total_budget: float
    challenges: List["Challenge"]  # Liste der Challenges in diesem Fund

class Challenge(BaseModel):
    id: str
    fund_id: str       # Reference to Fund
    category: ChallengeCategory
    title: str
    description: str
    budget: float
    min_requested_funds: float
    max_requested_funds: float
    review_config: Dict[str, any] # Konfiguration für Reviews wie:
                                  # - Minimum required reviews pro Proposal
                                  # - Review Deadlines
                                  # - Reviewer Rewards
    status: str
    created_at: datetime
    updated_at: datetime

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

# Onboarding related Models

class FundPreferences(BaseModel):
   reviewer_id: str
   fund_id: str
   review_scope: ReviewScope
   max_reviews: Optional[int]
   selected_categories: Set[str]
   excluded_proposals: Set[str]

class CatalystExperience(BaseModel):
    has_submitted_proposals: bool
    has_reviewed_proposals: bool
    additional_info: Optional[str]

class OnboardingStatus(BaseModel):
    step: OnboardingStep
    steps_completed: int = 1
    total_steps: int = 4  # "1/4 steps completed"
    admin_approved: bool = False
    approval_date: Optional[datetime]

class NotificationPreferences(BaseModel):
    new_assignments_enabled: bool = True
    deadline_reminders_enabled: bool = True
    mission_updates_enabled: bool = False

class ReviewerProfile(BaseModel):
   
   # User Metadata
   reviewer_id: str
   name: str
   username: Optional[str]
   wallet_address: str
   email: str
   telegram: str
   discord: str
   created_at: datetime
   
   # Onboarding
   primary_expertise: ExpertiseArea
   expertise_level: ExpertiseLevel  
   interests: Set[TagCategory]
   catalyst_experience: Optional[CatalystExperience]
   onboarding_status: str  # z.B. "basic_info", "expertise", "community", "validated"
   onboarding_completed_at: Optional[datetime]
   max_capacity: int
    
   # Tracking der Zustimmung
   guidelines_accepted: bool = False
   guidelines_accepted_at: Optional[datetime]
   code_of_conduct_accepted: bool = False
   code_of_conduct_accepted_at: Optional[datetime]

   # Meta Felder für Änderungsverfolgung
   updated_at: Optional[datetime]
   notification_preferences: NotificationPreferences

   # Optional für später/nicht POC:
   linkedin_url: Optional[str]
   github_url: Optional[str]
   portfolio_url: Optional[str]
   professional_title: str
   organization: Optional[str]
   years_of_experience: int
   detailed_interests: Set[str] = set()  # Optional: detaillierte Tags
   profile_picture: Optional[str]  # URL/Path zum Profilbild
   reputation_score: int = 0

# Review related Models

class Task(BaseModel):
    id: str
    type: TaskType
    title: str
    due_date: datetime
    reward: float
    tags: Set[str]              # "DeFi", "Proposal", "Peer Review" etc.
    status: str
    created_at: datetime

class ReviewerStats(BaseModel): # muss noch besser definiert werden
    reviewer_id: str
    total_reviews: int = 0
    total_peer_reviews: int = 0 
    rewards_earned: float = 0     # ₳ rewards
    rating: float = 0.0           # Durchschnittliches Rating
    active_reviews: int = 0
    pending_reviews: int = 0
    updated_at: datetime

class CriteriaReview(BaseModel):
    feedback: str
    score: int  # -3 to +3 scale wie im Mockup
    completed: bool = False

class TemperatureCheck(BaseModel):
    review_id: str
    is_promising: bool
    issues: Set[str]  # Selected issues like "incomplete", "unclear_scope", etc
    comment: Optional[str]

class Review(BaseModel):
   id: str
   proposal_id: str  
   reviewer_id: str  
   temperature_check: Optional[TemperatureCheck]
   criteria_reviews: Dict[ReviewCriteria, CriteriaReview] = {}
   expertise_level: ExpertiseLevel  # Änderung zu Enum
   status: ReviewStatus
   current_criteria: ReviewCriteria
   priority: ReviewPriority
   due_date: datetime
   reward: float
   is_peer_review: bool
   progress: Optional[float]
   created_at: datetime
   updated_at: datetime

class ReviewFilter(BaseModel):
    categories: Optional[Set[str]]
    status: Optional[str]
    time_period: Optional[str]  # "This Month" etc.

# Leaderboard and Mission related Models

class LeaderboardEntry(BaseModel):
    reviewer_id: str
    username: str        # Für die Anzeige
    total_reviews: int
    total_peer_reviews: int

class Mission(BaseModel):
    id: str
    type: MissionType
    target_count: int          # Anzahl der benötigten Reviews
    current_count: int = 0     # Aktuelle Anzahl
    reward_points: int         # Belohnungspunkte
    completed: bool = False
    created_at: datetime
    completed_at: Optional[datetime]

class ReviewerMissions(BaseModel):
    reviewer_id: str
    active_missions: List[Mission]
    completed_missions: int = 0
    total_points: int = 0

# Peer Review Process related:

class PeerEvaluationScore(BaseModel):
    score: int  # -3 to +3 scale wie im UI gezeigt
    criteria: PeerEvaluationCriteria

class PeerEvaluation(BaseModel):
    id: str
    review_id: str       # Reference to Review
    evaluator_id: str    # Reference to ReviewerProfile
    scores: Dict[PeerEvaluationCriteria, int]  # Score für jedes Kriterium
    feedback: Optional[str]  # "Optional Feedback" aus der UI
    created_at: datetime
    status: str  # z.B. draft, submitted

Fund.update_forward_refs()