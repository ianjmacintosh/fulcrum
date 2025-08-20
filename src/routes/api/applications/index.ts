import { createServerFileRoute } from '@tanstack/react-start/server'
import { createSuccessResponse, createErrorResponse } from '../../../utils/auth-helpers'
import { requireUserAuth } from '../../../middleware/auth'
import { applicationService } from '../../../db/services/applications'

export const ServerRoute = createServerFileRoute('/api/applications/')
  .middleware([requireUserAuth])
  .methods({
    GET: async ({ context }) => {
      const { auth } = context
      
      if (!auth.authenticated || !auth.user) {
        return createErrorResponse('Unauthorized', 401)
      }
      
      try {
        const applications = await applicationService.getApplications(auth.user.id)
        
        return createSuccessResponse({ applications })
        
      } catch (error: any) {
        console.error('Applications API: Error fetching applications:', error)
        return createErrorResponse('Failed to load applications')
      }
    }
  })