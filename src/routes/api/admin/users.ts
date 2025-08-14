import { createServerFileRoute } from '@tanstack/react-start/server'
import { userService } from '../../../db/services/users'
import { requireAdminAuth, createSuccessResponse, createErrorResponse } from '../../../utils/auth-helpers'

export const ServerRoute = createServerFileRoute('/api/admin/users').methods({
  GET: async ({ request }) => {
    // Check admin authentication
    const authResult = requireAdminAuth(request)
    if ('response' in authResult) {
      return authResult.response
    }
    
    try {
      const users = await userService.getAllUsers()
      
      // Don't return hashed passwords in the response for security
      const safeUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }))
      
      return createSuccessResponse({ users: safeUsers })
      
    } catch (error) {
      return createErrorResponse('Failed to fetch users')
    }
  }
})