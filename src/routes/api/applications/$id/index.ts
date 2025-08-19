import { createServerFileRoute } from '@tanstack/react-start/server'
import { createSuccessResponse, createErrorResponse } from '../../../../utils/auth-helpers'
import { requireUserAuth } from '../../../../middleware/auth'
import { applicationService } from '../../../../db/services/applications'

export const ServerRoute = createServerFileRoute('/api/applications/$id/')
  .middleware([requireUserAuth])
  .methods({
    GET: async ({ context, params }) => {
      const { auth } = context
      const { id } = params
      
      if (!auth.authenticated || !auth.user) {
        return createErrorResponse('Unauthorized', 401)
      }
      
      if (!id) {
        return createErrorResponse('Application ID is required', 400)
      }
      
      try {
        console.log(`Applications API: Fetching application ${id} for userId:`, auth.user.id)
        const application = await applicationService.getApplicationById(auth.user.id, id)
        
        if (!application) {
          return createErrorResponse('Application not found', 404)
        }

        // Sort events chronologically (oldest first) for timeline display
        const sortedEvents = [...application.events].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        )

        const applicationWithSortedEvents = {
          ...application,
          events: sortedEvents
        }
        
        return createSuccessResponse({ application: applicationWithSortedEvents })
        
      } catch (error: any) {
        console.error('Applications API: Error fetching application:', error)
        return createErrorResponse('Failed to load application')
      }
    }
  })