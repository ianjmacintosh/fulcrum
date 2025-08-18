import { createMiddleware } from '@tanstack/react-start'
import { getSession } from '../utils/session'

// Auth context type for middleware
export interface AuthContext {
  user: {
    id: string
    email?: string
    name?: string  
    username?: string
    createdAt: Date
    updatedAt?: Date
  } | null
  userType: 'admin' | 'user' | null
  authenticated: boolean
  session?: {
    userId: string
    userType: 'admin' | 'user'
    expires: number
  } | null
}

/**
 * Authentication middleware that verifies user identity and adds auth context
 * Follows TanStack Start middleware best practices for server routes
 */
export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ request, next }) => {
    // Get session from request
    const session = getSession(request)
    
    let authContext: AuthContext = {
      user: null,
      userType: null,
      authenticated: false,
      session: null
    }
    
    if (session) {
      // Get user details based on session type
      let user = null
      if (session.userType === 'admin') {
        const { adminService } = await import('../db/services/admin')
        const adminUser = await adminService.getAdminByUsername(session.userId)
        if (adminUser) {
          user = {
            id: adminUser.username,
            username: adminUser.username,
            createdAt: adminUser.createdAt
          }
        }
      } else if (session.userType === 'user') {
        const { userService } = await import('../db/services/users')
        const regularUser = await userService.getUserById(session.userId)
        if (regularUser) {
          user = {
            id: regularUser.id,
            email: regularUser.email,
            name: regularUser.name,
            createdAt: regularUser.createdAt,
            updatedAt: regularUser.updatedAt
          }
        }
      }
      
      if (user) {
        authContext = {
          user,
          userType: session.userType,
          authenticated: true,
          session: {
            userId: session.userId,
            userType: session.userType,
            expires: session.expires
          }
        }
      }
    }
    
    // Continue with auth context
    return next({
      context: {
        auth: authContext
      }
    })
  }
)

/**
 * Middleware that requires user authentication
 */
export const requireUserAuth = createMiddleware({ type: 'function' }).server(
  async ({ request, next }) => {
    const session = getSession(request)
    
    if (!session || session.userType !== 'user') {
      return {
        request,
        pathname: new URL(request.url).pathname,
        context: {},
        response: new Response(JSON.stringify({
          success: false,
          error: 'Unauthorized'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
    
    // Get user details
    const { userService } = await import('../db/services/users')
    const user = await userService.getUserById(session.userId)
    
    if (!user) {
      return {
        request,
        pathname: new URL(request.url).pathname,
        context: {},
        response: new Response(JSON.stringify({
          success: false,
          error: 'User not found'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
    
    return next({
      context: {
        auth: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          },
          userType: 'user' as const,
          authenticated: true,
          session: {
            userId: session.userId,
            userType: session.userType,
            expires: session.expires
          }
        }
      }
    })
  }
)

/**
 * Middleware that requires admin authentication
 */
export const requireAdminAuth = createMiddleware({ type: 'function' }).server(
  async ({ request, next }) => {
    const session = getSession(request)
    
    if (!session || session.userType !== 'admin') {
      return {
        request,
        pathname: new URL(request.url).pathname,
        context: {},
        response: new Response(JSON.stringify({
          success: false,
          error: 'Unauthorized'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
    
    // Get admin details
    const { adminService } = await import('../db/services/admin')
    const admin = await adminService.getAdminByUsername(session.userId)
    
    if (!admin) {
      return {
        request,
        pathname: new URL(request.url).pathname,
        context: {},
        response: new Response(JSON.stringify({
          success: false,
          error: 'Admin not found'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
    
    return next({
      context: {
        auth: {
          user: {
            id: admin.username,
            username: admin.username,
            createdAt: admin.createdAt
          },
          userType: 'admin' as const,
          authenticated: true,
          session: {
            userId: session.userId,
            userType: session.userType,
            expires: session.expires
          }
        }
      }
    })
  }
)