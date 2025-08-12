import { createServerFn } from '@tanstack/react-start'
import { adminService } from '../db/services/admin'
import { userService } from '../db/services/users'
import { applicationService } from '../db/services/applications'
import { verifyPassword, hashPassword } from '../utils/crypto'
import { adminRateLimiter, getClientIP } from '../utils/rate-limiter'
import { validateCSRFFromRequest, generateCSRFToken } from '../utils/csrf-server'
import { z } from 'zod'

// Schema for login validation
const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
})

// Schema for user creation validation
const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

// Session cookie configuration
const ADMIN_SESSION_COOKIE = 'fulcrum_admin_session'
const SESSION_MAX_AGE = 4 * 60 * 60 * 1000 // 4 hours

// Simple session store (in production, use Redis or proper session store)
const sessionStore = new Map<string, { adminId: string; expires: number }>()

// Clean up expired sessions every hour
setInterval(() => {
  const now = Date.now()
  const expiredSessions: string[] = []
  
  for (const [sessionId, data] of sessionStore.entries()) {
    if (now > data.expires) {
      expiredSessions.push(sessionId)
    }
  }
  
  expiredSessions.forEach(id => sessionStore.delete(id))
  
  if (expiredSessions.length > 0) {
    console.log(`🧹 Cleaned up ${expiredSessions.length} expired admin sessions`)
  }
}, 60 * 60 * 1000)

/**
 * Generate a secure session ID
 */
function generateSessionId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Get admin session from request
 */
export function getAdminSession(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return null
  
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(cookie => {
      const [key, value] = cookie.trim().split('=')
      return [key, value]
    })
  )
  
  const sessionId = cookies[ADMIN_SESSION_COOKIE]
  if (!sessionId) return null
  
  const session = sessionStore.get(sessionId)
  if (!session || Date.now() > session.expires) {
    if (session) sessionStore.delete(sessionId)
    return null
  }
  
  return session.adminId
}

/**
 * Create admin session
 */
function createAdminSession(adminId: string): string {
  const sessionId = generateSessionId()
  const expires = Date.now() + SESSION_MAX_AGE
  
  sessionStore.set(sessionId, { adminId, expires })
  return sessionId
}

/**
 * Clear admin session
 */
function clearAdminSession(sessionId: string): void {
  sessionStore.delete(sessionId)
}

// Admin login function
export const adminLogin = createServerFn({ method: 'POST' }).handler(async ({ data }: { data?: { username: string; password: string } }) => {
  // For now, skip IP-based rate limiting in direct calls
  const clientIP = 'client'
  
  try {
    console.log('🔐 Admin login attempt for:', data?.username)
    // CSRF validation temporarily disabled
    
    // Get login data
    if (!data) {
      console.log('❌ No data provided to admin login')
      return {
        success: false,
        error: 'Invalid request data'
      }
    }
    
    const { username, password } = data
    console.log('📝 Login data received:', { username, passwordLength: password?.length })
    
    // Validate input
    const validation = LoginSchema.safeParse({ username, password })
    if (!validation.success) {
      console.log('❌ Validation failed:', validation.error.errors)
      return {
        success: false,
        error: 'Invalid username or password.'
      }
    }
    console.log('✅ Input validation passed')
    
    // Find admin user
    console.log('🔍 Looking for admin user:', username)
    const admin = await adminService.getAdminByUsername(username)
    if (!admin) {
      console.log('❌ Admin user not found:', username)
      return {
        success: false,
        error: 'Invalid username or password.'
      }
    }
    console.log('✅ Admin user found:', admin.username)
    
    // Verify password
    console.log('🔑 Verifying password...')
    const isValidPassword = await verifyPassword(password, admin.hashedPassword)
    if (!isValidPassword) {
      console.log('❌ Password verification failed')
      return {
        success: false,
        error: 'Invalid username or password.'
      }
    }
    console.log('✅ Password verified successfully')
    
    // Success - create session
    console.log('🎉 Creating admin session...')
    const sessionId = createAdminSession(admin.username)
    const sessionCookie = `${ADMIN_SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_MAX_AGE / 1000}`
    
    console.log('✅ Login successful for:', admin.username)
    return {
      success: true,
      message: 'Login successful',
      sessionCookie
    }
    
  } catch (error) {
    console.error('💥 Admin login error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return {
      success: false,
      error: 'An error occurred. Please try again.'
    }
  }
})

// GET /api/admin/logout
export const adminLogout = createServerFn({ method: 'GET' }).handler(async ({ request }) => {
  const cookieHeader = request.headers.get('cookie')
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(cookie => {
        const [key, value] = cookie.trim().split('=')
        return [key, value]
      })
    )
    
    const sessionId = cookies[ADMIN_SESSION_COOKIE]
    if (sessionId) {
      clearAdminSession(sessionId)
    }
  }
  
  return new Response(JSON.stringify({
    success: true,
    message: 'Logged out successfully'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
    }
  })
})

// GET /api/admin/users
export const getUsers = createServerFn({ method: 'GET' }).handler(async ({ request }) => {
  const adminId = getAdminSession(request)
  if (!adminId) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Unauthorized'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  try {
    const users = await userService.getAllUsers()
    
    // Don't return hashed passwords in the response
    const safeUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt
    }))
    
    return new Response(JSON.stringify({
      success: true,
      users: safeUsers
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Get users error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch users'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

// POST /api/users
export const createUser = createServerFn({ method: 'POST' }).handler(async ({ request }) => {
  const adminId = getAdminSession(request)
  if (!adminId) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Unauthorized'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  try {
    // Validate CSRF token
    if (!(await validateCSRFFromRequest(request))) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid security token. Please refresh the page and try again.'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Parse form data
    const formData = await request.formData()
    const email = formData.get('email') as string
    const name = formData.get('name') as string
    const password = formData.get('password') as string
    
    // Validate input
    const validation = CreateUserSchema.safeParse({ email, name, password })
    if (!validation.success) {
      return new Response(JSON.stringify({
        success: false,
        error: validation.error.errors[0].message
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password)
    
    // Create user
    const user = await userService.createUser({
      email,
      name,
      hashedPassword
    })
    
    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error: any) {
    console.error('Create user error:', error)
    
    if (error.message.includes('Email address already exists')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email address already exists'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create user'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

// DELETE /api/users/:id
export const deleteUser = createServerFn({ method: 'DELETE' }).handler(async ({ request, params }) => {
  const adminId = getAdminSession(request)
  if (!adminId) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Unauthorized'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  const userId = params?.id as string
  if (!userId) {
    return new Response(JSON.stringify({
      success: false,
      error: 'User ID is required'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  try {
    // Validate CSRF token
    if (!(await validateCSRFFromRequest(request))) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid security token. Please refresh the page and try again.'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Check if user exists
    const user = await userService.getUserById(userId)
    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Delete all user's applications first
    const deletedApplications = await applicationService.deleteAllApplicationsForUser(userId)
    
    // Delete the user
    const userDeleted = await userService.deleteUser(userId)
    
    if (userDeleted) {
      return new Response(JSON.stringify({
        success: true,
        message: `User deleted successfully. ${deletedApplications} associated records were also removed.`
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to delete user'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
  } catch (error) {
    console.error('Delete user error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to delete user'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

// Generate CSRF tokens (server function)
export const getCSRFTokens = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const { token, hash } = await generateCSRFToken()
    
    return {
      success: true,
      csrfToken: token,
      csrfHash: hash
    }
  } catch (error) {
    console.error('💥 CSRF token generation error:', error)
    return {
      success: false,
      error: 'Failed to generate CSRF token'
    }
  }
})
