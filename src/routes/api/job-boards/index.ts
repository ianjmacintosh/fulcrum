import { createServerFileRoute } from '@tanstack/react-start/server'
import { jobBoardService } from '../../../db/services/job-boards'
import { requireUserAuth, createSuccessResponse, createErrorResponse } from '../../../utils/auth-helpers'

export const ServerRoute = createServerFileRoute('/api/job-boards/').methods({
  GET: async ({ request }) => {
    // Check user authentication
    const authResult = requireUserAuth(request)
    if ('response' in authResult) {
      return authResult.response
    }
    
    const { userId } = authResult
    
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