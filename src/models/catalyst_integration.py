# This is the first iteration of the Catalyst Explorer API Integration
# Missing: 
# - Updated Data Scheme of Catalyst Explorer V2
# - Final Mapping of MongoDB Structure
# - Final Sync with model.py

from typing import List, Dict, Optional
from datetime import datetime
import httpx
from pydantic import BaseModel

class CatalystImportService:
    """Service for importing fund data from Catalyst Explorer API"""
    
    def __init__(self, base_url: str, db, api_key: Optional[str] = None):
        self.base_url = base_url
        self.api_key = api_key
        self.db = db
        self.client = httpx.AsyncClient(
            base_url=base_url,
            headers={"Authorization": f"Bearer {api_key}"} if api_key else {}
        )

    async def import_fund(self, fund_id: str) -> bool:
        """Import complete fund including all proposals"""
        try:
            # Check if fund already exists
            existing_fund = await self.db.funds.find_one({"id": fund_id})
            if existing_fund:
                raise Exception(f"Fund {fund_id} has already been imported")

            # Get fund data
            fund_data = await self._get_fund_data(fund_id)
            
            # Transform to our models
            fund = {
                "id": fund_data["id"],
                "name": fund_data["title"],
                "status": fund_data["status"],
                "start_date": datetime.fromisoformat(fund_data["start_date"]),
                "end_date": datetime.fromisoformat(fund_data["end_date"]),
                "total_budget": float(fund_data["total_budget"]),
                "challenges": []
            }
            
            # Transform challenge data
            for challenge in fund_data["challenges"]:
                challenge_data = {
                    "id": challenge["id"],
                    "fund_id": fund_id,
                    "category": self._map_challenge_category(challenge["category"]),
                    "title": challenge["title"],
                    "description": challenge["description"],
                    "budget": float(challenge["budget"]),
                    "min_requested_funds": float(challenge.get("min_request", 0)),
                    "max_requested_funds": float(challenge.get("max_request", 0)),
                    "status": challenge["status"],
                    "created_at": datetime.now(),
                    "updated_at": datetime.now()
                }
                fund["challenges"].append(challenge_data)

            # Get and transform proposals
            proposals = await self._get_fund_proposals(fund_id)
            
            # Store everything in a single transaction
            async with await self.db.client.start_session() as session:
                async with session.start_transaction():
                    # Store fund data
                    await self.db.funds.insert_one(fund, session=session)
                    
                    # Store proposals if any exist
                    if proposals:
                        await self.db.proposals.insert_many(proposals, session=session)
            
            return True
            
        except Exception as e:
            print(f"Failed to import fund {fund_id}: {str(e)}")
            return False
            
        finally:
            await self.client.aclose()

    async def _get_fund_data(self, fund_id: str) -> Dict:
        """Get fund data from API"""
        response = await self.client.get(f"/funds/{fund_id}")
        response.raise_for_status()
        return response.json()

    async def _get_fund_proposals(self, fund_id: str) -> List[Dict]:
        """Get and transform all proposals for a fund"""
        response = await self.client.get(f"/funds/{fund_id}/proposals")
        response.raise_for_status()
        
        proposals = []
        for prop in response.json():
            proposal = {
                "proposal_id": prop["id"],
                "title": prop["title"],
                "description": prop["description"],
                "challenge_category": self._map_challenge_category(prop["challenge_category"]),
                "primary_tag": self._get_primary_tag(prop["tags"]),
                "detailed_tags": set(prop["tags"]),
                "current_reviews": 0,  # Initial value for new fund
                "requested_funding": float(prop["requested_funds"]),
                "status": prop["status"],
                "created_at": datetime.fromisoformat(prop["created_at"]),
                "external_id": prop["id"]  # Original Catalyst ID
            }
            proposals.append(proposal)
            
        return proposals

    def _map_challenge_category(self, category: str) -> str:
        """Map Catalyst challenge categories to our enum"""
        category_mapping = {
            "development": "product_development",
            "ecosystem": "ecosystem_development",
            "opensource": "open_source_development",
            "partnership": "partnership",
        }
        return category_mapping.get(category.lower(), "concept_development")

    def _get_primary_tag(self, tags: List[str]) -> str:
        """Determine primary tag from list of tags"""
        from models import TAG_MAPPING
        
        for tag_category, tag_set in TAG_MAPPING.items():
            if any(tag in tag_set for tag in tags):
                return tag_category
        
        return "development_tools"  # Default category

# Usage example:
# service = CatalystImportService(
#     base_url="https://api.catalystexplorer.com/v1",
#     db=db,
#     api_key="YOUR_API_KEY"
# )
# success = await service.import_fund("fund-14")
