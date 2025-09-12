'use client'

import { useState } from 'react'
import { supabase } from '@/app/lib/supabase.js'

export default function Home() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    try {
      setLoading(true)
      setMessage('')
      
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
         emailRedirectTo: `${window.location.origin}/auth/callback`
       }
      })
      
      if (error) throw error
      
      setMessage('Check your email for the magic link!')
      setEmail('')
      
    } catch (error) {
      if (error instanceof Error) {
        setMessage('Error: ' + error.message)
      } else {
        setMessage('An unknown error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="/TrustLevel_JPG_LOGO.jpg" 
              alt="TrustLevel Logo" 
              className="h-16 w-auto"
            />
          </div>
          <div className="mb-8">
            <div className="inline-flex items-center gap-3 bg-gray-50 border border-gray-200 px-6 py-3 rounded-full shadow-sm">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p className="text-gray-900 font-semibold text-lg tracking-wide">
                Review Platform
              </p>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Beta Test Signup & Login
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white text-gray-900"
              disabled={loading}
            />
          </div>
          
          <button
            onClick={handleLogin}
            disabled={loading || !email}
            className="w-full bg-gray-800 text-white py-3 px-4 rounded-md font-medium hover:bg-gray-900 focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-3 rounded-md text-sm text-center ${
            message.includes('Error') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
          }`}>
            {message}
          </div>
        )}

        {/* Info */}
        <div className="text-center text-xs text-gray-500 border-t pt-4">
          <p>
            We&apos;ll send you a secure login link via email. No password required.
          </p>
        </div>
      </div>
    </div>
  )
}