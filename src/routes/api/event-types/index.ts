import { createServerFileRoute } from '@tanstack/react-start/server'
import { createSuccessResponse, createErrorResponse } from '../../../utils/auth-helpers'
import { requireUserAuth } from '../../../middleware/auth'
import { eventTypeService } from '../../../db/services/event-types'

export const ServerRoute = createServerFileRoute('/api/event-types/')
  .middleware([requireUserAuth])
  .methods({
    GET: async ({ context }) => {
      const { auth } = context
      
      if (!auth.authenticated || !auth.user) {
        return createErrorResponse('Unauthorized', 401)
      }
      
      try {
        console.log('Event Types API: Fetching event types for userId:', auth.user.id)
        const eventTypes = eventTypeService.getAllEventTypes()
        
        return createSuccessResponse({ eventTypes })
        
      } catch (error: any) {
        console.error('Event Types API: Error fetching event types:', error)
        return createErrorResponse('Failed to load event types')
      }
    }
  })