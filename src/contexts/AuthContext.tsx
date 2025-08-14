import React, { createContext, useState, useEffect, ReactNode } from 'react'
import { User } from '../db/schemas'
import { AdminUser } from '../db/schemas'

export interface AuthState {
  user: User | AdminUser | null
  userType: 'admin' | 'user' | null
  isLoggedIn: boolean
  isLoading: boolean
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; userType?: 'admin' | 'user'; redirectUrl?: string }>
  logout: () => Promise<void>
  checkAuthStatus: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    userType: null,
    isLoggedIn: false,
    isLoading: true
  })

  // Check authentication status on mount and when needed
  const checkAuthStatus = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }))
      
      // Check if we have a session cookie
      const response = await fetch('/api/auth/status', {
        method: 'GET',
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.user) {
          setState({
            user: data.user,
            userType: data.userType,
            isLoggedIn: true,
            isLoading: false
          })
        } else {
          setState({
            user: null,
            userType: null,
            isLoggedIn: false,
            isLoading: false
          })
        }
      } else {
        setState({
          user: null,
          userType: null,
          isLoggedIn: false,
          isLoading: false
        })
      }
    } catch (error) {
      console.error('Error checking auth status:', error)
      setState({
        user: null,
        userType: null,
        isLoggedIn: false,
        isLoading: false
      })
    }
  }

  // Login function
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Refresh auth status after successful login
        await checkAuthStatus()
        return { 
          success: true, 
          userType: data.userType,
          redirectUrl: data.redirectUrl 
        }
      } else {
        return { 
          success: false, 
          error: data.error || 'Login failed' 
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { 
        success: false, 
        error: 'Network error. Please try again.' 
      }
    }
  }

  // Logout function
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
      
      // Clear auth state
      setState({
        user: null,
        userType: null,
        isLoggedIn: false,
        isLoading: false
      })
    } catch (error) {
      console.error('Logout error:', error)
      // Clear auth state even if logout request fails
      setState({
        user: null,
        userType: null,
        isLoggedIn: false,
        isLoading: false
      })
    }
  }

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    checkAuthStatus
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export { AuthContext }