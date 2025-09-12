'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/lib/auth'

interface CompletedReview {
  id: string
  proposalTitle: string
  submittedAt: string
  repPoints: number
  scores?: {
    relevance: number
    innovation: number
    impact: number
    feasibility: number
    team: number
    budget: number
  }
  categoryComments?: {
    relevance: string
    innovation: string
    impact: string
    feasibility: string
    team: string
    budget: string
  }
  isDemo: boolean
  isEarlyExit: boolean
  reviewerAssessment?: {
    temperatureCheck: string
    earlyExit: boolean
    qualityIssues?: string[]
    qualityComment?: string
    selfExpertiseLevel?: number
  }
}

export default function MyReviewsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [completedReviews, setCompletedReviews] = useState<CompletedReview[]>([])
  const [loading, setLoading] = useState(true)

  // Auth Guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
      return
    }
  }, [isAuthenticated, isLoading, router])

  // Fetch completed reviews
  useEffect(() => {
    const fetchCompletedReviews = async () => {
      if (!isAuthenticated) return

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reviews/completed`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('trustlevel-token')}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setCompletedReviews(data)
        }
      } catch (error) {
        console.error('Error fetching completed reviews:', error)
        // Mock data for development
        setCompletedReviews([])
      } finally {
        setLoading(false)
      }
    }

    fetchCompletedReviews()
  }, [isAuthenticated])

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Checking authentication...</div>
      </div>
    )
  }

  // Show nothing while redirecting
  if (!isAuthenticated) {
    return null
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getCategoryScoreColor = (score: number) => {
    if (score >= 2) return 'text-green-600'
    if (score >= 0) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="mb-4">
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 text-sm mb-1 inline-block">
                ← Back to Dashboard
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Completed Reviews</h1>
            <p className="text-gray-600">
              Reviews you have completed and submitted ({completedReviews.length} total)
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-lg text-gray-600">Loading completed reviews...</div>
            </div>
          ) : completedReviews.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="text-gray-500 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No completed reviews yet</h3>
              <p className="text-gray-500">
                Once you complete and submit reviews, they will appear here with your scores and comments.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {completedReviews.map((review) => (
                <div key={review.id} className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{review.proposalTitle}</h3>
                        {review.isDemo && (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            DEMO
                          </span>
                        )}
                        {review.isEarlyExit && (
                          <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                            EARLY EXIT
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                        Submitted on {formatDate(review.submittedAt)} • Earned {review.repPoints} REP Points
                        {review.isEarlyExit && ' • Quality Assessment Only'}
                      </p>
                    </div>
                  </div>

                  {/* Early Exit Quality Assessment */}
                  {review.isEarlyExit && review.reviewerAssessment ? (
                    <div className="space-y-4">
                      {/* Temperature Check */}
                      <div className="bg-orange-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900">Quality Assessment</h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            review.reviewerAssessment.temperatureCheck === 'low-quality'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {review.reviewerAssessment.temperatureCheck === 'low-quality' ? 'Low Quality' : 'Promising'}
                          </span>
                        </div>
                        
                        {/* Expertise Level */}
                        {review.reviewerAssessment.selfExpertiseLevel && (
                          <p className="text-sm text-gray-600 mb-3">
                            Self-assessed expertise level: {review.reviewerAssessment.selfExpertiseLevel}/5
                          </p>
                        )}

                        {/* Quality Issues */}
                        {review.reviewerAssessment.qualityIssues && review.reviewerAssessment.qualityIssues.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Quality Issues Identified:</h5>
                            <ul className="space-y-1">
                              {review.reviewerAssessment.qualityIssues.map((issue, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                                  <span className="text-sm text-gray-700">{issue}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Quality Comment */}
                        {review.reviewerAssessment.qualityComment && (
                          <div className="border-l-4 border-orange-300 pl-4">
                            <h5 className="text-sm font-medium text-gray-700 mb-1">Assessment Comment</h5>
                            <p className="text-sm text-gray-700">{review.reviewerAssessment.qualityComment}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Combined Score + Comment boxes */}
                      {review.scores && Object.entries(review.scores).map(([category, score]) => (
                        <div key={category} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-start gap-6">
                            {/* Left: Category name and score */}
                            <div className="flex-shrink-0 w-32">
                              <div className="text-sm font-medium text-gray-600 capitalize mb-1">
                                {category}
                              </div>
                              <div className={`text-lg font-bold ${getCategoryScoreColor(score)}`}>
                                {score > 0 ? '+' : ''}{score}
                              </div>
                            </div>
                            
                            {/* Right: Comment for this category */}
                            <div className="flex-1">
                              {review.categoryComments && review.categoryComments[category as keyof typeof review.categoryComments] ? (
                                <p className="text-gray-700 text-sm">
                                  {review.categoryComments[category as keyof typeof review.categoryComments]}
                                </p>
                              ) : (
                                <p className="text-gray-400 text-sm italic">No comment provided</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}