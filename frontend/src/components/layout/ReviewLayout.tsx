// src/components/layout/ReviewLayout.tsx
'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'

interface ReviewLayoutProps {
  children: ReactNode
  reviewData: {
    id: string
    title: string
    author: string
    requestedFunds: string
    summary: string
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
  showProgressSteps?: boolean
  currentStep?: number
}

const reviewSteps = [
  { id: 'relevance', label: 'Relevance' },
  { id: 'innovation', label: 'Innovation' },
  { id: 'impact', label: 'Impact' },
  { id: 'feasibility', label: 'Feasibility' },
  { id: 'team', label: 'Team' },
  { id: 'budget', label: 'Budget' }
]

export default function ReviewLayout({ 
  children, 
  reviewData, 
  showProgressSteps = false,
  currentStep = 0 
}: ReviewLayoutProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'full' | 'challenge'>('overview')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Full Navbar */}
      <Navbar />
      
      {/* Header with proposal info */}
      <div className="bg-white border-b border-gray-200 pt-3 pb-3 mb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-start">
            {/* Left side: Proposal info */}
            <div>
              <div className="mb-2">
                <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 text-sm mb-1 inline-block">
                  ← Back to Dashboard
                </Link>
                <h1 className="text-lg font-bold text-gray-900">{reviewData.title}</h1>
                <p className="text-sm text-gray-600">
                  Requested Funds: {reviewData.requestedFunds}
                </p>
              </div>
              
            </div>

            {/* Right side: Progress Steps (only shown on category pages) */}
            {showProgressSteps && (
              <div className="flex items-center space-x-4">
                {reviewSteps.map((step, index) => {
                  const stepNumber = index + 1
                  const isActive = stepNumber === currentStep
                  const isPast = stepNumber < currentStep
                  
                  return (
                    <div key={step.id} className="flex flex-col items-center">
                      <div className="flex items-center">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center
                          ${isActive ? 'bg-indigo-600 text-white' : 
                            isPast ? 'bg-indigo-100 text-indigo-600' : 
                            'bg-gray-200 text-gray-600'}`}>
                          {stepNumber}
                        </div>
                        {index < reviewSteps.length - 1 && (
                          <div className={`h-1 w-8 ${
                            isPast || isActive ? 'bg-indigo-600' : 'bg-gray-200'
                          } ml-2`}></div>
                        )}
                      </div>
                      <p className={`mt-2 text-sm ${
                        isActive ? 'text-indigo-600 font-medium' : 'text-gray-600'
                      }`}>{step.label}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left side: Proposal details with tabs */}
          <div className="md:w-1/2">
            <div className="bg-white rounded-xl shadow-md">
              {/* Tab Navigation */}
              <div className="border-b border-gray-200">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'overview'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Proposal Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('full')}
                    className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'full'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Full Proposal
                  </button>
                  <button
                    onClick={() => setActiveTab('challenge')}
                    className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
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
              <div className="p-6">
                {activeTab === 'overview' && (
                  <>
                    <div className="mb-6">
                      <h3 className="font-medium text-gray-900 mb-2">Problem Statement</h3>
                      <p className="text-gray-600 text-sm whitespace-pre-line">{reviewData.problemStatement}</p>
                    </div>
                    
                    <div className="mb-6">
                      <h3 className="font-medium text-gray-900 mb-2">Solution Summary</h3>
                      <p className="text-gray-600 text-sm whitespace-pre-line">{reviewData.solution}</p>
                    </div>
                    
                    {/* AI Analysis */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900">🤖 AI Analysis</h3>
                        <div className="relative group">
                          <button className="w-5 h-5 rounded-full bg-indigo-300 hover:bg-indigo-400 flex items-center justify-center text-white text-xs font-bold transition-colors">
                            i
                          </button>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-80">
                            This is the first iteration of our AI Analysis feature. Please provide feedback on whether you found it helpful, unhelpful, or misleading by using the feedback form in the header.
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-md border border-indigo-100">
                        {reviewData.aiSummary ? (
                          <div className="text-gray-700 text-sm whitespace-pre-line leading-relaxed">
                            {reviewData.aiSummary}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm italic">
                            AI Analysis is being generated. Please check back later.
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Team Stats - Placeholder for future addition */}
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Team Stats</h3>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-gray-500 text-sm italic">Team Stats not yet available</p>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'full' && (
                  <>
                    <div className="mb-6">
                      <div className="text-sm text-gray-700 max-h-screen overflow-y-auto leading-relaxed">
                        <div dangerouslySetInnerHTML={{
                          __html: (reviewData.fullProposal?.background || reviewData.solution || 'Full proposal content not available')
                            // Headers formatieren
                            .replace(/###\s*\\\[(.*?)\\\]/g, '<h3 class="font-semibold text-lg mb-2 mt-6 text-gray-900 border-b border-gray-200 pb-1">$1</h3>')
                            .replace(/###\s*(.*?)$/gm, '<h4 class="font-semibold text-base mb-2 mt-4 text-gray-900">$1</h4>')
                            .replace(/##\s*(.*?)$/gm, '<h3 class="font-semibold text-lg mb-2 mt-4 text-gray-900">$1</h3>')
                            .replace(/#\s*(.*?)$/gm, '<h2 class="font-bold text-xl mb-3 mt-5 text-gray-900">$1</h2>')
                            
                            // Fix escaped markdown: \*\* becomes **
                            .replace(/\\\*\\\*(.*?)\\\*\\\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
                            // Regular bold markdown
                            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
                            
                            // Remove all backslashes and square brackets before processing URLs
                            .replace(/\\/g, '')
                            .replace(/[\[\]]/g, '')
                            
                            // Fix complex cases FIRST: url1(url2) -> just url2 as link
                            .replace(/(https?:\/\/[^\s<>"()]+)\((https?:\/\/[^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$2</a>')
                            
                            // Fix URLs in brackets: [https://example.com/] -> clickable link (remove brackets)
                            .replace(/\[(https?:\/\/[^\]]+)\]/g, '<a href="$1" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>')
                            
                            // Remove remaining single brackets around URLs
                            .replace(/\[(<a[^>]*>https?:\/\/[^<]*<\/a>)\]/g, '$1')
                            
                            // Fix URLs in parentheses: (https://example.com/) -> just the clickable link
                            .replace(/\((https?:\/\/[^)]+)\)/g, '<a href="$1" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>')
                            
                            // Fix remaining standalone URLs (but skip ones already processed)
                            .replace(/(^|\s)(https?:\/\/[^\s<>"()]+)(?!\s*<\/a>)/g, '$1<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$2</a>')
                            
                            // Fix escaped backslashes: \\ becomes \
                            .replace(/\\\\/g, '\\')
                            
                            // Handle lists: convert - to bullet points
                            .replace(/^[\s]*-[\s]+(.*?)$/gm, '___LIST_ITEM___$1___END_LIST_ITEM___')
                            
                            // FIX: Clean up excessive whitespace first
                            .replace(/\n\s*\n\s*\n\s*\n/g, '\n\n')  // 4+ line breaks with spaces = 2 breaks
                            .replace(/\n\s*\n\s*\n/g, '\n\n')       // 3 line breaks with spaces = 2 breaks
                            .replace(/\n\s*\n/g, '\n\n')           // line breaks with spaces = clean breaks
                            
                            // Convert list items to proper HTML
                            .replace(/(___LIST_ITEM___.*?___END_LIST_ITEM___(\n|$))+/g, (match) => {
                              const items = match.match(/___LIST_ITEM___(.*?)___END_LIST_ITEM___/g)
                                ?.map(item => item.replace(/___LIST_ITEM___(.*?)___END_LIST_ITEM___/, '<li class="ml-4 list-disc">$1</li>'))
                                .join('')
                              return `<ul class="mb-4 space-y-1">${items}</ul>`
                            })
                            
                            // Now handle paragraph spacing with inline styles
                            .replace(/\n\n+/g, '</p><p style="margin-bottom:6px;color:#4b5563">')
                            .replace(/\n/g, '<br>')
                            
                            // Wrap in paragraph
                            .replace(/^/, '<p style="margin-bottom:6px;color:#4b5563">')
                            .replace(/$/, '</p>')
                            
                            // Clean up empty paragraphs
                            .replace(/<p[^>]*><\/p>/g, '')
                            .replace(/(<p[^>]*>)\s*(<br>\s*)*\s*(<\/p>)/g, '')
                        }} />
                      </div>
                    </div>
                    
                    {/* Old structured content - commented out for F14 MVP 
                    <div className="mb-6">
                      <h3 className="font-medium text-gray-900 mb-2">Approach</h3>
                      <p className="text-gray-600 text-sm">{reviewData.fullProposal.approach}</p>
                    </div>
                    
                    <div className="mb-6">
                      <h3 className="font-medium text-gray-900 mb-2">Timeline</h3>
                      <p className="text-gray-600 text-sm">{reviewData.fullProposal.timeline}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Milestones</h3>
                      <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                        {reviewData.fullProposal.milestones.map((milestone, index) => (
                          <li key={index}>{milestone}</li>
                        ))}
                      </ul>
                    </div>
                    */}
                  </>
                )}

                {activeTab === 'challenge' && reviewData.challengeInfo && (
                  <>
                    
                    {/* Challenge Name & Budget */}
                    <div className="mb-6 pb-6 border-b border-gray-200">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{reviewData.challengeInfo.name}</h3>
                      <p className="text-lg font-semibold text-indigo-600">Budget: ₳{reviewData.challengeInfo.budget.toLocaleString()}</p>
                    </div>

                    {/* Description */}
                    <div className="mb-6">
                      <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                      <p className="text-gray-600 text-sm">{reviewData.challengeInfo.description}</p>
                    </div>
                    
                    {/* Category Requirements */}
                    {reviewData.challengeInfo.categoryRequirements && reviewData.challengeInfo.categoryRequirements.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-medium text-gray-900 mb-2">Category Requirements</h3>
                        <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                          {reviewData.challengeInfo.categoryRequirements.map((req: string, index: number) => (
                            <li key={index}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Overview */}
                    <div className="mb-6">
                      <h3 className="font-medium text-gray-900 mb-2">Overview</h3>
                      <p className="text-gray-600 text-sm whitespace-pre-line">{reviewData.challengeInfo.overview}</p>
                    </div>
                    
                    {/* Who Should Apply */}
                    {reviewData.challengeInfo.whoShouldApply && (
                      <div className="mb-6">
                        <h3 className="font-medium text-gray-900 mb-2">Who should apply</h3>
                        <p className="text-gray-600 text-sm whitespace-pre-line">{reviewData.challengeInfo.whoShouldApply}</p>
                      </div>
                    )}
                    
                    {/* Areas of Interest */}
                    {reviewData.challengeInfo.areasOfInterest && reviewData.challengeInfo.areasOfInterest.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-medium text-gray-900 mb-2">Areas of Interest</h3>
                        <p className="text-gray-600 text-sm mb-2">Proposals should focus on mature R&D for products with Tier-1 collaborations, such as:</p>
                        <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                          {reviewData.challengeInfo.areasOfInterest.map((area, index) => (
                            <li key={index}>{area}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Proposal Guidance */}
                    {reviewData.challengeInfo.proposalGuidance && reviewData.challengeInfo.proposalGuidance.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-medium text-gray-900 mb-2">Proposal Guidance</h3>
                        <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                          {reviewData.challengeInfo.proposalGuidance.map((guide, index) => (
                            <li key={index}>{guide}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Eligibility Criteria */}
                    {reviewData.challengeInfo.eligibilityCriteria && reviewData.challengeInfo.eligibilityCriteria.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-medium text-gray-900 mb-2">Eligibility Criteria</h3>
                        <p className="text-gray-600 text-sm mb-2 font-medium">The following will NOT be funded:</p>
                        <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                          {reviewData.challengeInfo.eligibilityCriteria.map((criteria, index) => (
                            <li key={index}>{criteria}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Right side: Dynamic content from children */}
          <div className="md:w-1/2">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}