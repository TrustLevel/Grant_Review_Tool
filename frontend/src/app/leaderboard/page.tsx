'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth, useAuthFetch } from '@/app/lib/auth'

interface LeaderboardEntry {
  rank: number
  username: string
  repPoints: number
  reviewerStatus: string
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const { authFetch } = useAuthFetch()
  const [loading, setLoading] = useState(true)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leaderboard`)
        const data = await response.json()
        
        if (response.ok) {
          setLeaderboard(data)
        }
      } catch (error) {
        console.error('Failed to load leaderboard:', error)
      } finally {
        setLoading(false)
      }
    }
    
    if (user) {
      loadLeaderboard()
    }
  }, [user, authFetch])

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-md'
      case 2:
        return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-md'
      case 3:
        return 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-md'
      default:
        return 'bg-gray-200 text-gray-700'
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `${rank}`
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading leaderboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 text-sm mb-1 inline-block">
                ← Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🏆</span>
              <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
            </div>
            <p className="text-gray-600">Top reviewers ranked by REP points earned.</p>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {leaderboard.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <span className="text-4xl mb-4 block">🏆</span>
                <h3 className="text-lg font-medium mb-2">No rankings yet</h3>
                <p>Complete reviews to earn REP points and appear on the leaderboard!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Rank
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        User
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                        REP Points
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry) => (
                      <tr 
                        key={entry.username} 
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          entry.username === user?.username ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${getRankStyle(entry.rank)}`}>
                            {getRankIcon(entry.rank)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-base font-medium text-gray-900">
                              {entry.username}
                              {entry.username === user?.username && (
                                <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full font-medium">You</span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-lg font-bold text-gray-900">
                            {entry.repPoints.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-blue-500 mr-2">💡</span>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">How to earn REP points:</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• Complete proposal reviews (30 REP each)</li>
                  <li>• Submit peer-reviews (15 REP each)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}