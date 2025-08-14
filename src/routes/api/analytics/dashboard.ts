import { createServerFileRoute } from '@tanstack/react-start/server'
import { requireUserAuth, createSuccessResponse, createErrorResponse } from '../../../utils/auth-helpers'
import { analyticsService } from '../../../db/services/analytics'

export const ServerRoute = createServerFileRoute('/api/analytics/dashboard').methods({
  GET: async ({ request }) => {
    // Check user authentication
    const authResult = requireUserAuth(request)
    if ('response' in authResult) {
      return authResult.response
    }
    
    const { userId } = authResult
    
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