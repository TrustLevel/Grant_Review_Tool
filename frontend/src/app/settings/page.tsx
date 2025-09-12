'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth, useAuthFetch } from '@/app/lib/auth'

interface ExpertiseItem {
  area: string;
  level: number;
}

interface FormData {
  expertise: ExpertiseItem[];
  interests: string[];
}

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

export default function SettingsPage() {
  const { user } = useAuth()
  const { authFetch } = useAuthFetch()
  const [loading, setLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    expertise: [],
    interests: []
  })

  useEffect(() => {
    const loadSettings = async () => {
      if (dataLoaded) return // Verhindert mehrfaches Laden
      
      try {
        const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings`)
        const data = await response.json()
        
        if (response.ok) {
          setFormData({
            expertise: data.expertise || [],
            interests: data.interests || []
          })
          setDataLoaded(true)
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }
    
    if (user && !dataLoaded) {
      loadSettings()
    }
  }, [user, authFetch, dataLoaded])

  const handleExpertiseChange = (area: string, level: number) => {
    const existing = formData.expertise.find(e => e.area === area)
    
    if (existing) {
      if (level === 0) {
        setFormData({
          ...formData,
          expertise: formData.expertise.filter(e => e.area !== area)
        })
      } else {
        setFormData({
          ...formData,
          expertise: formData.expertise.map(e => 
            e.area === area ? { ...e, level } : e
          )
        })
      }
    } else if (level > 0) {
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

  const handleSave = async () => {
    setLoading(true)
    
    try {
      const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings`, {
        method: 'PUT',
        body: JSON.stringify({
          expertise: formData.expertise,
          interests: formData.interests
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update settings')
      }
      
      alert('Settings saved successfully!')
      
    } catch (error) {
      console.error('Settings save error:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
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
            <h1 className="text-2xl font-bold mb-2 text-gray-900">Settings</h1>
            <p className="text-gray-600">Update your expertise and interests to improve proposal matching.</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Areas of Expertise</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select your areas of expertise and rate your proficiency level (1-5).
            </p>
            
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

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Areas of Interest</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select all areas you are most interested in reviewing (multiple selection allowed).
            </p>
            
            {/* Current Interests Summary */}
            {formData.interests.length > 0 && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg">
                <h4 className="text-sm font-medium text-green-900 mb-2">Current Interests:</h4>
                <div className="flex flex-wrap gap-2">
                  {formData.interests.map((interestId) => {
                    const interest = INTEREST_TAGS.find(t => t.id === interestId);
                    return (
                      <span key={interestId} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                        {interest?.label}
                      </span>
                    );
                  })}
                </div>
              </div>
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

          <div className="flex justify-center pt-4 pb-8">
            <button
              onClick={handleSave}
              disabled={loading}
              className={`px-8 py-3 rounded-full font-medium text-white transition-colors ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}