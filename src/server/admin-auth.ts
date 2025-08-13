import { createServerFn } from '@tanstack/react-start'
import { userService } from '../db/services/users'
import { applicationService } from '../db/services/applications'
import { hashPassword } from '../utils/crypto'
import { validateCSRFFromRequest, generateCSRFToken, createCSRFHash } from '../utils/csrf-server'
import { getAdminSession, clearAdminSession, ADMIN_SESSION_COOKIE } from '../utils/admin-session'
import { z } from 'zod'

// Schema for user creation validation
const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
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
  
  // Only use Secure flag in production (HTTPS)
  const isProduction = process.env.NODE_ENV === 'production'
  const secureFlag = isProduction ? 'Secure; ' : ''
  
  return new Response(JSON.stringify({
    success: true,
    message: 'Logged out successfully'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `${ADMIN_SESSION_COOKIE}=; Path=/; ${secureFlag}SameSite=Strict; Max-Age=0`
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
    const { token, secret } = generateCSRFToken()
    const hash = createCSRFHash(token, secret)
    
    return {
      success: true,
      csrfToken: token,
      csrfHash: hash
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to generate CSRF token'
    }
  }
})
