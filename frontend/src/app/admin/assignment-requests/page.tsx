'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useAuthFetch } from '@/app/lib/auth'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'

interface AssignmentRequest {
  _id: string
  userId: {
    _id: string
    username: string
    email: string
  }
  username: string
  requestType: 'reviews' | 'peer-reviews' | 'both'
  requestedAt: string
  status: 'pending' | 'fulfilled' | 'declined'
  currentStats: {
    completedReviews: number
    completedPeerReviews: number
    repPoints: number
    pendingReviews: number
    pendingPeerReviews: number
  }
}

export default function AdminAssignmentRequestsPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const { authFetch } = useAuthFetch()
  const [requests, setRequests] = useState<AssignmentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  
  // Auth & Admin check
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, user, router])
  
  // Fetch requests
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return
    
    const fetchRequests = async () => {
      try {
        const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/assignment-requests`)
        if (response.ok) {
          const data = await response.json()
          setRequests(data)
        }
      } catch (error) {
        console.error('Error fetching assignment requests:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchRequests()
  }, [isAuthenticated, user])
  
  const updateRequestStatus = async (requestId: string, status: 'fulfilled' | 'declined', reason?: string) => {
    setProcessing(requestId)
    try {
      const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/assignment-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status,
          adminNote: status === 'fulfilled' ? 'Assignments added' : reason,
          declinedReason: reason
        })
      })
      
      if (response.ok) {
        // Remove from list after update
        setRequests(prev => prev.filter(r => r._id !== requestId))
        alert(`Request ${status}!`)
      }
    } catch (error) {
      console.error('Error updating request:', error)
      alert('Failed to update request')
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
        
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Assignment Requests</h1>
        
        {requests.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
            No pending assignment requests
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {requests.map((request) => (
                <li key={request._id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium text-gray-900">
                          {request.username}
                        </h3>
                        <span className="ml-3 px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800">
                          {request.requestType}
                        </span>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-5 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Completed Reviews:</span> {request.currentStats.completedReviews}
                        </div>
                        <div>
                          <span className="font-medium">Completed Peer-Reviews:</span> {request.currentStats.completedPeerReviews}
                        </div>
                        <div>
                          <span className="font-medium">REP Points:</span> {request.currentStats.repPoints}
                        </div>
                        <div>
                          <span className="font-medium">Pending Reviews:</span> {request.currentStats.pendingReviews}
                        </div>
                        <div>
                          <span className="font-medium">Pending Peer-Reviews:</span> {request.currentStats.pendingPeerReviews}
                        </div>
                      </div>
                      
                      <div className="mt-1 text-sm text-gray-500">
                        Requested: {new Date(request.requestedAt).toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="ml-4 flex gap-2">
                      <button
                        onClick={() => updateRequestStatus(request._id, 'fulfilled')}
                        disabled={processing === request._id}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {processing === request._id ? '...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Decline reason (optional):')
                          if (reason !== null) {
                            updateRequestStatus(request._id, 'declined', reason)
                          }
                        }}
                        disabled={processing === request._id}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        Decline
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