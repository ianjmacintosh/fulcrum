import { createServerFileRoute } from '@tanstack/react-start/server'
import { requireUserAuth, createSuccessResponse, createErrorResponse } from '../../../utils/auth-helpers'
import { analyticsService } from '../../../db/services/analytics'

export const ServerRoute = createServerFileRoute('/api/analytics/projection').methods({
  GET: async ({ request }) => {
    // Check user authentication
    const authResult = requireUserAuth(request)
    if ('response' in authResult) {
      return authResult.response
    }
    
    const { userId } = authResult
    
    try {
      console.log('Analytics API: Fetching projection data for userId:', userId)
      const projectionData = await analyticsService.getJobProjection(userId)
      
      return createSuccessResponse(projectionData)
      
    } catch (error: any) {
      console.error('Analytics API: Projection error:', error)
      return createErrorResponse('Failed to load job projection')
    }
  }
})