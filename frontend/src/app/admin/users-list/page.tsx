'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useAuthFetch } from '@/app/lib/auth'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'

interface User {
  _id: string
  email: string
  username?: string
  reviewerStatus: string
  role?: string
  repPoints: number
  createdAt: string
  onboardingCompleted: boolean
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
}

export default function UserListPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const { authFetch } = useAuthFetch()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all')
  
  // Auth & Admin check
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, user, router])
  
  // Fetch users
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return
    
    const fetchUsers = async () => {
      try {
        const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users`)
        if (response.ok) {
          const data = await response.json()
          setUsers(data)
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchUsers()
  }, [isAuthenticated, user, authFetch])
  
  // Filter users based on status
  const filteredUsers = users.filter(u => {
    if (filterStatus === 'all') return true
    return u.reviewerStatus === filterStatus
  })
  
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
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
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User List</h1>
          
          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg ${
                filterStatus === 'all' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              All ({users.length})
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              className={`px-4 py-2 rounded-lg ${
                filterStatus === 'approved' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Approved ({users.filter(u => u.reviewerStatus === 'approved').length})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg ${
                filterStatus === 'pending' 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Pending ({users.filter(u => u.reviewerStatus === 'pending').length})
            </button>
            <button
              onClick={() => setFilterStatus('rejected')}
              className={`px-4 py-2 rounded-lg ${
                filterStatus === 'rejected' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Rejected ({users.filter(u => u.reviewerStatus === 'rejected').length})
            </button>
          </div>
        </div>
        
        {/* User Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reviews
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Peer-Reviews
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  REP Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.username || 'No username'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(user.reviewerStatus)}`}>
                      {user.reviewerStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <span className="font-medium text-green-600">{user.reviews?.submitted || 0}</span>
                      {' / '}
                      <span>{user.reviews?.total || 0}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {user.reviews?.assigned || 0} assigned, {user.reviews?.in_progress || 0} in progress
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <span className="font-medium text-purple-600">{user.peerReviews?.completed || 0}</span>
                      {' / '}
                      <span>{user.peerReviews?.total || 0}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {user.peerReviews?.pending || 0} pending
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.repPoints || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.role === 'admin' ? (
                      <span className="text-red-600 font-medium">Admin</span>
                    ) : (
                      'Reviewer'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No users found with status: {filterStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}