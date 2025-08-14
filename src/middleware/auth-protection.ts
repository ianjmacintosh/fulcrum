import { getSession, getAdminSession, getUserSession } from '../utils/session'

/**
 * Middleware to protect admin routes
 * Redirects unauthenticated users to the admin login page
 */
export function requireAdminAuth() {
  return async (request: Request): Promise<Response | null> => {
    const url = new URL(request.url)
    
    // Skip authentication check for login page and API endpoints
    if (url.pathname === '/admin' || url.pathname.startsWith('/api/admin/login')) {
      return null // Continue to route handler
    }
    
    // Check if admin is authenticated
    const adminId = getAdminSession(request)
    if (!adminId) {
      // Redirect to admin login page
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/admin'
        }
      })
    }
    
    return null // Continue to route handler
  }
}

/**
 * Middleware to protect user routes
 * Redirects unauthenticated users to the user login page
 */
export function requireUserAuth() {
  return async (request: Request): Promise<Response | null> => {
    const url = new URL(request.url)
    
    // Skip authentication check for login, reset-password, and auth API endpoints
    if (url.pathname === '/login' || 
        url.pathname === '/reset-password' || 
        url.pathname.startsWith('/api/auth/')) {
      return null // Continue to route handler
    }
    
    // Check if user is authenticated
    const userId = getUserSession(request)
    if (!userId) {
      // Redirect to user login page
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/login'
        }
      })
    }
    
    return null // Continue to route handler
  }
}

/**
 * Middleware to protect any route with role-based access
 * Redirects based on required role type
 */
export function requireAuth(requiredRole: 'admin' | 'user') {
  return async (request: Request): Promise<Response | null> => {
    const url = new URL(request.url)
    
    // Skip authentication for appropriate login pages and API endpoints
    if (requiredRole === 'admin') {
      if (url.pathname === '/admin' || url.pathname.startsWith('/api/admin/login')) {
        return null
      }
    } else {
      if (url.pathname === '/login' || 
          url.pathname === '/reset-password' || 
          url.pathname.startsWith('/api/auth/')) {
        return null
      }
    }
    
    const session = getSession(request)
    if (!session || session.userType !== requiredRole) {
      // Redirect to appropriate login page based on required role
      const redirectPath = requiredRole === 'admin' ? '/admin' : '/login'
      return new Response(null, {
        status: 302,
        headers: {
          'Location': redirectPath
        }
      })
    }
    
    return null // Continue to route handler
  }
}

/**
 * Check if current request is from authenticated admin
 * @param request - The incoming request
 * @returns The admin ID if authenticated, null otherwise
 */
export function getAuthenticatedAdmin(request: Request): string | null {
  return getAdminSession(request)
}

/**
 * Check if current request is from authenticated user
 * @param request - The incoming request
 * @returns The user ID if authenticated, null otherwise
 */
export function getAuthenticatedUser(request: Request): string | null {
  return getUserSession(request)
}

/**
 * Get authenticated session data
 * @param request - The incoming request
 * @returns Session data if authenticated, null otherwise
 */
export function getAuthenticatedSession(request: Request): { userId: string; userType: 'admin' | 'user' } | null {
  const session = getSession(request)
  if (!session) return null
  
  return {
    userId: session.userId,
    userType: session.userType
  }
}

/**
 * Ensure admin authentication and return admin ID or throw error
 * @param request - The incoming request
 * @returns The admin ID
 * @throws Error if not authenticated
 */
export function requireAuthentication(request: Request): string {
  const adminId = getAdminSession(request)
  if (!adminId) {
    throw new Error('Authentication required')
  }
  return adminId
}

/**
 * Ensure user authentication and return user ID or throw error
 * @param request - The incoming request
 * @returns The user ID
 * @throws Error if not authenticated
 */
export function requireUserAuthentication(request: Request): string {
  const userId = getUserSession(request)
  if (!userId) {
    throw new Error('User authentication required')
  }
  return userId
}