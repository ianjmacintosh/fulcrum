import { createServerFileRoute } from '@tanstack/react-start/server'
import { createSuccessResponse, createErrorResponse } from '../../../utils/auth-helpers'
import { requireUserAuth } from '../../../middleware/auth'
import { analyticsService } from '../../../db/services/analytics'

export const ServerRoute = createServerFileRoute('/api/analytics/dashboard')
  .middleware([requireUserAuth])
  .methods({
    GET: async ({ context }) => {
      const { auth } = context
      
      if (!auth.authenticated || !auth.user) {
        return createErrorResponse('Unauthorized', 401)
      }
      
      const userId = auth.user.id
    
    try {
      console.log('Analytics API: Fetching dashboard metrics for userId:', userId)
      const dashboardData = await analyticsService.getDashboardMetrics(userId)
      
      return createSuccessResponse(dashboardData)
      
    } catch (error: any) {
      console.error('Analytics API: Dashboard error:', error)
      return createErrorResponse('Failed to load dashboard analytics')
    }
  }
})