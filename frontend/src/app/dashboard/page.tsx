// src/app/dashboard/page.tsx
'use client'

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useAuthFetch } from '@/app/lib/auth';

interface Review {
  id: string;
  title: string;
  summary: string;
  author: string;
  requestedFunds: string;
  dueDate: string;
  reward: string;
  tags: string[];
  assignedTo: string;
}

interface PeerReview {
  id: string;
  reviewId: string | { _id: string };
  proposalId: string;
  proposalTitle: string;
  reviewerName: string;
  assignedTo: string;
  status: string;
  dueDate: string;
  reward: string;
  isDemo?: boolean;
}

interface FundStatus {
  fundNumber: number;
  name: string;
  status: string;
  budget: {
    total: number;
    currency: string;
  };
  timeline: {
    reviewStart: string;
    reviewEnd: string;
  };
}

// Tag mapping from database IDs to display labels
const TAG_LABELS = {
  'governance': 'Governance',
  'education': 'Education', 
  'community_outreach': 'Community & Outreach',
  'development_tools': 'Development & Tools',
  'identity_security': 'Identity & Security',
  'defi': 'DeFi',
  'real_world_applications': 'RWA',
  'events_marketing': 'Events & Marketing',
  'interoperability': 'Interoperability',
  'sustainability': 'Sustainability',
  'smart_contracts': 'Smart Contracts',
  'gamefi': 'GameFi',
  'nft': 'NFT'
};

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const { authFetch } = useAuthFetch()
  const [reviews, setReviews] = useState<Review[]>([]);
  const [peerReviews, setPeerReviews] = useState<PeerReview[]>([]);
  const [fundStatus, setFundStatus] = useState<FundStatus | null>(null);
  const [requestingMore, setRequestingMore] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<{
    reviews: boolean;
    peerReviews: boolean;
  }>({ reviews: false, peerReviews: false });

  // Auth Guard: Redirect to landing if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('Not authenticated, redirecting to landing page')
      router.push('/')
      return
    }
  }, [isAuthenticated, isLoading, router])

  // Fetch data effect - MUST be before any conditional returns
  useEffect(() => {
    // Only fetch data if authenticated and not loading
    if (!isAuthenticated || isLoading) {
      return
    }

    const fetchData = async () => {
      try {
        // Fetch assigned reviews (authenticated)
        // OLD: const reviewsRes = await authFetch('http://localhost:3001/api/reviews')
        const reviewsRes = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reviews`)
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json()
          setReviews(reviewsData)
        }
        
        // Fetch peer reviews (authenticated)
        // OLD: const peerReviewsRes = await authFetch('http://localhost:3001/api/peer-reviews')
        const peerReviewsRes = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/peer-reviews`)
        if (peerReviewsRes.ok) {
          const peerReviewsData = await peerReviewsRes.json()
          setPeerReviews(peerReviewsData)
        }
        
        // Fetch fund status (public endpoint)
        // OLD: const fundRes = await fetch('http://localhost:3001/api/fund/status')
        const fundRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/fund/status`)
        if (fundRes.ok) {
          const fundData = await fundRes.json()
          setFundStatus(fundData)
        }
        
        // Check for pending assignment requests
        const requestsRes = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assignment-requests/my`)
        if (requestsRes.ok) {
          const requests = await requestsRes.json()
          const pendingReviewRequest = requests.some((r: { status: string; requestType: string }) => 
            r.status === 'pending' && (r.requestType === 'reviews' || r.requestType === 'both')
          )
          const pendingPeerReviewRequest = requests.some((r: { status: string; requestType: string }) => 
            r.status === 'pending' && (r.requestType === 'peer-reviews' || r.requestType === 'both')
          )
          setPendingRequests({
            reviews: pendingReviewRequest,
            peerReviews: pendingPeerReviewRequest
          })
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      }
    }

    fetchData()
  }, [isAuthenticated, isLoading]);

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

  // Filter only pending peer reviews for display
  const pendingPeerReviews = peerReviews.filter(pr => pr.status === 'pending');
  
  // Filter out demo reviews for checking completion
  const nonDemoReviews = reviews.filter(r => !r.title?.startsWith('DEMO:'));
  const nonDemoPendingPeerReviews = pendingPeerReviews.filter(pr => !pr.proposalTitle?.startsWith('DEMO:') && !pr.isDemo);

  // Format review end date
  const formatReviewEndDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  // Handle request more assignments
  const requestMoreAssignments = async (type: 'reviews' | 'peer-reviews' | 'both') => {
    // Check if there's already a pending request for this type
    if (type === 'reviews' && pendingRequests.reviews) {
      alert('You already have a pending request for more reviews');
      return;
    }
    if (type === 'peer-reviews' && pendingRequests.peerReviews) {
      alert('You already have a pending request for more peer-reviews');
      return;
    }
    
    setRequestingMore(true);
    try {
      const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assignment-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requestType: type })
      });
      
      if (response.ok) {
        // Update only the relevant pending state
        setPendingRequests(prev => ({
          ...prev,
          reviews: type === 'reviews' || type === 'both' ? true : prev.reviews,
          peerReviews: type === 'peer-reviews' || type === 'both' ? true : prev.peerReviews
        }));
        alert('Request submitted! An admin will review your request soon.');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error requesting assignments:', error);
      alert('Failed to submit request');
    } finally {
      setRequestingMore(false);
    }
  };
  
  // Check if user has completed all non-demo assignments
  const hasCompletedAllReviews = nonDemoReviews.length === 0 && user?.reviewerStatus === 'approved';
  const hasCompletedAllPeerReviews = nonDemoPendingPeerReviews.length === 0 && user?.reviewerStatus === 'approved';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Approved Reviewer Banner */}
      {user?.reviewerStatus === 'approved' && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <div className="max-w-7xl mx-auto flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">
                <strong>You are approved for Fund 14 (Beta Test).</strong> Please check your dashboard daily for new assignments.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Pending Approval Banner */}
      {user?.reviewerStatus === 'pending' && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="max-w-7xl mx-auto flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                <strong>Account Pending Approval</strong> - Your reviewer application is being reviewed. 
                In the meantime, you can explore demo proposals and practice reviews below.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <main className="px-6 py-10">
        <div className="max-w-7xl mx-auto">
          {/* Summary Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-2 text-gray-900">Open Tasks</h2>
              <div className="flex gap-8">
                <div>
                  <p className="text-3xl font-bold text-indigo-600">{reviews.length}</p>
                  <p className="text-sm text-gray-600">Assigned Reviews</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-indigo-600">{pendingPeerReviews.length}</p>
                  <p className="text-sm text-gray-600">Assigned Peer-Reviews</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-2 text-gray-900">Rewards</h2>
              <p className="text-3xl font-bold text-indigo-600">{user?.repPoints || 0}</p>
              <p className="text-sm text-gray-600">REP Points earned</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-2 text-gray-900">Next Deadline</h2>
              <p className="text-2xl font-bold text-indigo-600">
                {fundStatus ? formatReviewEndDate(fundStatus.timeline.reviewEnd) : "August 25th"}
              </p>
              <p className="text-sm text-gray-600">End of Review Phase</p>
            </div>
          </div>

          {/* Two Column Layout for Reviews */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assigned Reviews Column */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-2xl font-bold text-gray-900">Assigned Reviews</h3>
                <div className="relative group">
                  <button className="w-5 h-5 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center text-white text-xs font-bold transition-colors">
                    ?
                  </button>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-64">
                    These are proposal reviews assigned to you. Click on a proposal to start the review process.
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div 
                    key={review.id} 
                    className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-base font-bold text-gray-800">{review.title}</h4>
                          {review.title?.startsWith('DEMO:') && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              DEMO
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                          <span>Due in {review.dueDate} • Earn {review.reward} Points</span>
                          {review.tags.map((tag, index) => (
                            <span 
                              key={index} 
                              className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full"
                            >
                              {TAG_LABELS[tag as keyof typeof TAG_LABELS] || tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <Link 
                        href={`/reviews/${review.id}`} 
                        className="bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors ml-4 whitespace-nowrap"
                      >
                        Review →
                      </Link>
                    </div>
                  </div>
                ))}
                
                {reviews.length === 0 && (
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <p className="text-gray-500 text-center">No reviews assigned yet</p>
                  </div>
                )}
                
                {/* Request More Button for Reviews */}
                {hasCompletedAllReviews && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => requestMoreAssignments('reviews')}
                      disabled={requestingMore || pendingRequests.reviews}
                      className={`py-2 px-4 rounded-full text-sm font-medium transition-colors ${
                        pendingRequests.reviews 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      }`}
                    >
                      {pendingRequests.reviews ? '✓ Request Pending' : '+ Request more assignments'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Assigned Peer-Reviews Column */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-2xl font-bold text-gray-900">Assigned Peer-Reviews</h3>
                <div className="relative group">
                  <button className="w-5 h-5 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center text-white text-xs font-bold transition-colors">
                    ?
                  </button>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-64">
                    These are the peer reviews assigned to you - i.e. you assess the quality and usefulness of reviews written by other reviewers.
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {pendingPeerReviews.map((peerReview) => (
                  <div 
                    key={peerReview.id} 
                    className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-base font-bold text-gray-800">
                            Review {typeof peerReview.reviewId === 'string' ? peerReview.reviewId : peerReview.reviewId._id}
                          </h4>
                          {peerReview.proposalTitle?.startsWith('DEMO:') && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              DEMO
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{peerReview.proposalTitle}</p>
                        <p className="text-sm text-gray-500">
                          Due in {peerReview.dueDate} • Earn {peerReview.reward} Points
                        </p>
                      </div>
                      
                      <Link 
                        href={`/peer-reviews/${peerReview.id}`} 
                        className="bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors ml-4 whitespace-nowrap"
                      >
                        Peer-Review →
                      </Link>
                    </div>
                  </div>
                ))}
                
                {pendingPeerReviews.length === 0 && (
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <p className="text-gray-500 text-center">No peer reviews assigned yet</p>
                  </div>
                )}
                
                {/* Request More Button for Peer Reviews */}
                {hasCompletedAllPeerReviews && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => requestMoreAssignments('peer-reviews')}
                      disabled={requestingMore || pendingRequests.peerReviews}
                      className={`py-2 px-4 rounded-full text-sm font-medium transition-colors ${
                        pendingRequests.peerReviews 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      }`}
                    >
                      {pendingRequests.peerReviews ? '✓ Request Pending' : 'Request more assignments'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}