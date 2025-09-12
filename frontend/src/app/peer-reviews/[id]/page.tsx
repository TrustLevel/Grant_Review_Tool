// src/app/peer-reviews/[id]/page.tsx
'use client'

import { use, useEffect, useState } from 'react'
import { useAuthFetch } from '@/app/lib/auth'
import Navbar from '@/components/layout/Navbar'

interface ReviewDetails {
  id: string
  title: string
  summary: string
  author: string
  requestedFunds: string
  problemStatement: string
  solution: string
  aiSummary?: string | null
  aiSummaryGeneratedAt?: string | null
  teamStats: {
    size: string
    previousProjects: string
    githubActivity: string
    completionRate: string
  }
  fullProposal?: {
    background: string
    approach: string
    timeline: string
    milestones: string[]
  }
  challengeInfo?: {
    name: string
    description: string
    budget: number
    overview: string
    whoShouldApply?: string
    areasOfInterest: string[]
    proposalGuidance: string[]
    eligibilityCriteria: string[]
    categoryRequirements?: string[]
  }
  tags: string[]
}

interface PeerReviewData {
  assignment: {
    id: string
    reviewId: string
    proposalId: string
    proposalTitle: string
    reviewerName: string
    assignedTo: string
    status: string
    dueDate: string
    reward: string
  }
  review: {
    id: string
    proposalId: string
    proposalTitle: string
    reviewerId: string
    reviewerName: string
    submittedAt: string
    expertise: number
    temperatureCheck: string
    temperatureCheckIssues?: string[]
    temperatureCheckComment?: string
    ratings: {
      [key: string]: {
        score: number
        comment: string
      }
    }
  }
  proposal: {
    id: string
    title: string
    author: string
    requestedFunds: string
    summary: string
    tags: string[]
  }
}

const reviewCategories = [
  { id: 'relevance', label: 'Relevance' },
  { id: 'innovation', label: 'Innovation' },
  { id: 'impact', label: 'Impact' },
  { id: 'feasibility', label: 'Feasibility' },
  { id: 'team', label: 'Team' },
  { id: 'budget', label: 'Budget' }
]

const assessmentCriteria = [
  {
    id: 'specificity',
    title: 'Specificity',
    question: 'How specific is the review in addressing key proposal elements?',
    leftLabel: 'Generic',
    rightLabel: 'Specific'
  },
  {
    id: 'clarity',
    title: 'Clarity',
    question: 'How clearly does the reviewer state and justify their position?',
    leftLabel: 'Unclear',
    rightLabel: 'Clear'
  },
  {
    id: 'insightful',
    title: 'Insightful',
    question: 'Does the review provide meaningful insights and valuable perspective?',
    leftLabel: 'Basic',
    rightLabel: 'Insightful'
  }
]

// Proposal Content Component
function ProposalContent({ proposalDetails }: { proposalDetails: ReviewDetails | null }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'full' | 'challenge'>('overview')

  if (!proposalDetails) return <div className="p-6">Loading proposal details...</div>

  return (
    <div className="flex flex-col h-full">
      {/* Header with Proposal Info */}
      <div className="p-6 border-b border-gray-200">
        <div className="pr-12">
          <div className="mb-2">
            <a href="/dashboard" className="text-blue-600 hover:text-blue-800 text-xs mb-1 inline-block">
              ← Back to Dashboard
            </a>
            <h2 className="text-lg font-semibold text-gray-900">{proposalDetails.title}</h2>
            <p className="text-sm text-gray-600">
              Requested Funds: {proposalDetails.requestedFunds}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Proposal Overview
          </button>
          <button
            onClick={() => setActiveTab('full')}
            className={`flex-1 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'full'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Full Proposal
          </button>
          <button
            onClick={() => setActiveTab('challenge')}
            className={`flex-1 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'challenge'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Challenge Description
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-1">Problem Statement</h4>
              <p className="text-xs text-gray-600 whitespace-pre-line">{proposalDetails.problemStatement}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-1">Solution Summary</h4>
              <p className="text-xs text-gray-600 whitespace-pre-line">{proposalDetails.solution}</p>
            </div>
            
            {/* AI Analysis */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm text-gray-900">🤖 AI Analysis</h4>
                <div className="relative group">
                  <button className="w-4 h-4 rounded-full bg-indigo-300 hover:bg-indigo-400 flex items-center justify-center text-white text-xs font-bold transition-colors">
                    i
                  </button>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-80">
                    This is the first iteration of our AI Analysis feature. Please provide feedback on whether you found it helpful, unhelpful, or misleading by using the feedback form in the header.
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3 rounded-md border border-indigo-100">
                {proposalDetails.aiSummary ? (
                  <div className="text-gray-700 text-xs whitespace-pre-line leading-relaxed">
                    {proposalDetails.aiSummary}
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs italic">
                    AI Analysis is being generated. Please check back later.
                  </p>
                )}
              </div>
            </div>
            
            {/* Team Stats - Placeholder for future addition */}
            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-1">Team Stats</h4>
              <div className="bg-gray-50 p-2 rounded-md">
                <p className="text-xs text-gray-500 italic">Team Stats not yet available</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'full' && (
          <div className="text-xs text-gray-700 max-h-screen overflow-y-auto leading-relaxed">
            <div dangerouslySetInnerHTML={{
              __html: (proposalDetails?.fullProposal?.background || proposalDetails?.solution || 'Full proposal content not available')
                // Headers formatieren
                .replace(/###\s*\\\[(.*?)\\\]/g, '<h3 class="font-semibold text-sm mb-1 mt-4 text-gray-900 border-b border-gray-200 pb-1">$1</h3>')
                .replace(/###\s*(.*?)$/gm, '<h4 class="font-semibold text-xs mb-1 mt-3 text-gray-900">$1</h4>')
                .replace(/##\s*(.*?)$/gm, '<h3 class="font-semibold text-sm mb-1 mt-3 text-gray-900">$1</h3>')
                .replace(/#\s*(.*?)$/gm, '<h2 class="font-bold text-sm mb-2 mt-4 text-gray-900">$1</h2>')
                .replace(/\*\*(.*?)\*\*/g, '<strong class="font-medium text-gray-900">$1</strong>')
                
                // FIX: Clean up excessive whitespace first
                .replace(/\n\s*\n\s*\n\s*\n/g, '\n\n')  // 4+ line breaks with spaces = 2 breaks
                .replace(/\n\s*\n\s*\n/g, '\n\n')       // 3 line breaks with spaces = 2 breaks
                .replace(/\n\s*\n/g, '\n\n')           // line breaks with spaces = clean breaks
                
                // Now handle paragraph spacing with inline styles
                .replace(/\n\n+/g, '</p><p style="margin-bottom:4px;color:#4b5563;font-size:0.75rem">')
                .replace(/\n/g, '<br>')
                
                // Wrap in paragraph
                .replace(/^/, '<p style="margin-bottom:4px;color:#4b5563;font-size:0.75rem">')
                .replace(/$/, '</p>')
                
                // Clean up empty paragraphs
                .replace(/<p[^>]*><\/p>/g, '')
                .replace(/(<p[^>]*>)\s*(<br>\s*)*\s*(<\/p>)/g, '')
            }} />
          </div>
        )}

        {activeTab === 'challenge' && proposalDetails.challengeInfo && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-1">Challenge Name</h4>
              <p className="text-xs text-gray-900 font-semibold">{proposalDetails.challengeInfo.name}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-1">Description</h4>
              <p className="text-xs text-gray-600">{proposalDetails.challengeInfo.description}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-1">Total Budget</h4>
              <p className="text-xs text-gray-900 font-semibold">₳{proposalDetails.challengeInfo.budget.toLocaleString()}</p>
            </div>

            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-1">Overview</h4>
              <p className="text-xs text-gray-600">{proposalDetails.challengeInfo.overview}</p>
            </div>

            {proposalDetails.challengeInfo.whoShouldApply && (
              <div>
                <h4 className="font-medium text-sm text-gray-900 mb-1">Who Should Apply</h4>
                <p className="text-xs text-gray-600">{proposalDetails.challengeInfo.whoShouldApply}</p>
              </div>
            )}

            {proposalDetails.challengeInfo.areasOfInterest.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-gray-900 mb-1">Areas of Interest</h4>
                <ul className="list-disc list-inside text-xs text-gray-600 space-y-0.5">
                  {proposalDetails.challengeInfo.areasOfInterest.map((area, index) => (
                    <li key={index}>{area}</li>
                  ))}
                </ul>
              </div>
            )}

            {proposalDetails.challengeInfo.proposalGuidance.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-gray-900 mb-1">Proposal Guidance</h4>
                <ul className="list-disc list-inside text-xs text-gray-600 space-y-0.5">
                  {proposalDetails.challengeInfo.proposalGuidance.map((guidance, index) => (
                    <li key={index}>{guidance}</li>
                  ))}
                </ul>
              </div>
            )}

            {proposalDetails.challengeInfo.categoryRequirements && proposalDetails.challengeInfo.categoryRequirements.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-gray-900 mb-1">Category Requirements</h4>
                <ul className="list-disc list-inside text-xs text-gray-600 space-y-0.5">
                  {proposalDetails.challengeInfo.categoryRequirements.map((requirement, index) => (
                    <li key={index}>{requirement}</li>
                  ))}
                </ul>
              </div>
            )}

            {proposalDetails.challengeInfo.eligibilityCriteria.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-gray-900 mb-1">Eligibility Criteria</h4>
                <ul className="list-disc list-inside text-xs text-gray-600 space-y-0.5">
                  {proposalDetails.challengeInfo.eligibilityCriteria.map((criteria, index) => (
                    <li key={index}>{criteria}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PeerReviewPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params)
  const { authFetch } = useAuthFetch()
  const [data, setData] = useState<PeerReviewData | null>(null)
  const [proposalDetails, setProposalDetails] = useState<ReviewDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [showProposal, setShowProposal] = useState(true)
  const [showAssessment, setShowAssessment] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['relevance'])
  const [assessments, setAssessments] = useState<{ [key: string]: number }>({
    specificity: 0,
    clarity: 0,
    insightful: 0
  })
  const [feedback, setFeedback] = useState('')
  const [lowQualityAgreement, setLowQualityAgreement] = useState<boolean | null>(null)
  const [lowQualityComment, setLowQualityComment] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch peer review data
        // OLD: const peerReviewRes = await authFetch(`http://localhost:3001/api/peer-reviews?id=${id}`);
        const peerReviewRes = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/peer-reviews?id=${id}`);
        if (!peerReviewRes.ok) {
          throw new Error('Failed to fetch peer review data');
        }
        const peerReviewData = await peerReviewRes.json();
        setData(peerReviewData);

        // Fetch full proposal details  
        // OLD: const proposalRes = await authFetch(`http://localhost:3001/api/reviews/${peerReviewData.proposal.id}`);
        const proposalRes = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reviews/${peerReviewData.proposal.id}`);
        if (!proposalRes.ok) {
          throw new Error('Failed to fetch proposal data');
        }
        const proposalData = await proposalRes.json();
        setProposalDetails(proposalData);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setLoading(false);
      }
    };

    fetchData();
  }, [id])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const getScoreColor = (score: number) => {
    if (score > 0) return 'bg-indigo-600'
    if (score < 0) return 'bg-red-500'
    return 'bg-gray-400'
  }

  const getScoreWidth = (score: number) => {
    // Convert -3 to +3 scale to 0-100% width
    const percentage = ((score + 3) / 6) * 100
    return `${percentage}%`
  }

  const handleSubmit = async () => {
    try {
      // Prepare payload based on review type
      let payload;
      
      if (data?.review.temperatureCheck === 'low-quality') {
        // Low quality agreement assessment
        if (lowQualityAgreement === null) {
          alert('Please select whether you agree with the low quality assessment.');
          return;
        }
        
        payload = {
          assessmentType: 'low-quality-agreement',
          lowQualityAgreement: {
            agree: lowQualityAgreement,
            comment: lowQualityComment.trim()
          }
        };
      } else {
        // Normal 3-criteria assessment
        // Validate that all scores are set (not 0 by default)
        const hasUnsetScores = Object.values(assessments).some(score => score === 0);
        if (hasUnsetScores) {
          alert('Please provide scores for all three criteria.');
          return;
        }
        
        payload = {
          assessmentType: 'normal',
          assessments,
          feedback: feedback.trim()
        };
      }

      const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/peer-reviews/${id}/assessment`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit assessment');
      }

      const result = await response.json();
      console.log('Assessment submitted successfully:', result);
      
      // Redirect to dashboard after successful submission
      window.location.href = '/dashboard';
      
    } catch (error) {
      console.error('Submission error:', error);
      alert(`Failed to submit assessment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-50 p-8">Loading...</div>
  if (!data) return <div className="min-h-screen bg-gray-50 p-8">Peer review not found</div>

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Full Navbar */}
      <Navbar />

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <div className="flex gap-4">
          {/* Left Panel - Proposal (Collapsible) */}
          <div className={`transition-all duration-300 ${
            showProposal 
              ? 'w-1/3' 
              : 'w-20'
          }`}>
            <div className="bg-white rounded-xl shadow-md h-full relative">
              <button
                onClick={() => setShowProposal(!showProposal)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center hover:bg-gray-700 transition-colors z-10"
              >
                <span className="text-white">{showProposal ? '←' : '→'}</span>
              </button>
              
              {!showProposal ? (
                <div className="h-full flex items-center justify-center">
                  <div className="transform -rotate-90 whitespace-nowrap text-lg font-semibold text-gray-900">
                    Proposal #{data.proposal.id}
                  </div>
                </div>
              ) : (
                <ProposalContent proposalDetails={proposalDetails} />
              )}
            </div>
          </div>

          {/* Center Panel - Review Content */}
          <div className={`transition-all duration-300 ${
            showProposal && showAssessment 
              ? 'w-1/3' 
              : showProposal || showAssessment
              ? 'w-1/2'
              : 'flex-1'
          }`}>
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="mb-6 pr-12">
                <h2 className="text-lg font-semibold text-gray-900">Review Content</h2>
              </div>

              {/* Temperature Check Info */}
              {data.review.temperatureCheck === 'promising' && (
                <div className="mb-6 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✨</span>
                    <p className="text-sm font-medium text-green-700">
                      This proposal passed the reviewer&apos;s temperature check
                    </p>
                  </div>
                </div>
              )}
              
              {data.review.temperatureCheck === 'low-quality' && (
                <div className="mb-6 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-yellow-600">⚠️</span>
                    <p className="text-sm font-medium text-yellow-800">
                      The Reviewer flagged this proposal as low quality
                    </p>
                  </div>
                  
                  {/* Issue Tags */}
                  {data.review.temperatureCheckIssues && data.review.temperatureCheckIssues.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {data.review.temperatureCheckIssues.map((issue, index) => (
                        <span key={index} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                          {issue}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Optional Comment */}
                  {data.review.temperatureCheckComment && (
                    <p className="text-sm text-yellow-700 italic">
                      &quot;{data.review.temperatureCheckComment}&quot;
                    </p>
                  )}
                </div>
              )}

              {/* Review Categories */}
              <div className="space-y-4">
                {reviewCategories
                  .filter(category => {
                    const rating = data.review.ratings[category.id]
                    // Only show categories that have actual rating data
                    return rating && (rating.score !== null && rating.score !== undefined)
                  })
                  .map(category => {
                  const isExpanded = expandedCategories.includes(category.id)
                  const rating = data.review.ratings[category.id]
                  
                  return (
                    <div key={category.id} className="bg-gray-50 rounded-lg overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900">{category.label}</h3>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-48 relative">
                                <div className="h-1.5 w-full bg-gray-300 rounded-full"></div>
                                <div 
                                  className={`h-1.5 rounded-full absolute top-0 left-0 ${getScoreColor(rating.score)}`}
                                  style={{ width: getScoreWidth(rating.score) }}
                                ></div>
                              </div>
                              <span className={`text-sm font-medium min-w-[30px] text-right ${rating.score > 0 ? 'text-indigo-600' : rating.score < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                {rating.score > 0 ? '+' : ''}{rating.score}
                              </span>
                            </div>
                            
                            <button
                              onClick={() => toggleCategory(category.id)}
                              className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center hover:bg-gray-700 transition-colors"
                            >
                              <span className="text-white text-sm">{isExpanded ? '↑' : '↓'}</span>
                            </button>
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="mt-4 bg-white p-4 rounded-md">
                            <p className="text-sm text-gray-700">{rating.comment}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Panel - Quality Assessment (Collapsible) */}
          <div className={`transition-all duration-300 ${
            showAssessment 
              ? showProposal 
                ? 'w-1/3'
                : 'w-1/2'
              : 'w-20'
          }`}>
            <div className="bg-white rounded-xl shadow-md h-full relative">
              <button
                onClick={() => setShowAssessment(!showAssessment)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center hover:bg-gray-700 transition-colors z-10"
              >
                <span className="text-white">{showAssessment ? '→' : '←'}</span>
              </button>

              {!showAssessment ? (
                <div className="h-full flex items-center justify-center">
                  <div className="transform -rotate-90 whitespace-nowrap text-lg font-semibold text-gray-900">
                    Quality Assessment
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="mb-6 pr-12">
                    <h2 className="text-lg font-semibold text-gray-900">Your Peer-Review</h2>
                    <p className="text-sm text-gray-600">
                      {data.review.temperatureCheck === 'low-quality' 
                        ? 'The reviewer flagged this proposal as low quality. Do you agree with this assessment?'
                        : 'Rate the quality of the review from the middle column.'
                      }
                    </p>
                  </div>

                  {/* Conditional Assessment UI based on temperatureCheck */}
                  {data.review.temperatureCheck === 'low-quality' ? (
                    /* Low Quality Agreement Assessment */
                    <div className="space-y-6">
                      <div>
                        <div className="space-y-3">
                          <button
                            onClick={() => setLowQualityAgreement(true)}
                            className={`w-full p-4 border-2 rounded-lg transition-colors text-left ${
                              lowQualityAgreement === true
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <span className="text-gray-700 font-medium">
                              ✓ Yes, I agree with this assessment
                            </span>
                          </button>
                          
                          <button
                            onClick={() => setLowQualityAgreement(false)}
                            className={`w-full p-4 border-2 rounded-lg transition-colors text-left ${
                              lowQualityAgreement === false
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <span className="text-gray-700 font-medium">
                              ✗ No, I disagree with this assessment
                            </span>
                          </button>
                        </div>
                      </div>
                      
                      {/* Optional Comment for Low Quality Agreement */}
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Optional Comment</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          Explain your agreement or disagreement (optional)
                        </p>
                        
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <textarea
                            value={lowQualityComment}
                            onChange={(e) => setLowQualityComment(e.target.value)}
                            className="w-full h-24 p-3 bg-white rounded-md border border-gray-300 text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                            placeholder="Add your comment here..."
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Normal 3-Criteria Assessment */
                    <>
                      <div className="space-y-6">
                        {assessmentCriteria.map(criterion => (
                          <div key={criterion.id}>
                            <h3 className="font-semibold text-gray-900 mb-1">{criterion.title}</h3>
                            <p className="text-sm text-gray-600 mb-3">&quot;{criterion.question}&quot;</p>
                            
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <div className="flex justify-between mb-2 text-xs">
                                <span className="text-gray-600">{criterion.leftLabel}</span>
                                <span className="text-gray-600">{criterion.rightLabel}</span>
                              </div>
                              
                              <div className="relative mb-3">
                                <div className="h-2 w-full bg-gray-300 rounded-full"></div>
                                <div className="absolute top-0 flex justify-between w-full" style={{ padding: '0 8px' }}>
                                  {[-3, -2, -1, 0, 1, 2, 3].map((value) => (
                                    <button
                                      key={value}
                                      onClick={() => setAssessments(prev => ({ ...prev, [criterion.id]: value }))}
                                      className={`h-4 w-4 rounded-full ${
                                        value === assessments[criterion.id] ? 'bg-indigo-600' : 'bg-gray-400'
                                      } -mt-1 cursor-pointer hover:bg-indigo-500 transition-colors`}
                                    />
                                  ))}
                                </div>
                              </div>
                              
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>-3</span>
                                <span>0</span>
                                <span>+3</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Feedback for Normal Assessment */}
                      <div className="mt-6">
                        <h3 className="font-semibold text-gray-900 mb-1">Additional Feedback (optional)</h3>
                        <p className="text-sm text-gray-600 mb-3">You can provide a more detailed rationale here:</p>

                        <div className="bg-gray-50 p-3 rounded-lg">
                          <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            className="w-full h-32 p-3 bg-white rounded-md border border-gray-300 text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                            placeholder="Your rationale..."
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Submit Button */}
                  <button
                    onClick={handleSubmit}
                    className="w-full mt-6 bg-indigo-600 text-white py-2.5 rounded-full font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Submit Assessment
                  </button>
                  
                  <p className="text-xs text-gray-600 text-center mt-3">
                    Your assessment will be visible to the reviewer anonymously
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}