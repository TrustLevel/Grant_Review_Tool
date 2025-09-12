// src/app/reviews/[id]/[category]/page.tsx
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

const reviewCategories = [
  {
    id: 'relevance',
    title: 'Relevance',
    description: 'The proposal directly aligns with the goals and objectives of this challenge.',
    guideQuestion: 'What specific problem or opportunity does this proposal address, and how does it align with the goals of the challenge?'
  },
  {
    id: 'innovation',
    title: 'Innovation',
    description: 'The proposal offers a novel and creative solution that stands out from existing approaches.',
    guideQuestion: 'What aspects of the proposal are novel or unique, and how does it distinguish itself from existing approaches in its field?'
  },
  {
    id: 'impact',
    title: 'Impact',
    description: 'The proposal has the potential to create significant and lasting value for the Cardano ecosystem.',
    guideQuestion: 'What measurable value will this proposal bring to the Cardano ecosystem, and how scalable and sustainable are its expected outcomes?'
  },
  {
    id: 'feasibility',
    title: 'Feasibility',
    description: 'The project plan is realistic, with achievable milestones and a well-defined timeline.',
    guideQuestion: 'What specific aspects of the technical design or methodology build confidence in the project\'s feasibility, and how does the proposal handle risks or unknowns?'
  },
  {
    id: 'team',
    title: 'Team',
    description: 'The team has the necessary skills and experience to execute the project effectively.',
    guideQuestion: 'What relevant skills, experience, or past achievements does the team have that demonstrate their ability to successfully execute the proposal?'
  },
  {
    id: 'budget',
    title: 'Budget',
    description: 'The requested budget is reasonable and well-justified for the proposed scope of work.',
    guideQuestion: 'Does the proposed budget align with the expected outcomes and resource requirements?'
  }
]

export default function CategoryReviewPage({ 
  params 
}: { 
  params: Promise<{ id: string; category: string }> 
}) {
  const { id, category } = use(params)
  const router = useRouter()
  const { token, isAuthenticated, isLoading } = useAuth()
  const [review, setReview] = useState<ReviewDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  // Auth Guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('Not authenticated, redirecting to landing page')
      router.push('/')
      return
    }
  }, [isAuthenticated, isLoading, router])

  // Fetch data effect - MUST be before conditional returns
  useEffect(() => {
    if (!isAuthenticated || !token) return
    
    // Fetch review details and progress
    Promise.all([
      // OLD: fetch(`http://localhost:3001/api/reviews/${id}`, {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reviews/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).then(async res => {
        if (!res.ok) {
          const error = await res.text()
          throw new Error(`Review API failed: ${res.status} - ${error}`)
        }
        return res.json()
      }),
      // OLD: fetch(`http://localhost:3001/api/reviews/${id}/progress`, {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reviews/${id}/progress`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).then(async res => {
        if (!res.ok) {
          const error = await res.text()
          throw new Error(`Progress API failed: ${res.status} - ${error}`)
        }
        return res.json()
      })
    ])
      .then(([reviewData, progressData]) => {
        setReview(reviewData)
        
        // Load existing rating and comment for current category
        if (progressData.progress && progressData.progress[category]) {
          const categoryData = progressData.progress[category]
          if (categoryData.completed) {
            setRating(categoryData.rating ?? null)
            setComment(categoryData.comment || '')
          }
        }
        
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching review data:', err)
        alert(`Failed to load review: ${err.message}`)
        setLoading(false)
      })
  }, [id, category, isAuthenticated, token])

  // Show loading while checking auth
  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 p-8">Checking authentication...</div>
  }

  // Show nothing while redirecting
  if (!isAuthenticated) {
    return null
  }

  // Find current category info
  const currentCategoryIndex = reviewCategories.findIndex(cat => cat.id === category)
  const currentCategory = reviewCategories[currentCategoryIndex]
  const currentStep = currentCategoryIndex + 1

  // Determine next route
  const nextCategory = currentCategoryIndex < reviewCategories.length - 1 
    ? reviewCategories[currentCategoryIndex + 1].id 
    : null
  const nextRoute = nextCategory 
    ? `/reviews/${id}/${nextCategory}` 
    : `/reviews/${id}/complete`

  // Determine previous route
  const prevCategory = currentCategoryIndex > 0 
    ? reviewCategories[currentCategoryIndex - 1].id 
    : null
  const prevRoute = prevCategory 
    ? `/reviews/${id}/${prevCategory}` 
    : `/reviews/${id}`


  const handleContinue = async () => {
    if (rating === null) {
      alert('Please provide a rating before continuing')
      return
    }

    if (!comment.trim()) {
      alert('Please provide feedback/comment before continuing')
      return
    }

    setSaving(true)
    
    try {
      if (!token) {
        throw new Error('No authentication token available')
      }
      
      // OLD: const response = await fetch(`http://localhost:3001/api/reviews/${id}/progress`, {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reviews/${id}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category: category,
          rating: rating,
          comment: comment
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save progress')
      }
      
      const data = await response.json()
      console.log('Progress saved:', data)
      
      // Navigate to next route
      window.location.href = nextRoute
      
    } catch (error) {
      console.error('Error saving progress:', error)
      alert('Failed to save progress. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-50 p-8">Loading...</div>
  if (!review) return <div className="min-h-screen bg-gray-50 p-8">Review not found</div>
  if (!currentCategory) return <div className="min-h-screen bg-gray-50 p-8">Invalid category</div>

  return (
    <ReviewLayout reviewData={review} showProgressSteps={true} currentStep={currentStep}>
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Review Form: {currentCategory.title}</h2>
        
        {/* Step 1: Provide Feedback */}
        <div className="mb-8">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Step 1: Provide Feedback</h3>
          
          {/* Guiding Question */}
          <p className="text-sm text-gray-600 mb-4">{currentCategory.guideQuestion}</p>
          
          {/* Comments */}
          <div>
            <textarea
              id="comments"
              rows={6}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 placeholder-gray-500 bg-white"
              placeholder="Add your feedback here..."
            />
            <p className="text-xs text-gray-500 mt-1">{comment.length}/500 characters</p>
          </div>
        </div>
        
        {/* Step 2: Rate */}
        <div className="mb-8">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Step 2: Rate {currentCategory.title}</h3>
          <p className="text-sm text-gray-600 mb-4">&quot;{currentCategory.description}&quot;</p>
          
          {/* Rating Scale */}
          <div className="bg-gray-50 p-6 rounded-md">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600">Strongly Disagree</span>
              <span className="text-sm text-gray-600">Strongly Agree</span>
            </div>
            
            <div className="relative mb-6">
              <div className="h-2 w-full bg-gray-300 rounded-full"></div>
              <div className="absolute top-0 flex justify-between w-full" style={{ padding: '0 8px' }}>
                {[-3, -2, -1, 0, 1, 2, 3].map((value) => (
                  <button
                    key={value}
                    onClick={() => setRating(value)}
                    className={`h-4 w-4 rounded-full ${
                      value === rating ? 'bg-indigo-600' : 'bg-gray-400'
                    } -mt-1 cursor-pointer hover:bg-indigo-500 transition-colors`}
                  />
                ))}
              </div>
              
              {/* Scale Labels */}
              <div className="absolute top-6 flex justify-between w-full" style={{ padding: '0 6px' }}>
                <span className="text-xs text-gray-500">-3</span>
                <span className="text-xs text-gray-500">0</span>
                <span className="text-xs text-gray-500">+3</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-between">
          <Link
            href={prevRoute}
            className="bg-gray-100 text-gray-600 px-6 py-2 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Back
          </Link>
          
          <button
            onClick={handleContinue}
            disabled={saving || rating === null || !comment.trim()}
            className={`px-8 py-2 rounded-full text-sm font-medium transition-colors ${
              saving || rating === null || !comment.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {saving 
              ? 'Saving...' 
              : nextCategory 
                ? `Continue with "${reviewCategories[currentCategoryIndex + 1].title}"` 
                : 'Complete Review'
            }
          </button>
        </div>
      </div>
    </ReviewLayout>
  )
}