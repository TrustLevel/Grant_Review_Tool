'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useAuthFetch } from '@/app/lib/auth'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'

interface RewardEntry {
  userId: string
  username: string
  email: string
  walletAddress: string
  repPoints: number
  missionId: string
  rewardAmount: string
  completedAt: string
  rewardStatus: 'pending' | 'paid'
}

export default function AdminRewardsPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const { authFetch } = useAuthFetch()
  const [rewards, setRewards] = useState<RewardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState<string>('')

  // Auth & Admin check
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, user, router])

  // Fetch rewards data
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return

    const fetchRewards = async () => {
      try {
        const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/pending-rewards`)
        if (response.ok) {
          const data = await response.json()
          setRewards(data)
        }
      } catch (error) {
        console.error('Error fetching rewards:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRewards()
  }, [isAuthenticated, user, authFetch])

  const handleMarkAsPaid = async (userId: string, missionId: string, rewardAmount: string) => {
    const transactionHash = prompt(`Enter Cardano transaction hash for ${rewardAmount} payment:`)
    if (!transactionHash) return

    const adminNotes = prompt('Optional admin notes:') || ''

    setProcessingPayment(`${userId}-${missionId}`)
    try {
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/mark-reward-paid/${userId}/${missionId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            transactionHash,
            adminNotes
          })
        }
      )

      if (response.ok) {
        alert('Reward marked as paid successfully!')
        // Update local state
        setRewards(prev => 
          prev.map(reward => 
            reward.userId === userId && reward.missionId === missionId 
              ? { ...reward, rewardStatus: 'paid' }
              : reward
          )
        )
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to mark reward as paid')
      }
    } catch (error) {
      console.error('Error marking reward as paid:', error)
      alert('Failed to mark reward as paid')
    } finally {
      setProcessingPayment('')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMissionTitle = (missionId: string) => {
    const missions = {
      'beta-tester-champion': 'Beta-Tester Champion'
    }
    return missions[missionId as keyof typeof missions] || missionId
  }

  if (isLoading || loading) {
    return <div className="min-h-screen bg-gray-50 p-8">Loading...</div>
  }

  if (user?.role !== 'admin') {
    return null
  }

  const pendingRewards = rewards.filter(r => r.rewardStatus === 'pending')
  const paidRewards = rewards.filter(r => r.rewardStatus === 'paid')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
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
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mission Rewards</h1>
          <p className="text-gray-600">Manage ADA reward payments for completed missions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{pendingRewards.length}</p>
                <p className="text-sm text-gray-600">Pending Rewards</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{paidRewards.length}</p>
                <p className="text-sm text-gray-600">Paid Rewards</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {pendingRewards.reduce((sum, r) => sum + parseInt(r.rewardAmount.replace(' ADA', '')), 0)} ADA
                </p>
                <p className="text-sm text-gray-600">Total Pending Value</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Rewards Table */}
        {pendingRewards.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border mb-8">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                Pending Rewards ({pendingRewards.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mission</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reward</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wallet</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingRewards.map((reward) => (
                    <tr key={`${reward.userId}-${reward.missionId}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{reward.username}</div>
                          <div className="text-xs text-gray-400">{reward.repPoints} REP</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">{getMissionTitle(reward.missionId)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-amber-600">{reward.rewardAmount}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-600 font-mono max-w-32 truncate" title={reward.walletAddress}>
                          {reward.walletAddress}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(reward.completedAt)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleMarkAsPaid(reward.userId, reward.missionId, reward.rewardAmount)}
                          disabled={processingPayment === `${reward.userId}-${reward.missionId}`}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {processingPayment === `${reward.userId}-${reward.missionId}` ? 'Processing...' : 'Mark as Paid'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Paid Rewards Table */}
        {paidRewards.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Paid Rewards ({paidRewards.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mission</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reward</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paidRewards.map((reward) => (
                    <tr key={`${reward.userId}-${reward.missionId}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{reward.username}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">{getMissionTitle(reward.missionId)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-green-600">{reward.rewardAmount}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✅ Paid
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {rewards.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No mission rewards yet</h3>
            <p className="text-gray-500">
              Mission rewards will appear here once users complete missions and claim their rewards.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}