// src/app/auth/callback/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { useAuth } from '@/app/lib/auth'

export default function AuthCallback() {
  const router = useRouter()
  const { login } = useAuth()
  const [message, setMessage] = useState('Logging you in...')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 1. SUPABASE USER HOLEN
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) throw error
        
        if (!user) {
          throw new Error('No user found')
        }

        // 2. AN UNSER BACKEND SENDEN
        // OLD: const response = await fetch('http://localhost:3001/api/auth/login', {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            name: user.user_metadata?.full_name || user.email?.split('@')[0],
            // Supabase generiert keine echte wallet address
            // Das kommt später mit Mesh SDK
          })
        })

        if (!response.ok) {
          throw new Error('Backend login failed')
        }

        const data = await response.json()

        // 3. JWT TOKEN & USER MIT AUTH CONTEXT SPEICHERN
        if (data.token && data.user) {
          login(data.token, data.user)
        }

        // 4. REDIRECT BASIEREND AUF USER STATUS
        if (!data.user.onboardingCompleted) {
          setMessage('Redirecting to onboarding...')
          router.push('/onboarding')
        } else {
          // Alle onboarded User gehen zum Dashboard
          // (pending User sehen Banner + Demo Content)
          setMessage('Success! Redirecting to dashboard...')
          router.push('/dashboard')
        }

      } catch (error) {
        console.error('Callback error:', error)
        setMessage('Login failed. Redirecting...')
        
        // Bei Fehler zurück zur Startseite
        setTimeout(() => {
          router.push('/')
        }, 2000)
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
}