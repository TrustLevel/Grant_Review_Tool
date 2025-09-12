// src/app/reviews/[id]/complete/page.tsx
'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/auth'

export default function ReviewCompletePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params)
  const router = useRouter()
  const { token, isAuthenticated, isLoading, refreshUser } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [reward, setReward] = useState('15 REP')

  // Auth Guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('Not authenticated, redirecting to landing page')
      router.push('/')
      return
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated && token) {
      // Auto-submit when component loads and user is authenticated
      handleSubmit()
    }
  }, [id, isAuthenticated, token])

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

  const handleSubmit = async () => {
    if (submitting || submitted) return
    
    setSubmitting(true)
    setError('')
    
    try {
      if (!token) {
        throw new Error('No authentication token available')
      }
      
      // OLD: const response = await fetch(`http://localhost:3001/api/reviews/${id}/submit`, {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reviews/${id}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit review')
      }
      
      const data = await response.json()
      console.log('Review submitted:', data)
      
      setReward(data.reward || '15 REP')
      setSubmitted(true)
      
      // Refresh user data to update REP points in UI
      await refreshUser()
      
    } catch (error) {
      console.error('Error submitting review:', error)
      setError(error instanceof Error ? error.message : 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Submission Failed</h2>
            <p className="text-gray-600 mb-4">{error}</p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => window.history.back()}
              className="block w-full bg-indigo-600 text-white px-6 py-3 rounded-full font-medium hover:bg-indigo-700 transition-colors"
            >
              Go Back and Complete Review
            </button>
            
            <Link
              href="/dashboard"
              className="block w-full bg-gray-100 text-gray-600 px-6 py-3 rounded-full font-medium hover:bg-gray-200 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
            submitting ? 'bg-blue-100' : 'bg-green-100'
          }`}>
            {submitting ? (
              <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {submitting ? 'Submitting Review...' : 'Review Completed!'}
          </h2>
          <p className="text-gray-600">
            {submitting 
              ? 'Please wait while we process your review...' 
              : `Thank you for completing your review for proposal #${id}`
            }
          </p>
        </div>
        
        {submitted && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Your review has been submitted successfully.</p>
            <p className="text-lg font-semibold text-indigo-600">+{reward} Reward Pending</p>
          </div>
        )}
        
        {!submitting && submitted && (
          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="block w-full bg-indigo-600 text-white px-6 py-3 rounded-full font-medium hover:bg-indigo-700 transition-colors"
            >
              Back to Dashboard
            </Link>
            
            <Link
              href="/dashboard"
              className="block w-full bg-gray-100 text-gray-600 px-6 py-3 rounded-full font-medium hover:bg-gray-200 transition-colors"
            >
              Review Next Proposal
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}