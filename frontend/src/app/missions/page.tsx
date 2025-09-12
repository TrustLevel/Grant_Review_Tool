'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/lib/auth';

interface Mission {
  id: string;
  title: string;
  description: string;
  requirements: {
    reviews: number;
    peerReviews: number;
  };
  reward: string;
  icon: string;
}

export default function MissionsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [completedReviews, setCompletedReviews] = useState([]);
  const [completedPeerReviews, setCompletedPeerReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Reward claiming state
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [claimingReward, setClaimingReward] = useState(false);
  const [claimedMissions, setClaimedMissions] = useState<Set<string>>(new Set());

  // Auth Guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
      return;
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch progress data
  useEffect(() => {
    const fetchProgress = async () => {
      if (!isAuthenticated) return;

      try {
        const [reviewsResponse, peerReviewsResponse, completedMissionsResponse] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reviews/completed`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('trustlevel-token')}`
            }
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/peer-reviews/completed`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('trustlevel-token')}`
            }
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/completed-missions`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('trustlevel-token')}`
            }
          })
        ]);

        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json();
          setCompletedReviews(reviewsData);
        }

        if (peerReviewsResponse.ok) {
          const peerReviewsData = await peerReviewsResponse.json();
          setCompletedPeerReviews(peerReviewsData);
        }

        if (completedMissionsResponse.ok) {
          const missionsData = await completedMissionsResponse.json();
          const missionIds = missionsData.map((mission: { missionId: string }) => mission.missionId);
          setClaimedMissions(new Set(missionIds));
        }
      } catch (error) {
        console.error('Error fetching progress data:', error);
        // Mock data for development
        setCompletedReviews([]);
        setCompletedPeerReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [isAuthenticated]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Checking authentication...</div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!isAuthenticated) {
    return null;
  }

  // Define missions
  const missions: Mission[] = [
    {
      id: 'beta-tester-champion',
      title: 'Beta-Tester Champion',
      description: 'Complete at least 5 proposal reviews and 10 peer-reviews to become a beta testing champion',
      requirements: {
        reviews: 5,
        peerReviews: 10
      },
      reward: '50 ADA',
      icon: '🏆'
    }
  ];

  // Calculate mission progress
  const getMissionProgress = (mission: Mission) => {
    const reviewsProgress = Math.min(completedReviews.length, mission.requirements.reviews);
    const peerReviewsProgress = Math.min(completedPeerReviews.length, mission.requirements.peerReviews);
    
    const reviewsCompleted = completedReviews.length >= mission.requirements.reviews;
    const peerReviewsCompleted = completedPeerReviews.length >= mission.requirements.peerReviews;
    
    const isCompleted = reviewsCompleted && peerReviewsCompleted;
    const totalProgress = reviewsProgress + peerReviewsProgress;
    const totalRequired = mission.requirements.reviews + mission.requirements.peerReviews;
    const progressPercentage = Math.round((totalProgress / totalRequired) * 100);

    return {
      reviewsProgress,
      peerReviewsProgress,
      reviewsCompleted,
      peerReviewsCompleted,
      isCompleted,
      progressPercentage
    };
  };

  // Validate Cardano wallet address
  const validateCardanoAddress = (address: string): boolean => {
    // Basic Cardano address validation (starts with addr1)
    const cardanoAddressRegex = /^addr1[a-z0-9]{98}$/;
    return cardanoAddressRegex.test(address);
  };

  // Handle reward claiming
  const handleClaimReward = (mission: Mission) => {
    setSelectedMission(mission);
    setShowWalletModal(true);
    setWalletAddress('');
  };

  const submitRewardClaim = async () => {
    if (!selectedMission || !walletAddress.trim()) {
      alert('Please enter a valid wallet address');
      return;
    }

    if (!validateCardanoAddress(walletAddress.trim())) {
      alert('Please enter a valid Cardano wallet address (starts with addr1)');
      return;
    }

    setClaimingReward(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/complete-mission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('trustlevel-token')}`
        },
        body: JSON.stringify({
          missionId: selectedMission.id,
          walletAddress: walletAddress.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Mission completed successfully! You will receive ${data.rewardAmount} within 7 days.`);
        setClaimedMissions(prev => new Set([...prev, selectedMission.id]));
        setShowWalletModal(false);
        setSelectedMission(null);
        setWalletAddress('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to complete mission');
      }
    } catch (error) {
      console.error('Error completing mission:', error);
      alert('Failed to complete mission. Please try again.');
    } finally {
      setClaimingReward(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 text-sm mb-1 inline-block">
          ← Back to Dashboard
        </Link>
      </div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Missions</h1>
        </div>
        <p className="text-gray-600">Complete challenges to earn badges and ADA rewards</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-lg text-gray-600">Loading missions...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {missions.map((mission) => {
            const progress = getMissionProgress(mission);
            
            return (
              <div key={mission.id} className={`bg-gradient-to-br ${
                progress.isCompleted 
                  ? 'from-green-50 to-emerald-50 border-green-200' 
                  : 'from-white to-gray-50 border-gray-200'
              } rounded-2xl shadow-lg p-8 border-2 hover:shadow-xl transition-all duration-300`}>
                <div className="flex items-start gap-6">
                  {/* Mission Icon */}
                  <div className="text-6xl filter drop-shadow-sm">{mission.icon}</div>
                  
                  {/* Mission Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-2xl font-bold text-gray-900">{mission.title}</h3>
                      {progress.isCompleted && (
                        <span className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full shadow-md">
                          ✓ Completed
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-700 mb-6 text-lg leading-relaxed">{mission.description}</p>
                    
                    {/* Requirements Progress */}
                    <div className="space-y-5 mb-6">
                      {/* Reviews Progress */}
                      <div className="bg-white/60 rounded-xl p-4 border border-blue-100">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="font-semibold text-gray-800">
                              Proposal Reviews
                            </span>
                          </div>
                          <span className={`font-bold text-lg ${
                            progress.reviewsCompleted ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {progress.reviewsProgress}/{mission.requirements.reviews}
                            {progress.reviewsCompleted && ' ✅'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                          <div 
                            className={`h-3 rounded-full transition-all duration-500 ${
                              progress.reviewsCompleted 
                                ? 'bg-gradient-to-r from-green-400 to-green-500 shadow-sm' 
                                : 'bg-gradient-to-r from-blue-400 to-blue-500'
                            }`}
                            style={{ 
                              width: `${Math.min((progress.reviewsProgress / mission.requirements.reviews) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Peer-Reviews Progress */}
                      <div className="bg-white/60 rounded-xl p-4 border border-purple-100">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="font-semibold text-gray-800">
                              Peer-Reviews
                            </span>
                          </div>
                          <span className={`font-bold text-lg ${
                            progress.peerReviewsCompleted ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {progress.peerReviewsProgress}/{mission.requirements.peerReviews}
                            {progress.peerReviewsCompleted && ' ✅'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                          <div 
                            className={`h-3 rounded-full transition-all duration-500 ${
                              progress.peerReviewsCompleted 
                                ? 'bg-gradient-to-r from-green-400 to-green-500 shadow-sm' 
                                : 'bg-gradient-to-r from-purple-400 to-purple-500'
                            }`}
                            style={{ 
                              width: `${Math.min((progress.peerReviewsProgress / mission.requirements.peerReviews) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Reward Section */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-md">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-amber-700">Mission Reward</div>
                            <div className="font-bold text-2xl text-amber-800">{mission.reward}</div>
                          </div>
                        </div>
                        
                        {progress.isCompleted ? (
                          claimedMissions.has(mission.id) ? (
                            <div className="text-right">
                              <div className="bg-green-100 text-green-800 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Reward Claimed
                              </div>
                              <div className="text-xs text-green-600 mt-1">Processing payment...</div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleClaimReward(mission)}
                              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                              Claim Reward
                            </button>
                          )
                        ) : (
                          <div className="text-right">
                            <div className="text-sm text-amber-600 font-medium">Complete all requirements</div>
                            <div className="text-xs text-amber-500">to unlock this reward</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Wallet Address Modal */}
      {showWalletModal && selectedMission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Claim Your Reward</h3>
              <p className="text-gray-600">
                You&apos;re about to claim <span className="font-bold text-amber-600">{selectedMission.reward}</span> for completing the <span className="font-semibold">{selectedMission.title}</span> mission.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cardano Wallet Address
                </label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="addr1..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter your Cardano wallet address to receive the ADA reward
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Important Notes:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Rewards are processed within 7 days</li>
                      <li>• Make sure your wallet address is correct</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowWalletModal(false);
                    setSelectedMission(null);
                    setWalletAddress('');
                  }}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitRewardClaim}
                  disabled={claimingReward || !walletAddress.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {claimingReward ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Claiming...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      Claim {selectedMission.reward}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}