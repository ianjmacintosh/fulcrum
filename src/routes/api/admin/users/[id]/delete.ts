import { createServerFileRoute } from '@tanstack/react-start/server'
import { userService } from '../../../../../db/services/users'
import { applicationService } from '../../../../../db/services/applications'
import { validateCSRFFromRequest } from '../../../../../utils/csrf-server'
import { requireAdminAuth, createSuccessResponse, createErrorResponse } from '../../../../../utils/admin-auth-helpers'

export const ServerRoute = createServerFileRoute('/api/admin/users/[id]/delete').methods({
  DELETE: async ({ request, params }) => {
    // Check admin authentication
    const authResult = requireAdminAuth(request)
    if ('response' in authResult) {
      return authResult.response
    }
    
    const userId = params?.id as string
    if (!userId) {
      return createErrorResponse('User ID is required', 400)
    }
    
    try {
      // Validate CSRF token
      if (!(await validateCSRFFromRequest(request))) {
        return createErrorResponse('Invalid security token. Please refresh the page and try again.', 403)
      }
      
      // Check if user exists
      const user = await userService.getUserById(userId)
      if (!user) {
        return createErrorResponse('User not found', 404)
      }
      
      // Delete all user's applications first
      const deletedApplications = await applicationService.deleteAllApplicationsForUser(userId)
      
      // Delete the user
      const userDeleted = await userService.deleteUser(userId)
      
      if (userDeleted) {
        return createSuccessResponse({
          message: `User deleted successfully. ${deletedApplications} associated records were also removed.`
        })
      } else {
        return createErrorResponse('Failed to delete user')
      }
      
    } catch (error) {
      return createErrorResponse('Failed to delete user')
    }
  }
})