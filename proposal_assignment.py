from dataclasses import dataclass
from typing import List, Set, Optional
from enum import Enum
from decimal import Decimal

class CatalystCategory(str, Enum):
    CONCEPT = "concept"
    PRODUCT = "product"
    OPEN_DEV = "open_dev"
    OPEN_ECOSYSTEM = "open_ecosystem"
    PARTNERSHIP = "partnership"

class ConceptType(str, Enum):
    TECHNICAL = "technical"
    PRODUCT = "product"
    RESEARCH = "research"

class ProposalTag(str, Enum):
    # Technical tags
    SMART_CONTRACTS = "smart_contracts"
    DEFI = "defi"
    NFT = "nft"
    SCALABILITY = "scalability"
    INTEROPERABILITY = "interoperability"
    DEV_TOOLS = "dev_tools"
    
    # Product/Business tags
    WALLET = "wallet"
    PAYMENTS = "payments"
    IDENTITY = "identity"
    GOVERNANCE = "governance"
    RWA = "real_world_assets"
    GAMING = "gaming"
    
    # Community/Ecosystem tags
    EDUCATION = "education"
    EVENTS = "events"
    MARKETING = "marketing"
    COMMUNITY = "community"
    ONBOARDING = "onboarding"
    ADOPTION = "adoption"

@dataclass
class ProposalInfo:
    proposal_id: str
    title: str
    category: CatalystCategory
    concept_type: Optional[ConceptType] = None  # Only for CONCEPT category
    tags: Set[ProposalTag]
    requested_funds: Decimal
    
    def __post_init__(self):
        # Validate concept type is provided for concept proposals
        if self.category == CatalystCategory.CONCEPT and not self.concept_type:
            raise ValueError("Concept proposals must specify a concept type")
            
        # Validate partnership category funding
        if self.category == CatalystCategory.PARTNERSHIP and self.requested_funds > Decimal('2000000'):
            raise ValueError("Partnership proposals cannot exceed 2M ADA")

def get_category_expertise_requirements(category: CatalystCategory, concept_type: Optional[ConceptType] = None) -> List[str]:
    """Define expertise requirements based on category"""
    if category == CatalystCategory.CONCEPT:
        if concept_type == ConceptType.TECHNICAL:
            return ["technical", "smart_contracts", "development"]
        elif concept_type == ConceptType.PRODUCT:
            return ["product", "business", "market_analysis"]
        elif concept_type == ConceptType.RESEARCH:
            return ["research", "technical", "analysis"]
    elif category == CatalystCategory.PRODUCT:
        return ["product", "development", "business"]
    elif category == CatalystCategory.OPEN_DEV:
        return ["technical", "development", "open_source"]
    elif category == CatalystCategory.OPEN_ECOSYSTEM:
        return ["community", "marketing", "events"]
    elif category == CatalystCategory.PARTNERSHIP:
        return ["business", "integration", "enterprise"]
    return []

@dataclass
class ReviewerExpertise:
    """Expanded reviewer expertise structure to match Catalyst categories"""
    # Primary expertise areas
    technical_level: int  # 0-5 scale
    product_level: int   # 0-5 scale
    community_level: int # 0-5 scale
    
    # Specific tags expertise
    tag_expertise: dict[ProposalTag, int]  # tag -> expertise level (0-5)
    
    def matches_category(self, category: CatalystCategory, concept_type: Optional[ConceptType] = None) -> bool:
        """Check if reviewer expertise matches category requirements"""
        if category == CatalystCategory.CONCEPT:
            if concept_type == ConceptType.TECHNICAL:
                return self.technical_level >= 3
            elif concept_type == ConceptType.PRODUCT:
                return self.product_level >= 3
            elif concept_type == ConceptType.RESEARCH:
                return self.technical_level >= 3
        elif category == CatalystCategory.PRODUCT:
            return self.product_level >= 3
        elif category == CatalystCategory.OPEN_DEV:
            return self.technical_level >= 4  # Higher requirement for Open Dev
        elif category == CatalystCategory.OPEN_ECOSYSTEM:
            return self.community_level >= 3
        elif category == CatalystCategory.PARTNERSHIP:
            return self.product_level >= 4  # Higher requirement for Partnership
        return False

    def calculate_proposal_match(self, proposal: ProposalInfo) -> float:
        """Calculate match score (0-1) between reviewer and proposal"""
        # Base score from category match
        if not self.matches_category(proposal.category, proposal.concept_type):
            return 0.0
            
        # Calculate tag expertise match
        tag_scores = [self.tag_expertise.get(tag, 0) / 5 for tag in proposal.tags]
        avg_tag_score = sum(tag_scores) / len(tag_scores) if tag_scores else 0
        
        # Combine category and tag matching
        return (0.6 * self._get_category_score(proposal) + 
                0.4 * avg_tag_score)

    def _get_category_score(self, proposal: ProposalInfo) -> float:
        """Get score (0-1) based on category expertise"""
        if proposal.category == CatalystCategory.OPEN_DEV:
            return self.technical_level / 5
        elif proposal.category == CatalystCategory.OPEN_ECOSYSTEM:
            return self.community_level / 5
        elif proposal.category == CatalystCategory.PRODUCT:
            return self.product_level / 5
        elif proposal.category == CatalystCategory.PARTNERSHIP:
            return max(self.product_level, self.technical_level) / 5
        elif proposal.category == CatalystCategory.CONCEPT:
            if proposal.concept_type == ConceptType.TECHNICAL:
                return self.technical_level / 5
            elif proposal.concept_type == ConceptType.PRODUCT:
                return self.product_level / 5
            elif proposal.concept_type == ConceptType.RESEARCH:
                return max(self.technical_level, self.product_level) / 5
        return 0.0

# Example usage
if __name__ == "__main__":
    # Example proposal
    example_proposal = ProposalInfo(
        proposal_id="prop_123",
        title="DeFi Integration Platform",
        category=CatalystCategory.OPEN_DEV,
        tags={ProposalTag.DEFI, ProposalTag.SMART_CONTRACTS, ProposalTag.INTEROPERABILITY},
        requested_funds=Decimal('100000')
    )
    
    # Example reviewer expertise
    example_expertise = ReviewerExpertise(
        technical_level=4,
        product_level=3,
        community_level=2,
        tag_expertise={
            ProposalTag.DEFI: 4,
            ProposalTag.SMART_CONTRACTS: 5,
            ProposalTag.INTEROPERABILITY: 3
        }
    )
    
    # Calculate match
    match_score = example_expertise.calculate_proposal_match(example_proposal)
    print(f"Match score: {match_score:.2f}")
