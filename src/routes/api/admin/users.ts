import { createServerFileRoute } from '@tanstack/react-start/server'
import { userService } from '../../../db/services/users'
import { createSuccessResponse, createErrorResponse } from '../../../utils/auth-helpers'
import { requireAdminAuth } from '../../../middleware/auth'

export const ServerRoute = createServerFileRoute('/api/admin/users')
  .middleware([requireAdminAuth])
  .methods({
    GET: async ({ context }) => {
      const { auth } = context
      
      if (!auth.authenticated || auth.userType !== 'admin') {
        return createErrorResponse('Unauthorized', 401)
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