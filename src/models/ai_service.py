# This is the first interation of the Open AI integartion
# Missing:
# - trigger in Admin Panel
# - Final Data Scheme (MongoDB and model.py)

from typing import Dict, List, Optional
from datetime import datetime
import openai
from motor.motor_asyncio import AsyncIOMotorClient

class AIService:
    """Service for processing proposals with GPT-4"""
    
    def __init__(self, db: AsyncIOMotorClient, api_key: str):
        self.db = db
        self.api_key = api_key
        openai.api_key = api_key
        
        # Prompt for generating proposal summaries
        self.SUMMARY_SYSTEM_PROMPT = """You are analyzing a Cardano project proposal.
Create a brief technical summary focusing on TWO sections:

1. TECHNICAL IMPLEMENTATION:
- What technologies and tools are needed?
- How does it integrate with Cardano?
- What are the main technical challenges?

2. RESOURCE NEEDS:
- What critical skills/expertise are required?
- What are the key dependencies?
- What are potential bottlenecks?

Keep each section to 2-3 bullet points. Be specific and factual.
If something isn't mentioned in the proposal, note it as 'Not specified'."""

    async def process_fund(self, fund_id: str) -> bool:
        """Process all proposals in a fund with AI summaries"""
        try:
            # TODO: Clarify - Should we process proposals that already have summaries?
            proposals = await self.db.proposals.find({
                "fund_id": fund_id,
                "ai_processed": {"$ne": True}  # Only process unprocessed proposals
            }).to_list(None)

            if not proposals:
                print(f"No unprocessed proposals found for fund {fund_id}")
                return True

            # Process proposals in batches to manage API rate limits
            # TODO: Clarify - What's the optimal batch size? Currently assuming 10
            batch_size = 10
            for i in range(0, len(proposals), batch_size):
                batch = proposals[i:i + batch_size]
                await self._process_proposal_batch(batch)

            return True

        except Exception as e:
            print(f"Failed to process fund {fund_id}: {str(e)}")
            return False

    async def _process_proposal_batch(self, proposals: List[Dict]) -> None:
        """Process a batch of proposals"""
        for proposal in proposals:
            try:
                # Generate summary
                summary = await self._generate_summary(proposal)
                
                # Store results
                await self.db.proposals.update_one(
                    {"proposal_id": proposal["proposal_id"]},
                    {
                        "$set": {
                            "ai_summary": summary["summary"],
                            "ai_processed": True,
                            "ai_processed_at": datetime.utcnow(),
                            "ai_model": "gpt-4"
                        }
                    }
                )
                
                # TODO: Clarify - Should we implement delay between proposals?
                # await asyncio.sleep(1)  # Rate limiting
                
            except Exception as e:
                print(f"Failed to process proposal {proposal['proposal_id']}: {str(e)}")
                # TODO: Clarify - Should we track failed proposals for retry?
                continue

    async def _generate_summary(self, proposal: Dict) -> Dict:
        """Generate AI summary for a proposal"""
        try:
            proposal_content = self._prepare_proposal_content(proposal)
            
            response = await openai.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": self.SUMMARY_SYSTEM_PROMPT},
                    {"role": "user", "content": proposal_content}
                ],
                temperature=0.3,  # Lower temperature for more consistent outputs
                max_tokens=250    # Limit length for concise summaries
            )
            
            return {
                "summary": self._format_summary(response.choices[0].message.content),
                "generated_at": datetime.utcnow(),
                "model": "gpt-4"
            }
            
        except Exception as e:
            print(f"Summary generation failed: {str(e)}")
            return {
                "summary": {
                    "technical_implementation": [],
                    "resource_needs": []
                },
                "error": str(e),
                "generated_at": datetime.utcnow()
            }

    def _prepare_proposal_content(self, proposal: Dict) -> str:
        """Format proposal content for GPT processing"""
        # TODO: Clarify - What other fields might be relevant for technical analysis?
        return f"""
Title: {proposal['title']}

Description:
{proposal['description']}

Additional Context:
- Challenge: {proposal['challenge_category']}
- Tags: {', '.join(proposal['detailed_tags'])}
- Requested Funding: {proposal['requested_funding']} ADA
"""

    def _format_summary(self, content: str) -> Dict:
        """Format the GPT response into structured sections"""
        sections = {
            "technical_implementation": [],
            "resource_needs": []
        }
        
        current_section = None
        for line in content.split('\n'):
            if "TECHNICAL IMPLEMENTATION:" in line:
                current_section = "technical_implementation"
            elif "RESOURCE NEEDS:" in line:
                current_section = "resource_needs"
            elif line.strip().startswith('- ') and current_section:
                sections[current_section].append(line.strip()[2:])
        
        return sections

# Usage example:
# async def main():
#     # Initialize MongoDB client
#     db = AsyncIOMotorClient(MONGODB_URI).get_database()
#     
#     # Initialize AI service
#     ai_service = AIService(
#         db=db,
#         api_key="your-openai-key"
#     )
#     
#     # Process a fund
#     success = await ai_service.process_fund("fund-13")
#     
#     if success:
#         print("Fund processing completed")
#     else:
#         print("Fund processing failed")
