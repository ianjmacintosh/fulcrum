import { createServerFileRoute } from '@tanstack/react-start/server'
import { userService } from '../../../../../db/services/users'
import { userOnboardingService } from '../../../../../db/services/user-onboarding'
import { requireAdminAuth, createSuccessResponse, createErrorResponse } from '../../../../../utils/auth-helpers'

export const ServerRoute = createServerFileRoute('/api/admin/users/$id/data-summary').methods({
  GET: async ({ request, params }) => {
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
      // Check if user exists
      const user = await userService.getUserById(userId)
      if (!user) {
        return createErrorResponse('User not found', 404)
      }
      
      // Get user's data summary
      const summary = await userOnboardingService.getUserDataSummary(userId)
      
      return createSuccessResponse({
        summary
      })
      
    } catch (error: any) {
      console.error('Error fetching user data summary:', error)
      return createErrorResponse('Failed to fetch user data summary')
    }
  }
})