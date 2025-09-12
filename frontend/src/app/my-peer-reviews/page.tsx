'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/lib/auth'

interface CompletedPeerReview {
  id: string
  proposalTitle: string
  reviewerName: string
  submittedAt: string
  repPoints: number
  assessmentType: 'normal' | 'low-quality-agreement'
  assessments?: {
    specificity: number
    clarity: number
    insightful: number
  }
  lowQualityAgreement?: {
    agree: boolean
    comment: string
  }
  feedback?: string
  overallScore?: number
  isDemo: boolean
}

export default function MyPeerReviewsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [completedPeerReviews, setCompletedPeerReviews] = useState<CompletedPeerReview[]>([])
  const [loading, setLoading] = useState(true)

  // Auth Guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
      return
    }
  }, [isAuthenticated, isLoading, router])

  // Fetch completed peer-reviews
  useEffect(() => {
    const fetchCompletedPeerReviews = async () => {
      if (!isAuthenticated) return

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/peer-reviews/completed`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('trustlevel-token')}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setCompletedPeerReviews(data)
        }
      } catch (error) {
        console.error('Error fetching completed peer-reviews:', error)
        // Mock data for development
        setCompletedPeerReviews([])
      } finally {
        setLoading(false)
      }
    }

    fetchCompletedPeerReviews()
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

  const getScoreColor = (score: number) => {
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Completed Peer-Reviews</h1>
            <p className="text-gray-600">
              Peer-reviews you have completed and submitted ({completedPeerReviews.length} total)
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-lg text-gray-600">Loading completed peer-reviews...</div>
            </div>
          ) : completedPeerReviews.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="text-gray-500 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No completed peer-reviews yet</h3>
              <p className="text-gray-500">
                Once you complete and submit peer-reviews, they will appear here with your assessments and comments.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {completedPeerReviews.map((peerReview) => (
                <div key={peerReview.id} className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{peerReview.proposalTitle}</h3>
                        {peerReview.isDemo && (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            DEMO
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                        Submitted on {formatDate(peerReview.submittedAt)} • Earned {peerReview.repPoints} REP Points
                      </p>
                    </div>
                  </div>

                  {/* Assessment Type Badge */}
                  {peerReview.assessmentType === 'normal' && (
                    <div className="mb-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Normal Assessment
                      </span>
                    </div>
                  )}

                  {peerReview.assessmentType === 'normal' && peerReview.assessments ? (
                    <>
                      {/* Scores Grid */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        {Object.entries(peerReview.assessments).map(([category, score]) => (
                          <div key={category} className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm font-medium text-gray-600 mb-1 capitalize">
                              {category}
                            </div>
                            <div className={`text-lg font-bold ${getScoreColor(score)}`}>
                              {score > 0 ? '+' : ''}{score}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Overall Score */}
                      {peerReview.overallScore !== undefined && (
                        <div className="mb-4">
                          <div className="text-sm font-medium text-gray-600 mb-1">Overall Score</div>
                          <div className={`text-2xl font-bold ${getScoreColor(peerReview.overallScore)}`}>
                            {peerReview.overallScore > 0 ? '+' : ''}{peerReview.overallScore}
                          </div>
                        </div>
                      )}

                      {/* Feedback */}
                      {peerReview.feedback && (
                        <div className="border-l-4 border-indigo-200 pl-4">
                          <div className="text-sm font-medium text-gray-600 mb-1">Feedback</div>
                          <p className="text-gray-700">{peerReview.feedback}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Low-Quality Agreement */
                    peerReview.lowQualityAgreement && (
                      <div className="space-y-3">
                        <div className="mb-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            peerReview.lowQualityAgreement.agree 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {peerReview.lowQualityAgreement.agree ? 'Agreed with Low-Quality Flag' : 'Disagreed with Flag'}
                          </span>
                        </div>
                        {peerReview.lowQualityAgreement.comment && (
                          <div className="border-l-4 border-orange-200 pl-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Comment</div>
                            <p className="text-gray-700">{peerReview.lowQualityAgreement.comment}</p>
                          </div>
                        )}
                      </div>
                    )
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