'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useAuthFetch } from '@/app/lib/auth'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'

interface PendingUser {
  _id: string
  email: string
  username?: string
  createdAt: string
  reviewerStatus: string
  onboardingData?: {
    expertise?: Array<{ area: string; level: number }>
    interests?: string[]
    reviewCapacity?: string
    previousFunds?: string[]
  }
}

export default function UserApprovalPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const { authFetch } = useAuthFetch()
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  
  // Auth & Admin check
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, user, router])
  
  // Fetch pending users
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return
    
    const fetchPendingUsers = async () => {
      try {
        const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/pending-users`)
        if (response.ok) {
          const data = await response.json()
          setPendingUsers(data)
        }
      } catch (error) {
        console.error('Error fetching pending users:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchPendingUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user])
  
  const handleUserAction = async (userId: string, action: 'approve' | 'reject') => {
    setProcessing(userId)
    try {
      const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reviewerStatus: action === 'approve' ? 'approved' : 'rejected'
        })
      })
      
      if (response.ok) {
        // Remove from list after action
        setPendingUsers(prev => prev.filter(u => u._id !== userId))
        alert(`User ${action === 'approve' ? 'approved' : 'rejected'} successfully!`)
      }
    } catch (error) {
      console.error(`Error ${action}ing user:`, error)
      alert(`Failed to ${action} user`)
    } finally {
      setProcessing(null)
    }
  }
  
  if (isLoading || loading) {
    return <div className="min-h-screen bg-gray-50 p-8">Loading...</div>
  }
  
  if (user?.role !== 'admin') {
    return null
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/admin" className="text-blue-600 hover:text-blue-800">
            ← Back to Admin Dashboard
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-8">User Approval</h1>
        
        {pendingUsers.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
            No pending user approvals
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {pendingUsers.map((pendingUser) => (
                <li key={pendingUser._id} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* User Info */}
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {pendingUser.username || 'No username'}
                        </h3>
                        <span className="ml-3 px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{pendingUser.email}</p>
                      
                      {/* Expertise & Details */}
                      {pendingUser.onboardingData && (
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="font-medium">Expertise:</span>
                            {pendingUser.onboardingData.expertise?.map(exp => (
                              <span key={exp.area} className="ml-2">
                                {exp.area} (Level {exp.level})
                              </span>
                            ))}
                          </div>
                          
                          <div>
                            <span className="font-medium">Review Capacity:</span>
                            <span className="ml-2">{pendingUser.onboardingData.reviewCapacity || 'Not specified'}</span>
                          </div>
                          
                          {pendingUser.onboardingData.interests && pendingUser.onboardingData.interests.length > 0 && (
                            <div className="col-span-2">
                              <span className="font-medium">Interests:</span>
                              <span className="ml-2">{pendingUser.onboardingData.interests.join(', ')}</span>
                            </div>
                          )}
                          
                          {pendingUser.onboardingData.previousFunds && pendingUser.onboardingData.previousFunds.length > 0 && (
                            <div className="col-span-2">
                              <span className="font-medium">Previous Funds:</span>
                              <span className="ml-2">{pendingUser.onboardingData.previousFunds.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="text-sm text-gray-500">
                        Applied: {new Date(pendingUser.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="ml-4 flex gap-2">
                      <button
                        onClick={() => handleUserAction(pendingUser._id, 'approve')}
                        disabled={processing === pendingUser._id}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {processing === pendingUser._id ? '...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleUserAction(pendingUser._id, 'reject')}
                        disabled={processing === pendingUser._id}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}