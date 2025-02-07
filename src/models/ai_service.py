# This is the first interation of the Open AI integartion
# Missing:
# - trigger in Admin Panel
# - Final Data Scheme (MongoDB and model.py)

from typing import List, Dict, Optional
import openai
from datetime import datetime

class AIProcessor:
    """Service for processing proposals with AI capabilities"""
    
    def __init__(self, db, api_key: str):
        self.db = db
        openai.api_key = api_key
        
    async def process_fund(self, fund_id: str) -> bool:
        """Process all proposals in a fund with AI"""
        try:
            # Get all proposals for fund
            proposals = await self.db.proposals.find({"fund_id": fund_id}).to_list(None)
            if not proposals:
                raise Exception(f"No proposals found for fund {fund_id}")

            results = []
            for proposal in proposals:
                # Generate summary
                summary = await self._generate_summary(proposal)
                
                # Check for AI content
                ai_score = await self._detect_ai_content(proposal["description"])
                
                # Store results
                result = {
                    "proposal_id": proposal["proposal_id"],
                    "ai_summary": summary,
                    "ai_content_score": ai_score,
                    "processed_at": datetime.utcnow()
                }
                results.append(result)
                
            # Store all results in a single transaction
            async with await self.db.client.start_session() as session:
                async with session.start_transaction():
                    for result in results:
                        await self.db.proposals.update_one(
                            {"proposal_id": result["proposal_id"]},
                            {"$set": {
                                "ai_summary": result["ai_summary"],
                                "ai_content_score": result["ai_content_score"],
                                "ai_processed_at": result["processed_at"]
                            }},
                            session=session
                        )
            
            return True
            
        except Exception as e:
            print(f"Failed to process fund {fund_id} with AI: {str(e)}")
            return False

    async def _generate_summary(self, proposal: Dict) -> str:
        """Generate AI summary for a proposal"""
        try:
            # Combine relevant proposal fields
            content = f"""
            Title: {proposal['title']}
            Description: {proposal['description']}
            Requested Funding: {proposal['requested_funding']}
            """
            
            response = await openai.chat.completions.create(
                model="gpt-4",
                messages=[{
                    "role": "system",
                    "content": "Create a concise 2-3 sentence summary of this Catalyst proposal, focusing on the main problem it solves and its proposed solution."
                }, {
                    "role": "user",
                    "content": content
                }]
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"Failed to generate summary: {str(e)}")
            return ""

    async def _detect_ai_content(self, text: str) -> float:
        """Detect likelihood of AI-generated content"""
        try:
            response = await openai.chat.completions.create(
                model="gpt-4",
                messages=[{
                    "role": "system",
                    "content": "Analyze the following text and estimate the likelihood (0-1) that it was AI-generated. Respond with only a number."
                }, {
                    "role": "user",
                    "content": text
                }]
            )
            
            score = float(response.choices[0].message.content.strip())
            return min(max(score, 0), 1)  # Ensure score is between 0 and 1
            
        except Exception as e:
            print(f"Failed to detect AI content: {str(e)}")
            return 0.0

# Usage Example:
# processor = AIProcessor(db=db, api_key="YOUR_OPENAI_KEY")
# success = await processor.process_fund("fund-13")
