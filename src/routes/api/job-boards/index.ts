import { createServerFileRoute } from '@tanstack/react-start/server'
import { jobBoardService } from '../../../db/services/job-boards'
import { createSuccessResponse, createErrorResponse } from '../../../utils/auth-helpers'
import { requireUserAuth } from '../../../middleware/auth'

export const ServerRoute = createServerFileRoute('/api/job-boards/')
  .middleware([requireUserAuth])
  .methods({
    GET: async ({ context }) => {
      const { auth } = context
      
      if (!auth.authenticated || !auth.user) {
        return createErrorResponse('Unauthorized', 401)
      }
      
      const userId = auth.user.id
    
    try {
      const jobBoards = await jobBoardService.getJobBoards(userId)
      
      return createSuccessResponse({
        jobBoards: jobBoards.map(board => ({
          id: board._id!.toString(),
          name: board.name,
          url: board.url
        }))
      })
      
    } catch (error: any) {
      console.error('Error fetching job boards:', error)
      return createErrorResponse('Failed to fetch job boards')
    }
  }
})