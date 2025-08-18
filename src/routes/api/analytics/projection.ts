import { createServerFileRoute } from '@tanstack/react-start/server'
import { createSuccessResponse, createErrorResponse } from '../../../utils/auth-helpers'
import { requireUserAuth } from '../../../middleware/auth'
import { analyticsService } from '../../../db/services/analytics'

export const ServerRoute = createServerFileRoute('/api/analytics/projection')
  .middleware([requireUserAuth])
  .methods({
    GET: async ({ context }) => {
      const { auth } = context
      
      if (!auth.authenticated || !auth.user) {
        return createErrorResponse('Unauthorized', 401)
      }
      
      const userId = auth.user.id
    
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