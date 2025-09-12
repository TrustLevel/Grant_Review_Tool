'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

interface User {
  id: string
  email: string
  username?: string
  onboardingCompleted: boolean
  reviewerStatus: string
  repPoints?: number
  role?: string  // Add role field for admin check
  onboardingData?: {
    expertise?: Array<{area: string, level: number}>
    interests?: string[]
  }
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
  updateUser: (user: User) => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize auth state from localStorage
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('trustlevel-token')
      const storedUser = localStorage.getItem('trustlevel-user')

      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      }
      // No else block - users without tokens remain logged out
    } catch (error) {
      console.error('Error loading auth state:', error)
      // Clear corrupted data
      localStorage.removeItem('trustlevel-token')
      localStorage.removeItem('trustlevel-user')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const validateToken = useCallback(async () => {
    try {
      // OLD: const response = await fetch('http://localhost:3001/api/onboarding/status', {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        // Token is invalid or expired
        if (response.status === 401) {
          console.log('Token expired or invalid, logging out')
          logout()
        }
        return
      }

      const data = await response.json()
      // Update user data if needed
      if (data.userId) {
        updateUser({
          id: data.userId,
          email: data.email,
          username: data.username,
          onboardingCompleted: data.onboardingCompleted,
          reviewerStatus: data.reviewerStatus,
          role: data.role || 'reviewer',  // Include role from API
          repPoints: data.repPoints || 0,
          onboardingData: data.onboardingData || null
        })
      }
    } catch (error) {
      console.error('Token validation error:', error)
      // Don't logout on network errors, only on auth errors
    }
  }, [token])

  // Check token validity - only when token changes, not when user data updates
  useEffect(() => {
    if (token) {
      validateToken()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const login = (newToken: string, newUser: User) => {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('trustlevel-token', newToken)
    localStorage.setItem('trustlevel-user', JSON.stringify(newUser))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('trustlevel-token')
    localStorage.removeItem('trustlevel-user')
    
    // Redirect to home page
    window.location.href = '/'
  }

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser)
    localStorage.setItem('trustlevel-user', JSON.stringify(updatedUser))
  }

  const refreshUser = async () => {
    if (!token) return
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const userData = await response.json()
        updateUser(userData.user)
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error)
    }
  }

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    updateUser,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Custom hook for API calls with authentication
export function useAuthFetch() {
  const { token, logout } = useAuth()

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    if (!token) {
      throw new Error('No authentication token available')
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    // Handle auth errors
    if (response.status === 401) {
      logout()
      throw new Error('Session expired')
    }

    return response
  }, [token, logout])

  return { authFetch }
}