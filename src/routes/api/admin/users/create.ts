import { createServerFileRoute } from '@tanstack/react-start/server'
import { userService } from '../../../../db/services/users'
import { hashPassword } from '../../../../utils/crypto'
import { validateCSRFFromRequest } from '../../../../utils/csrf-server'
import { requireAdminAuth, createSuccessResponse, createErrorResponse } from '../../../../utils/admin-auth-helpers'
import { z } from 'zod'

// Schema for user creation validation
const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

export const ServerRoute = createServerFileRoute('/api/admin/users/create').methods({
  POST: async ({ request }) => {
    // Check admin authentication
    const authResult = requireAdminAuth(request)
    if ('response' in authResult) {
      return authResult.response
    }
    
    try {
      // Validate CSRF token
      if (!(await validateCSRFFromRequest(request))) {
        return createErrorResponse('Invalid security token. Please refresh the page and try again.', 403)
      }
      
      // Parse form data
      const formData = await request.formData()
      const email = formData.get('email') as string
      const name = formData.get('name') as string
      const password = formData.get('password') as string
      
      // Validate input
      const validation = CreateUserSchema.safeParse({ email, name, password })
      if (!validation.success) {
        return createErrorResponse(validation.error.errors[0].message, 400)
      }
      
      // Hash password
      const hashedPassword = await hashPassword(password)
      
      // Create user
      const user = await userService.createUser({
        email,
        name,
        hashedPassword
      })
      
      return createSuccessResponse({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt
        }
      }, 201)
      
    } catch (error: any) {
      if (error.message.includes('Email address already exists')) {
        return createErrorResponse('Email address already exists', 409)
      }
      
      return createErrorResponse('Failed to create user')
    }
  }
})