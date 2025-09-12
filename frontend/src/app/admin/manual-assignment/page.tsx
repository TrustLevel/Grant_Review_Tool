'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useAuthFetch } from '@/app/lib/auth'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'

interface User {
  _id: string
  username: string
  email: string
  reviewerStatus: string
  repPoints: number
}


export default function ManualAssignmentPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const { authFetch } = useAuthFetch()
  
  const [activeTab, setActiveTab] = useState<'proposal-reviews' | 'peer-reviews'>('proposal-reviews')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Form states for Proposal Assignment
  const [selectedUserForAssignment, setSelectedUserForAssignment] = useState('')
  const [reviewCount, setReviewCount] = useState(4)
  const [assignmentPreview, setAssignmentPreview] = useState<{
    success: boolean
    stats: { totalEligible: number; avgScore: number }
    preview: Array<{ proposalId: string; proposalTitle: string; score: number; reason: string }>
    message?: string
  } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Form states for Peer Review Assignment
  const [selectedUserForPeerReview, setSelectedUserForPeerReview] = useState('')
  const [peerReviewCount, setPeerReviewCount] = useState(3)
  const [peerReviewPreview, setPeerReviewPreview] = useState<{
    success: boolean
    stats: { totalEligible: number; urgentReviews: number }
    preview: Array<{ reviewId: string; proposalTitle: string; currentPeerReviews: number; reason: string }>
    message?: string
  } | null>(null)
  const [peerReviewPreviewLoading, setPeerReviewPreviewLoading] = useState(false)
  
  // Auth & Admin check
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, user, router])
  
  // Fetch data
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return
    
    const fetchData = async () => {
      try {
        // Fetch users (filter approved ones)
        const usersRes = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users`)
        if (usersRes.ok) {
          const usersData = await usersRes.json()
          // Filter only approved users
          const approvedUsers = usersData.filter((user: User) => user.reviewerStatus === 'approved')
          setUsers(approvedUsers)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [isAuthenticated, user])
  
  // Preview User Assignment
  const handlePreviewAssignment = async () => {
    if (!selectedUserForAssignment) {
      alert('Please select a user')
      return
    }
    
    setPreviewLoading(true)
    try {
      const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${selectedUserForAssignment}/assignment-preview?count=${reviewCount}`)
      
      if (response.ok) {
        const data = await response.json()
        setAssignmentPreview(data)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to preview assignment')
        setAssignmentPreview(null)
      }
    } catch (error) {
      console.error('Error previewing assignment:', error)
      alert('Failed to preview assignment')
      setAssignmentPreview(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  // Assign Reviews to User
  const handleAssignUserReviews = async () => {
    if (!selectedUserForAssignment) {
      alert('Please select a user')
      return
    }
    
    setSubmitting(true)
    try {
      const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/assign-user-reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: selectedUserForAssignment,
          count: reviewCount,
          simulation: false
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        alert(`Successfully assigned ${data.assignments.length} reviews!`)
        setSelectedUserForAssignment('')
        setReviewCount(4)
        setAssignmentPreview(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to assign reviews')
      }
    } catch (error) {
      console.error('Error assigning reviews:', error)
      alert('Failed to assign reviews')
    } finally {
      setSubmitting(false)
    }
  }

  // Preview Peer Review Assignment
  const handlePreviewPeerReviewAssignment = async () => {
    if (!selectedUserForPeerReview) {
      alert('Please select a user')
      return
    }
    
    setPeerReviewPreviewLoading(true)
    try {
      const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${selectedUserForPeerReview}/peer-review-assignment-preview?count=${peerReviewCount}`)
      
      if (response.ok) {
        const data = await response.json()
        setPeerReviewPreview(data)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to preview peer-review assignment')
        setPeerReviewPreview(null)
      }
    } catch (error) {
      console.error('Error previewing peer-review assignment:', error)
      alert('Failed to preview peer-review assignment')
      setPeerReviewPreview(null)
    } finally {
      setPeerReviewPreviewLoading(false)
    }
  }

  // Assign Peer Reviews to User
  const handleAssignUserPeerReviews = async () => {
    if (!selectedUserForPeerReview) {
      alert('Please select a user')
      return
    }
    
    setSubmitting(true)
    try {
      const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/assign-user-peer-reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: selectedUserForPeerReview,
          count: peerReviewCount,
          simulation: false
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        alert(`Successfully assigned ${data.assignments.length} peer-reviews!`)
        setSelectedUserForPeerReview('')
        setPeerReviewCount(3)
        setPeerReviewPreview(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to assign peer-reviews')
      }
    } catch (error) {
      console.error('Error assigning peer-reviews:', error)
      alert('Failed to assign peer-reviews')
    } finally {
      setSubmitting(false)
    }
  }
  
  if (isLoading || loading) {
    return <div className="min-h-screen bg-gray-50 p-8">Loading...</div>
  }
  
  if (user?.role !== 'admin') {
    return null
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <Link 
            href="/admin" 
            className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 mb-6 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Admin Dashboard
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manual Assignment Center</h1>
        </div>
        
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('proposal-reviews')}
                className={`flex-1 px-6 py-4 text-base font-semibold border-b-2 transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === 'proposal-reviews'
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Proposal Reviews
              </button>
              <button
                onClick={() => setActiveTab('peer-reviews')}
                className={`flex-1 px-6 py-4 text-base font-semibold border-b-2 transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === 'peer-reviews'
                    ? 'border-purple-500 text-purple-600 bg-purple-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Peer Reviews
              </button>
            </div>
          </div>
          
          <div className="p-8">
            {activeTab === 'proposal-reviews' ? (
            <div className="space-y-8">
              {/* Header */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl mb-4">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Assign Multiple Reviews to User</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Select a user and number of reviews. Our intelligent system will automatically find the best matching proposals based on urgency and user interests.
                </p>
              </div>
              
              {/* Form Container */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Select User */}
                  <div className="space-y-2">
                    <label className="block text-base font-bold text-black">
                      <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Select User
                    </label>
                    <select
                      value={selectedUserForAssignment}
                      onChange={(e) => {
                        setSelectedUserForAssignment(e.target.value)
                        setAssignmentPreview(null) // Clear preview when user changes
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white shadow-sm"
                    >
                      <option value="">-- Choose a reviewer --</option>
                      {users.map(user => (
                        <option key={user._id} value={user._id}>
                          {user.username} ({user.repPoints} REP)
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Number of Reviews */}
                  <div className="space-y-2">
                    <label className="block text-base font-bold text-black">
                      <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                      Number of Reviews
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={reviewCount}
                      onChange={(e) => {
                        setReviewCount(parseInt(e.target.value) || 1)
                        setAssignmentPreview(null) // Clear preview when count changes
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white shadow-sm"
                      placeholder="4"
                    />
                    <p className="text-xs text-gray-500">Choose between 1-20 reviews</p>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="mt-6 space-y-4">
                  {/* Preview Button */}
                  <button
                    onClick={handlePreviewAssignment}
                    disabled={previewLoading || !selectedUserForAssignment}
                    className="w-full py-3 px-6 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
                  >
                    {previewLoading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading Preview...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Preview Assignment
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Preview Results */}
              {assignmentPreview && (
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Assignment Preview</h3>
                  </div>
                  
                  {assignmentPreview.success ? (
                    <div className="space-y-6">
                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-indigo-600">{assignmentPreview.stats.totalEligible}</div>
                          <div className="text-xs text-gray-600 font-medium">Total Eligible</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">{assignmentPreview.preview.length}</div>
                          <div className="text-xs text-gray-600 font-medium">Will Assign</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">{assignmentPreview.stats.avgScore.toFixed(1)}</div>
                          <div className="text-xs text-gray-600 font-medium">Avg Score</div>
                        </div>
                      </div>
                      
                      {/* Selected Proposals */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Selected Proposals
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {assignmentPreview.preview.map((assignment, index: number) => (
                            <div key={assignment.proposalId} className="bg-gray-50 p-3 rounded-lg border-l-4 border-indigo-400">
                              <div className="font-medium text-gray-900 text-sm">{index + 1}. {assignment.proposalTitle}</div>
                              <div className="text-xs text-gray-600 mt-1">
                                <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full mr-2">Score: {assignment.score.toFixed(1)}</span>
                                {assignment.reason}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border-l-4 border-red-400">
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-red-700 font-medium">{assignmentPreview.message}</div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Final Assignment Action */}
              <div className="space-y-4">
                {assignmentPreview?.success && (
                  <button
                    onClick={handleAssignUserReviews}
                    disabled={submitting || !selectedUserForAssignment || !assignmentPreview?.success}
                    className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 font-semibold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg"
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Assigning Reviews...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                        </svg>
                        Assign {reviewCount} Reviews
                      </>
                    )}
                  </button>
                )}
                
                {!assignmentPreview && selectedUserForAssignment && (
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <svg className="w-8 h-8 text-blue-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-blue-700 font-medium">Click &quot;Preview Assignment&quot; first to see which proposals will be assigned.</p>
                  </div>
                )}
              </div>
            </div>
            ) : (
              <div className="space-y-8">
                {/* Header */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl mb-4">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Assign Multiple Peer-Reviews to User</h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Select a user and number of peer-reviews. Our intelligent system will automatically find submitted reviews that need the most peer-review attention.
                  </p>
                </div>
                
                {/* Form Container */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Select User */}
                    <div className="space-y-2">
                      <label className="block text-base font-bold text-black">
                        <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Select User
                      </label>
                      <select
                        value={selectedUserForPeerReview}
                        onChange={(e) => {
                          setSelectedUserForPeerReview(e.target.value)
                          setPeerReviewPreview(null) // Clear preview when user changes
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-white shadow-sm"
                      >
                        <option value="">-- Choose a reviewer --</option>
                        {users.map(user => (
                          <option key={user._id} value={user._id}>
                            {user.username} ({user.repPoints} REP)
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Number of Peer Reviews */}
                    <div className="space-y-2">
                      <label className="block text-base font-bold text-black">
                        <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        Number of Peer-Reviews
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={peerReviewCount}
                        onChange={(e) => {
                          setPeerReviewCount(parseInt(e.target.value) || 1)
                          setPeerReviewPreview(null) // Clear preview when count changes
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-white shadow-sm"
                        placeholder="3"
                      />
                      <p className="text-xs text-gray-500">Choose between 1-20 peer-reviews</p>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="mt-6 space-y-4">
                    {/* Preview Button */}
                    <button
                      onClick={handlePreviewPeerReviewAssignment}
                      disabled={peerReviewPreviewLoading || !selectedUserForPeerReview}
                      className="w-full py-3 px-6 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
                    >
                      {peerReviewPreviewLoading ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Loading Preview...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Preview Peer-Review Assignment
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Preview Results */}
                {peerReviewPreview && (
                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Peer-Review Assignment Preview</h3>
                    </div>
                    
                    {peerReviewPreview.success ? (
                      <div className="space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-purple-600">{peerReviewPreview.stats.totalEligible}</div>
                            <div className="text-xs text-gray-600 font-medium">Total Eligible</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-green-600">{peerReviewPreview.preview.length}</div>
                            <div className="text-xs text-gray-600 font-medium">Will Assign</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-red-600">{peerReviewPreview.stats.urgentReviews}</div>
                            <div className="text-xs text-gray-600 font-medium">Urgent (0 peer-reviews)</div>
                          </div>
                        </div>
                        
                        {/* Selected Reviews */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Selected Reviews
                          </h4>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {peerReviewPreview.preview.map((assignment, index: number) => (
                              <div key={assignment.reviewId} className="bg-gray-50 p-3 rounded-lg border-l-4 border-purple-400">
                                <div className="font-medium text-gray-900 text-sm">{index + 1}. {assignment.proposalTitle}</div>
                                <div className="text-xs text-gray-600 mt-1">
                                  <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full mr-2">
                                    Current: {assignment.currentPeerReviews} peer-reviews
                                  </span>
                                  {assignment.reason}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border-l-4 border-red-400">
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-sm text-red-700 font-medium">{peerReviewPreview.message}</div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Final Assignment Action */}
                <div className="space-y-4">
                  {peerReviewPreview?.success && (
                    <button
                      onClick={handleAssignUserPeerReviews}
                      disabled={submitting || !selectedUserForPeerReview || !peerReviewPreview?.success}
                      className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 font-semibold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg"
                    >
                      {submitting ? (
                        <>
                          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Assigning Peer-Reviews...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Assign {peerReviewCount} Peer-Reviews
                        </>
                      )}
                    </button>
                  )}
                  
                  {!peerReviewPreview && selectedUserForPeerReview && (
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <svg className="w-8 h-8 text-blue-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-blue-700 font-medium">Click &quot;Preview Peer-Review Assignment&quot; first to see which reviews will be assigned.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}