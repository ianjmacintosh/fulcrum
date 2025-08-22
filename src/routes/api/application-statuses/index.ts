import { createServerFileRoute } from '@tanstack/react-start/server'
import { createSuccessResponse, createErrorResponse } from '../../../utils/auth-helpers'
import { requireUserAuth } from '../../../middleware/auth'
import { applicationStatusService } from '../../../db/services/application-statuses'

export const ServerRoute = createServerFileRoute('/api/application-statuses/')
  .middleware([requireUserAuth])
  .methods({
    GET: async ({ context }) => {
      const { auth } = context
      
      if (!auth.authenticated || !auth.user) {
        return createErrorResponse('Unauthorized', 401)
      }
      
      try {
        console.log('Application Statuses API: Fetching statuses for userId:', auth.user.id)
        const statuses = await applicationStatusService.getAllStatuses(auth.user.id)
        
        // If no statuses exist, create default ones
        if (statuses.length === 0) {
          console.log('No statuses found, creating default statuses for user:', auth.user.id)
          const defaultStatuses = await applicationStatusService.createDefaultStatuses(auth.user.id)
          return createSuccessResponse({ statuses: defaultStatuses })
        }
        
        return createSuccessResponse({ statuses })
        
      } catch (error: any) {
        console.error('Application Statuses API: Error fetching statuses:', error)
        return createErrorResponse('Failed to load application statuses')
      }
    }
  })