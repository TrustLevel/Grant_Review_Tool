'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useAuthFetch } from '@/app/lib/auth'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'

interface AdminStats {
  totalUsers: number
  approvedReviewers: number
  pendingReviewers: number
  totalReviews: number
  completedReviews: number
  totalPeerReviews: number
  completedPeerReviews: number
  pendingAssignmentRequests: number
}

interface ProposalOverview {
  id: string
  title: string
  author: string
  budget: number
  reviews: {
    assigned: number
    in_progress: number
    submitted: number
    total: number
  }
  peerReviews: {
    pending: number
    completed: number
    total: number
  }
  reviewCompletion: number
  peerReviewCompletion: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const { authFetch } = useAuthFetch()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [proposals, setProposals] = useState<ProposalOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [proposalsLoading, setProposalsLoading] = useState(true)
  
  // Auth & Admin check
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, user, router])
  
  // Fetch admin stats
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return
    
    const fetchStats = async () => {
      try {
        const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/stats`)
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Error fetching admin stats:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchStats()
  }, [isAuthenticated, user, authFetch])
  
  // Fetch proposal overview
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return
    
    const fetchProposals = async () => {
      try {
        const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/proposal-overview`)
        if (response.ok) {
          const data = await response.json()
          setProposals(data)
        }
      } catch (error) {
        console.error('Error fetching proposal overview:', error)
      } finally {
        setProposalsLoading(false)
      }
    }
    
    fetchProposals()
  }, [isAuthenticated, user, authFetch])
  
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage reviewers, assignments, and monitor system health</p>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link
            href="/admin/users-list"
            className="bg-white p-6 rounded-lg shadow hover:bg-gray-50 transition-colors cursor-pointer block"
          >
            <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalUsers || 0}</p>
          </Link>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Approved Reviewers</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{stats?.approvedReviewers || 0}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Completed Reviews</h3>
            <p className="text-3xl font-bold text-indigo-600 mt-2">
              {stats?.completedReviews || 0} / {stats?.totalReviews || 0}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Completed Peer-Reviews</h3>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              {stats?.completedPeerReviews || 0} / {stats?.totalPeerReviews || 0}
            </p>
          </div>
        </div>
        
        {/* Quick Actions - Beta Version */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/admin/user-approval"
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="font-medium text-gray-900">User Approval</h3>
                  <p className="text-sm text-gray-500">Approve pending reviewers</p>
                </div>
              </div>
              {stats?.pendingReviewers && stats.pendingReviewers > 0 && (
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm font-medium">
                  {stats.pendingReviewers}
                </span>
              )}
            </Link>
            
            <Link
              href="/admin/assignment-requests"
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="font-medium text-gray-900">Assignment Requests</h3>
                  <p className="text-sm text-gray-500">Review pending requests</p>
                </div>
              </div>
              {stats?.pendingAssignmentRequests && stats.pendingAssignmentRequests > 0 && (
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-medium">
                  {stats.pendingAssignmentRequests}
                </span>
              )}
            </Link>
            
            <Link
              href="/admin/manual-assignment"
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="font-medium text-gray-900">Manual Assignments</h3>
                  <p className="text-sm text-gray-500">Assign reviews and peer-reviews</p>
                </div>
              </div>
            </Link>

            <Link
              href="/admin/rewards"
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="font-medium text-gray-900">Mission Rewards</h3>
                  <p className="text-sm text-gray-500">Manage ADA reward payments</p>
                </div>
              </div>
            </Link>
            
          </div>
        </div>
        
        {/* Proposal Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Proposal Review Overview</h2>
              <p className="text-gray-600 text-sm">Track review and peer-review progress for all active proposals</p>
            </div>
          </div>
          
          {proposalsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading proposals...</p>
            </div>
          ) : proposals.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No assigned proposals found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proposal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Budget
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reviews
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Peer-Reviews
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Overall
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {proposals.map((proposal) => (
                    <tr key={proposal.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={proposal.title}>
                            {proposal.title}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          ${proposal.budget.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <span className="font-medium text-green-600">{proposal.reviews.submitted}</span>
                          {' / '}
                          <span>{proposal.reviews.total}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {proposal.reviews.assigned} assigned
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <span className="font-medium text-purple-600">{proposal.peerReviews.completed}</span>
                          {' / '}
                          <span>{proposal.peerReviews.total}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {proposal.peerReviews.pending} pending
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min((proposal.reviews.submitted / 3) * 100, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600 w-12">{proposal.reviews.submitted}/3</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              {(() => {
                                // Dynamic peer-review target: minimum 6, or 2 per submitted review if higher
                                const peerReviewTarget = Math.max(6, proposal.reviews.submitted * 2);
                                return (
                                  <div 
                                    className="bg-purple-500 h-2 rounded-full transition-all"
                                    style={{ width: `${Math.min((proposal.peerReviews.completed / peerReviewTarget) * 100, 100)}%` }}
                                  ></div>
                                );
                              })()}
                            </div>
                            <span className="text-xs text-gray-600 w-12">
                              {proposal.peerReviews.completed}/{Math.max(6, proposal.reviews.submitted * 2)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          // Calculate overall completion as average of review and peer-review progress (both capped at 100%)
                          const reviewProgress = Math.min((proposal.reviews.submitted / 3) * 100, 100);
                          
                          const peerReviewTarget = Math.max(6, proposal.reviews.submitted * 2);
                          const peerReviewProgress = Math.min((proposal.peerReviews.completed / peerReviewTarget) * 100, 100);
                          
                          const overallProgress = Math.round((reviewProgress + peerReviewProgress) / 2);
                          
                          return (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-3">
                                <div 
                                  className="bg-indigo-500 h-3 rounded-full transition-all"
                                  style={{ width: `${overallProgress}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-gray-900 font-medium">
                                {overallProgress}%
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}