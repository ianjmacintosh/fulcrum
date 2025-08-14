import { redirect } from '@tanstack/react-router'

/**
 * Authentication guard for user routes
 * Checks if user is authenticated and has 'user' role
 */
export async function requireUserAuth({ location }: { location: any }) {
  try {
    const response = await fetch('/api/auth/status', {
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        }
      })
    }
    
    const authData = await response.json()
    if (!authData.success || !authData.authenticated || authData.userType !== 'user') {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        }
      })
    }
    
    return { user: authData.user }
  } catch (error) {
    if (error instanceof Response || (error as any)?.to) {
      throw error // Re-throw redirects
    }
    
    // For other errors, redirect to login
    throw redirect({
      to: '/login',
      search: {
        redirect: location.href,
      }
    })
  }
}

/**
 * Authentication guard for admin routes
 * Checks if user is authenticated and has 'admin' role
 */
export async function requireAdminAuth({ location }: { location: any }) {
  try {
    const response = await fetch('/api/auth/status', {
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        }
      })
    }
    
    const authData = await response.json()
    if (!authData.success || !authData.authenticated || authData.userType !== 'admin') {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        }
      })
    }
    
    return { user: authData.user }
  } catch (error) {
    if (error instanceof Response || (error as any)?.to) {
      throw error // Re-throw redirects
    }
    
    // For other errors, redirect to main login
    throw redirect({
      to: '/login',
      search: {
        redirect: location.href,
      }
    })
  }
}