import { createServerFileRoute } from '@tanstack/react-start/server'
import { requireUserAuth, createSuccessResponse, createErrorResponse } from '../../../utils/auth-helpers'
import { applicationService } from '../../../db/services/applications'

export const ServerRoute = createServerFileRoute('/api/applications/').methods({
  GET: async ({ request }) => {
    // Check user authentication
    const authResult = requireUserAuth(request)
    if ('response' in authResult) {
      return authResult.response
    }
    
    const { userId } = authResult
    
    try {
      console.log('Applications API: Fetching applications for userId:', userId)
      const applications = await applicationService.getApplications(userId)
      
      return createSuccessResponse({ applications })
      
    } catch (error: any) {
      console.error('Applications API: Error fetching applications:', error)
      return createErrorResponse('Failed to load applications')
    }
  }
})