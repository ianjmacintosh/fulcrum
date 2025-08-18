import { redirect } from '@tanstack/react-router'
import { AuthContext } from '../router'

/**
 * Simplified route guard for user routes - now just checks auth context
 * Heavy lifting is done by TanStack Start middleware
 */
export async function requireUserAuth({ location, context }: { location: any; context: { auth: AuthContext } }) {
  const { auth } = context
  
  // If auth context shows we're not authenticated or not a user, redirect to login
  if (!auth.authenticated || auth.userType !== 'user') {
    throw redirect({
      to: '/login',
      search: {
        redirect: location.href,
      }
    })
  }
  
  return { user: auth.user }
}

/**
 * Simplified route guard for admin routes - now just checks auth context  
 * Heavy lifting is done by TanStack Start middleware
 */
export async function requireAdminAuth({ location, context }: { location: any; context: { auth: AuthContext } }) {
  const { auth } = context
  
  // If auth context shows we're not authenticated or not an admin, redirect to login
  if (!auth.authenticated || auth.userType !== 'admin') {
    throw redirect({
      to: '/login',
      search: {
        redirect: location.href,
      }
    })
  }
  
  return { user: auth.user }
}