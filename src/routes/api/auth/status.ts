import { createServerFileRoute } from '@tanstack/react-start/server'
import { getSession } from '../../../utils/session'
import { adminService } from '../../../db/services/admin'
import { userService } from '../../../db/services/users'
import { createSuccessResponse } from '../../../utils/auth-helpers'

export const ServerRoute = createServerFileRoute('/api/auth/status').methods({
  GET: async ({ request }) => {
    try {
      // Check session
      const session = getSession(request)
      if (!session) {
        return createSuccessResponse({
          authenticated: false,
          user: null,
          userType: null
        })
      }

      let user = null
      if (session.userType === 'admin') {
        const adminUser = await adminService.getAdminByUsername(session.userId)
        if (adminUser) {
          // Don't return hashed password
          user = {
            id: adminUser.username,
            username: adminUser.username,
            createdAt: adminUser.createdAt
          }
        }
      } else if (session.userType === 'user') {
        const regularUser = await userService.getUserById(session.userId)
        if (regularUser) {
          // Don't return hashed password
          user = {
            id: regularUser.id,
            email: regularUser.email,
            name: regularUser.name,
            createdAt: regularUser.createdAt,
            updatedAt: regularUser.updatedAt
          }
        }
      }

      if (!user) {
        // Session exists but user not found - invalid session
        return createSuccessResponse({
          authenticated: false,
          user: null,
          userType: null
        })
      }

      return createSuccessResponse({
        authenticated: true,
        user,
        userType: session.userType
      })

    } catch (error) {
      console.error('Error checking auth status:', error)
      return createSuccessResponse({
        authenticated: false,
        user: null,
        userType: null
      })
    }
  }
})