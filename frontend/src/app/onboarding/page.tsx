'use client'

import { useState } from 'react'
import { useAuth, useAuthFetch } from '@/app/lib/auth'

// TypeScript interfaces
interface ExpertiseItem {
  area: string;
  level: number;
}

interface FormData {
  username: string;
  expertise: ExpertiseItem[];
  interests: string[];
  reviewCapacity: string;
  hasAffiliations: boolean;
  affiliations: string;
  telegram: string;
  discord: string;
  previousFunds: string[];
  otherGrants: string;
  acceptedGuidelines: boolean;
}

interface FormErrors {
  username?: string;
  expertise?: string;
  interests?: string;
  capacity?: string;
  guidelines?: string;
}

// Interest Tags based on User.js
const INTEREST_TAGS = [
  { id: 'governance', label: 'Governance' },
  { id: 'education', label: 'Education' },
  { id: 'community_outreach', label: 'Community & Outreach' },
  { id: 'development_tools', label: 'Development & Tools' },
  { id: 'identity_security', label: 'Identity & Security' },
  { id: 'defi', label: 'DeFi' },
  { id: 'real_world_applications', label: 'RWA' },
  { id: 'events_marketing', label: 'Events & Marketing' },
  { id: 'interoperability', label: 'Interoperability' },
  { id: 'sustainability', label: 'Sustainability' },
  { id: 'smart_contracts', label: 'Smart Contracts' },
  { id: 'gamefi', label: 'GameFi' },
  { id: 'nft', label: 'NFT' }
]

const EXPERTISE_AREAS = [
  { 
    id: 'technical', 
    label: 'Technical Development',
    description: 'Software Development, System Architecture, Smart Contracts, etc.'
  },
  { 
    id: 'community', 
    label: 'Community & Education',
    description: 'Community Building, Education, Marketing, Outreach, etc.'
  },
  { 
    id: 'product', 
    label: 'Product & Innovation',
    description: 'Product Strategy, Business Development, Innovation & Research, etc.'
  }
]

export default function OnboardingPage() {
  const { updateUser } = useAuth()
  const { authFetch } = useAuthFetch()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  
  const [formData, setFormData] = useState<FormData>({
    // Basic Info
    username: '',
    
    // Expertise
    expertise: [], // Array of {area: string, level: number}
    
    // Interests
    interests: [],
    
    // Capacity
    reviewCapacity: '', // 'max', 'medium', 'low', 'unsure'
    
    // Affiliations
    hasAffiliations: false,
    affiliations: '',
    
    // Communication
    telegram: '',
    discord: '',
    
    // Experience
    previousFunds: [],
    otherGrants: '',
    
    // Terms
    acceptedGuidelines: false,
  })

  const handleExpertiseChange = (area: string, level: number) => {
    const existing = formData.expertise.find(e => e.area === area)
    
    if (existing) {
      if (level === 0) {
        // Remove expertise if level set to 0
        setFormData({
          ...formData,
          expertise: formData.expertise.filter(e => e.area !== area)
        })
      } else {
        // Update level
        setFormData({
          ...formData,
          expertise: formData.expertise.map(e => 
            e.area === area ? { ...e, level } : e
          )
        })
      }
    } else if (level > 0) {
      // Add new expertise
      setFormData({
        ...formData,
        expertise: [...formData.expertise, { area, level }]
      })
    }
  }

  const handleInterestToggle = (tagId: string) => {
    setFormData({
      ...formData,
      interests: formData.interests.includes(tagId)
        ? formData.interests.filter(id => id !== tagId)
        : [...formData.interests, tagId]
    })
  }

  const validateForm = () => {
    const newErrors: FormErrors = {}
    
    if (!formData.username) newErrors.username = 'Username is required'
    if (formData.expertise.length === 0) newErrors.expertise = 'Please select at least one area of expertise'
    if (formData.interests.length === 0) newErrors.interests = 'Please select at least one interest'
    if (!formData.reviewCapacity) newErrors.capacity = 'Please select your review capacity'
    if (!formData.acceptedGuidelines) newErrors.guidelines = 'You must accept the guidelines'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    
    setLoading(true)
    
    try {
    // Use authenticated fetch
    // OLD: const response = await authFetch('http://localhost:3001/api/onboarding', {
    const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/onboarding`, {
      method: 'POST',
      body: JSON.stringify({
        username: formData.username,
        onboardingData: {
          expertise: formData.expertise,
          interests: formData.interests,
          reviewCapacity: formData.reviewCapacity,
          affiliations: {
            hasAffiliations: formData.hasAffiliations,
            proposalList: formData.affiliations
          },
          previousFunds: formData.previousFunds,
          otherGrants: formData.otherGrants,
          completedAt: new Date().toISOString()
        },
        telegram: formData.telegram,
        discord: formData.discord,
        acceptedGuidelines: formData.acceptedGuidelines,
        acceptedGuidelinesAt: formData.acceptedGuidelines ? new Date().toISOString() : undefined
      })
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || 'Onboarding failed')
    }
    
    console.log('Onboarding successful:', data)
    
    // Update user in auth context
    if (data.user) {
      updateUser(data.user)
    }
    
    // Always redirect to dashboard 
    // Dashboard will handle showing approval status
    window.location.href = '/dashboard'
    
  } catch (error) {
    console.error('Onboarding error:', error)
    alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Introduction */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Onboarding Form - Welcome to TrustLevel!</h2>
            <div className="text-gray-600 bg-gradient-to-r from-amber-50 to-yellow-50 p-6 rounded-lg mb-4">
              <p className="font-bold mb-2 text-amber-800">Thank you for signing up as a tester!</p>
              <p className="mb-1 text-sm">This is an initiative that was funded by the Cardano community under Fund 12. This week, we want to test the underlying methods and algorithms of our reviewing tool with a limited number of real Fund 14 proposals (only proposals above 750k ADA of the Product & Partner Challenge).</p>
              
              <p className="font-bold mb-3 text-yellow-800">Test Process:</p>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 text-sm mb-3">
                <li>Complete this onboarding form and select your expertise and interests</li>
                <li>Wait for approval (should be within the next 12 hours)</li>
                <li>Complete your reviews and peer-reviews</li>
                <li>Claim your rewards under &quot;Missions&quot;</li>
              </ol>
              <p className="mb-1 text-sm">To receive your rewards, you must submit 5 reviews and 10 peer reviews.</p>
              <p className="text-sm">Please be diligent in conducting these reviews so that we can test our methodology and algorithms with honest reviews.</p>
            </div>
            <div className="text-gray-600 bg-blue-50 p-4 rounded-lg mb-4">
              <p className="font-bold mb-3">Tool Features in Beta:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-gray-700 text-sm">
                <li>Temperature Check: Easy skipping of low-quality proposals to save your time for the relevant ones</li>
                <li>Quality Control: Each review will undergo a peer-review process</li>
                <li>Expertise and interest-based matching of proposals (only possible to a limited extent in the test due to the small number of proposals)</li>
                <li>AI Analyses: Proposal summary and potential gaps to look for (alpha version)</li>
                <li>New calculation system for proposal scores that takes into account: expertise, peer reviews, reputation (via past performance - not available yet), and several other factors</li>
                <li>In addition, each proposal score will be accompanied by a confidence rating to increase the transparency of the results (all algorithms will be published after the test!)</li>
              </ul>
            </div>
            <div className="text-gray-600 bg-green-50 p-4 rounded-lg mb-4">
              <p className="font-bold mb-2">Our goal:</p>
              <p className="text-sm">We are building a self-regulating evaluation system that uses algorithms and reputation to help communities ensure quality decision-making - similar to scientific peer review, but for decentralized funding and governance.</p>
            </div>
            <div className="text-gray-600 bg-blue-50 p-4 rounded-lg">
              <p className="font-bold mb-1">Feedback:</p>
              <p className="text-sm">We appreciate any feedback - and if anyone has a good idea for the name of this tool, please share :)</p>
            </div>
          </div>

          {/* 1. Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">1. Basic Information *</h3>
            
            <div>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md bg-white text-gray-900 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.username ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Choose your username"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>
          </div>

          {/* 2. Expertise & Skills */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">2. Areas of Expertise *</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select your areas of expertise and rate your proficiency level (1-5).<br />
              We will try our best to match you with proposals that fit your skills.
            </p>
            
            {errors.expertise && (
              <p className="mb-4 text-sm text-red-600">{errors.expertise}</p>
            )}
            
            <div className="space-y-4">
              {EXPERTISE_AREAS.map((area) => {
                const currentLevel = formData.expertise.find(e => e.area === area.id)?.level || 0
                
                return (
                  <div key={area.id} className="border rounded-lg p-4">
                    <div className="mb-2">
                      <h4 className="font-semibold text-gray-900">{area.label}</h4>
                      <p className="text-sm text-gray-600">{area.description}</p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500 w-20">None</span>
                      <div className="flex space-x-2">
                        {[0, 1, 2, 3, 4, 5].map((level) => (
                          <button
                            key={level}
                            onClick={() => handleExpertiseChange(area.id, level)}
                            className={`w-10 h-10 rounded-full border-2 text-sm font-medium transition-colors ${
                              currentLevel === level && level > 0
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : level === 0 && currentLevel === 0
                                ? 'bg-gray-100 border-gray-300 text-gray-600'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {level > 0 ? level : '0'}
                          </button>
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">Expert</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 3. Areas of Interest */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">3. Areas of Interest *</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select all areas you&apos;re most interested in reviewing (multiple selection allowed):
            </p>
            
            {errors.interests && (
              <p className="mb-4 text-sm text-red-600">{errors.interests}</p>
            )}
            
            <div className="flex flex-wrap gap-2">
              {INTEREST_TAGS.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleInterestToggle(tag.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    formData.interests.includes(tag.id)
                      ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                      : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Review Capacity */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">4. Review Capacity *</h3>
            <p className="text-sm text-gray-600 mb-4">
              For each proposal you review, you will be assigned to peer-review approximately 2 other reviews.<br />
              How many proposals would you like to review?<br />
            </p>
            
            {errors.capacity && (
              <p className="mb-4 text-sm text-red-600">{errors.capacity}</p>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { value: 'max', label: 'Maximum (more than 20 proposals)', desc: 'I want to review as many as possible' },
                { value: 'medium', label: 'Medium (10-20 proposals)', desc: 'A balanced workload' },
                { value: 'low', label: 'Low (up to 10 proposals)', desc: 'Just a few quality reviews' },
                { value: 'unsure', label: 'Not sure yet', desc: 'Assign me the default amount' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFormData({ ...formData, reviewCapacity: option.value })}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    formData.reviewCapacity === option.value
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-semibold text-gray-900">{option.label}</div>
                  <div className="text-sm text-gray-600">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 5. Affiliations */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">5. Proposal Affiliations</h3>
            <p className="text-sm text-gray-600 mb-4">
              To ensure fair reviews, please disclose any proposals you are affiliated with in the Fund 14 challenge &quot;Cardano Use Cases: Partners &amp; Products&quot;.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => setFormData({ ...formData, hasAffiliations: false, affiliations: '' })}
                className={`w-full p-3 border-2 rounded-lg text-left transition-colors bg-white ${
                  formData.hasAffiliations === false
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className="text-sm font-medium text-gray-900">
                  I am not affiliated with any proposals.
                </span>
              </button>
              
              <button
                onClick={() => setFormData({ ...formData, hasAffiliations: true })}
                className={`w-full p-3 border-2 rounded-lg text-left transition-colors bg-white ${
                  formData.hasAffiliations === true
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className="text-sm font-medium text-gray-900">
                  I am affiliated with one or more proposals.
                </span>
              </button>
              
              {formData.hasAffiliations && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Please list proposal IDs
                  </label>
                  <textarea
                    value={formData.affiliations}
                    onChange={(e) => setFormData({ ...formData, affiliations: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., 1400234"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 6. Previous Experience */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">6. Previous Experience</h3>
            <p className="text-sm text-gray-600 mb-4">
              Tell us about your experience with web3 grant reviews.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Previous Catalyst Funds participated in:
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Fund 13', 'Fund 12', 'Fund 11', 'Fund 10', 'Earlier'].map((fund) => (
                    <button
                      key={fund}
                      onClick={() => {
                        const funds = formData.previousFunds.includes(fund)
                          ? formData.previousFunds.filter(f => f !== fund)
                          : [...formData.previousFunds, fund]
                        setFormData({ ...formData, previousFunds: funds })
                      }}
                      className={`px-3 py-1 rounded-full text-sm ${
                        formData.previousFunds.includes(fund)
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {fund}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Other grant programs you&apos;ve reviewed for:
                </label>
                <input
                  type="text"
                  value={formData.otherGrants}
                  onChange={(e) => setFormData({ ...formData, otherGrants: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., SingularityNET, Gitcoin, MakerDAO"
                />
              </div>
            </div>
          </div>

          {/* 7. Communication */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">7. Communication Channels</h3>
            <p className="text-sm text-gray-600 mb-4">
              Help us reach you for important updates:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telegram Handle
                </label>
                <input
                  type="text"
                  value={formData.telegram}
                  onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="@username"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discord Username
                </label>
                <input
                  type="text"
                  value={formData.discord}
                  onChange={(e) => setFormData({ ...formData, discord: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="username#1234"
                />
              </div>
            </div>
          </div>

          {/* 8. Terms & Conditions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">8. Terms & Conditions *</h3>
            
            <div className="space-y-3">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={formData.acceptedGuidelines}
                  onChange={(e) => setFormData({ ...formData, acceptedGuidelines: e.target.checked })}
                  className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  I promise to be a thoughtful beta tester, provide lots of feedback, and not break anything too badly ;)
                </span>
              </label>
              {errors.guidelines && (
                <p className="ml-6 text-sm text-red-600">{errors.guidelines}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-4 pb-8">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`px-8 py-3 rounded-full font-medium text-white transition-colors ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {loading ? 'Submitting...' : 'Complete Onboarding'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}