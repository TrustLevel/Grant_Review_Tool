// src/app/reviews/[id]/page.tsx
'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/auth'
import ReviewLayout from '@/components/layout/ReviewLayout'

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

export default function ReviewPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params)
  const router = useRouter()
  const { token, isAuthenticated, isLoading, refreshUser } = useAuth()
  const [review, setReview] = useState<ReviewDetails | null>(null)
  const [expertise, setExpertise] = useState(3)
  const [loading, setLoading] = useState(true)
  const [temperatureCheck, setTemperatureCheck] = useState<'promising' | 'low-quality' | null>(null)
  const [selectedIssues, setSelectedIssues] = useState<string[]>([])
  const [issueComment, setIssueComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')

  // Auth Guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('Not authenticated, redirecting to landing page')
      router.push('/')
      return
    }
  }, [isAuthenticated, isLoading, router])

  // Save assessment data when temperature check is made
  const saveAssessment = async () => {
    if (!temperatureCheck || !token) return
    
    try {
      const payload = {
        selfExpertise: expertise,
        temperatureCheck: temperatureCheck,
        qualityIssues: temperatureCheck === 'low-quality' ? selectedIssues : [],
        qualityComment: temperatureCheck === 'low-quality' ? issueComment : ''
      }
      
      console.log('Saving assessment:', payload)
      console.log('API URL:', `${process.env.NEXT_PUBLIC_API_URL}/api/reviews/${id}/assessment`)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reviews/${id}/assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('API Error:', response.status, errorData)
        throw new Error(`Failed to save assessment: ${response.status} - ${errorData}`)
      }

      const data = await response.json()
      console.log('Assessment saved:', data)
      
    } catch (error) {
      console.error('Error saving assessment:', error)
      setSubmitMessage('Error saving assessment. Please try again.')
    }
  }

  // Submit early exit review
  const submitEarlyExit = async () => {
    setIsSubmitting(true)
    setSubmitMessage('')
    
    try {
      // First save assessment if not already saved
      await saveAssessment()
      
      // Then submit early exit
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reviews/${id}/submit-early`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('Early exit API Error:', response.status, errorData)
        throw new Error(`Failed to submit early exit: ${response.status} - ${errorData}`)
      }

      const data = await response.json()
      console.log('Early exit submitted:', data)
      setSubmitMessage('Review submitted successfully!')
      
      // Refresh user data to update REP points in UI
      await refreshUser()
      
      // Navigate to dashboard after short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
      
    } catch (error) {
      console.error('Error submitting early exit:', error)
      setSubmitMessage('Error submitting review. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Save assessment when temperature check changes
  useEffect(() => {
    if (temperatureCheck && token) {
      saveAssessment()
    }
  }, [temperatureCheck, selectedIssues, issueComment, expertise])

  // Fetch review data
  useEffect(() => {
    if (!isAuthenticated || !token) return
    
    // Fetch review details from API
    
    // OLD: fetch(`http://localhost:3001/api/reviews/${id}`, {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reviews/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(async res => {
        if (!res.ok) {
          const error = await res.text()
          throw new Error(`Review API failed: ${res.status} - ${error}`)
        }
        return res.json()
      })
      .then(data => {
        console.log('Review data received:', data)
        setReview(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching review:', err)
        alert(`Failed to load review: ${err.message}`)
        setLoading(false)
      })
  }, [id, isAuthenticated, token])

  // Show loading while checking auth
  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 p-8">Checking authentication...</div>
  }

  // Show nothing while redirecting
  if (!isAuthenticated) {
    return null
  }

  if (loading) return <div className="min-h-screen bg-gray-50 p-8">Loading...</div>
  if (!review) return <div className="min-h-screen bg-gray-50 p-8">Review not found</div>

  return (
    <ReviewLayout reviewData={review} showProgressSteps={false}>
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-semibold text-gray-900">1. Rate Your Expertise</h3>
          <div className="relative group">
            <button className="w-5 h-5 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center text-white text-xs font-bold transition-colors">
              ?
            </button>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-64">
              This helps to understand your perspective and will affect your weighting in the evaluation of this proposal - and your overall reputation, depending on the outcome of this proposal.
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
            </div>
          </div>
        </div>
        <p className="text-gray-600 mb-4 text-sm">How familiar are you with the subject matter of this proposal?</p>
        
        {/* Expertise Scale */}
        <div className="bg-gray-50 p-6 rounded-md mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-600">Not familiar</span>
            <span className="text-sm text-gray-600">Expert</span>
          </div>
          
          <div className="relative mb-4">
            <div className="h-1 w-full bg-gray-300 rounded-full"></div>
            <div className="absolute top-0 flex justify-between w-full">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setExpertise(value)}
                  className={`h-4 w-4 rounded-full ${
                    value === expertise ? 'bg-indigo-600' : 'bg-gray-300'
                  } -mt-1.5 cursor-pointer hover:bg-indigo-500 transition-colors`}
                />
              ))}
            </div>
          </div>
          
          <p className="text-sm text-gray-600">
            Selected: {expertise} - {
              expertise === 1 ? 'No knowledge' :
              expertise === 2 ? 'Basic knowledge' :
              expertise === 3 ? 'Intermediate knowledge' :
              expertise === 4 ? 'Advanced knowledge' :
              'Expert knowledge'
            }
          </p>
        </div>

        {/* Temperature Check Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-semibold text-gray-900">2. Proposal Temperature Check</h3>
            <div className="relative group">
              <button className="w-5 h-5 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center text-white text-xs font-bold transition-colors">
                ?
              </button>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-64">
                Our goal is for you to spend your time reviewing proposals that are worth it. Therefore, you can already mark a proposal as “ low-quality” in the first step if it does not meet the minimum requirements.
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
              </div>
            </div>
          </div>
          <p className="text-gray-600 mb-4 text-sm">Does this proposal meet the minimum requirements?</p>

          {/* Temperature Check Options */}
          <div className="flex gap-3 mb-4">
            <button 
              onClick={() => {
                setTemperatureCheck('promising')
                setSelectedIssues([])
                setIssueComment('')
              }}
              className={`flex-1 p-4 border-2 rounded-lg transition-colors text-left ${
                temperatureCheck === 'promising' 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="text-green-700">✓ Yes</span>
            </button>
            
            <button 
              onClick={() => setTemperatureCheck('low-quality')}
              className={`flex-1 p-4 border-2 rounded-lg transition-colors text-left ${
                temperatureCheck === 'low-quality' 
                  ? 'border-red-500 bg-red-50' 
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="text-red-700">⚠️ No</span>
            </button>
          </div>

          {/* Minimum Requirements Info (shown when promising is selected) */}
          {temperatureCheck === 'promising' && (
            <div className="border border-gray-200 rounded-lg p-4 bg-green-50 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-3">This proposal can prove the following:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Team members and their skills are verifiable</li>
                <li>• Impact claims are supported by evidence / past experience</li>
                <li>• Direct alignment with challenge objectives</li>
                <li>• Budget is clearly justifed and reasonable</li>
              </ul>
            </div>
          )}

          {/* Issues Selection (only shown when low quality is selected) */}
          {temperatureCheck === 'low-quality' && (
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <p className="text-sm font-medium text-gray-700 mb-3">Select issues:</p>
              <div className="flex flex-col gap-2 mb-3">
                {[
                  'Team information is not verifiable', 
                  'No alignment with challenge objectives',
                  'Budget is poorly justified or unreasonable',
                  'Impact claims are not supported by evidence',
                  'Vague in objectives and/or implementation plan',
                  'Incomplete proposal'
                ].map((issue) => (
                  <button
                    key={issue}
                    onClick={() => {
                      setSelectedIssues(prev => 
                        prev.includes(issue) 
                          ? prev.filter(i => i !== issue)
                          : [...prev, issue]
                      )
                    }}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedIssues.includes(issue)
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {issue}
                  </button>
                ))}
              </div>
              
              <div>
                <label className="text-sm text-gray-700">Brief comment (optional):</label>
                <textarea
                  value={issueComment}
                  onChange={(e) => setIssueComment(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-500 bg-white focus:ring-indigo-500 focus:border-indigo-500 resize-y min-h-[80px]"
                  placeholder="Add a brief comment..."
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-4">
          {temperatureCheck === 'low-quality' ? (
            <>
              <div className="relative group flex-1">
                <button
                  onClick={submitEarlyExit}
                  disabled={isSubmitting || selectedIssues.length === 0}
                  className="w-full bg-red-600 text-white text-center px-6 py-2 rounded-full text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit & Next Proposal'}
                  <span className="w-4 h-4 rounded-full bg-red-800 flex items-center justify-center text-white text-xs font-bold">
                    ?
                  </span>
                </button>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-64">
                  Submit your temperature check and move to the next proposal.
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                </div>
              </div>
              <div className="relative group flex-1">
                <Link
                  href={`/reviews/${id}/relevance`}
                  className="w-full bg-gray-100 text-gray-600 text-center px-6 py-2 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  Continue to Full Review
                  <span className="w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-bold">
                    ?
                  </span>
                </Link>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-64">
                  Proceed with the detailed 6-category review despite identifying quality issues.
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                </div>
              </div>
            </>
          ) : temperatureCheck === 'promising' ? (
            <>
              <Link
                href={`/reviews/${id}/relevance`}
                className="flex-1 bg-indigo-600 text-white text-center px-8 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Start Review →
              </Link>
            </>
          ) : (
            <div className="flex-1 bg-gray-200 text-gray-500 text-center px-8 py-2 rounded-full text-sm font-medium">
              Please make a temperature check selection above
            </div>
          )}
        </div>

        {/* Status Messages */}
        {submitMessage && (
          <div className={`text-center py-2 px-4 rounded-md ${
            submitMessage.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {submitMessage}
          </div>
        )}
      </div>
    </ReviewLayout>
  )
}