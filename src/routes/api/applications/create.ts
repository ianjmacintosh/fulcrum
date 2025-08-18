import { createServerFileRoute } from '@tanstack/react-start/server'
import { applicationService } from '../../../db/services/applications'
import { workflowService } from '../../../db/services/workflows'
import { jobBoardService } from '../../../db/services/job-boards'
import { createSuccessResponse, createErrorResponse } from '../../../utils/auth-helpers'
import { requireUserAuth } from '../../../middleware/auth'
import { z } from 'zod'

// Schema for application creation validation
const CreateApplicationSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  roleName: z.string().min(1, 'Job title is required'),
  jobPostingUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  appliedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  jobBoard: z.string().min(1, 'Job board is required'),
  applicationType: z.enum(['cold', 'warm']),
  roleType: z.enum(['manager', 'engineer']),
  locationType: z.enum(['on-site', 'hybrid', 'remote']),
  notes: z.string().optional().or(z.literal(''))
})

export const ServerRoute = createServerFileRoute('/api/applications/create')
  .middleware([requireUserAuth])
  .methods({
    POST: async ({ request, context }) => {
      const { auth } = context
      
      if (!auth.authenticated || !auth.user) {
        return createErrorResponse('Unauthorized', 401)
      }
      
      const userId = auth.user.id
    
    try {
      // Parse form data
      const formData = await request.formData()
      
      // Validate CSRF token from form data
      const csrfToken = formData.get('csrf_token') as string
      const csrfHash = formData.get('csrf_hash') as string
      
      if (!csrfToken || !csrfHash) {
        return createErrorResponse('Invalid security token. Please refresh the page and try again.', 403)
      }
      
      // Import CSRF validation function directly to avoid request consumption issue
      const { verifyCSRFToken } = await import('../../../utils/csrf-server')
      if (!verifyCSRFToken(csrfToken, csrfHash)) {
        return createErrorResponse('Invalid security token. Please refresh the page and try again.', 403)
      }
      
      // Extract form fields
      const companyName = formData.get('companyName') as string
      const roleName = formData.get('roleName') as string
      const jobPostingUrl = formData.get('jobPostingUrl') as string
      const appliedDate = formData.get('appliedDate') as string
      const jobBoard = formData.get('jobBoard') as string
      const applicationType = formData.get('applicationType') as string
      const roleType = formData.get('roleType') as string
      const locationType = formData.get('locationType') as string
      const notes = formData.get('notes') as string
      
      // Validate input
      const validation = CreateApplicationSchema.safeParse({
        companyName,
        roleName,
        jobPostingUrl,
        appliedDate,
        jobBoard,
        applicationType,
        roleType,
        locationType,
        notes
      })
      
      if (!validation.success) {
        return createErrorResponse(validation.error.errors[0].message, 400)
      }
      
      const validatedData = validation.data
      
      // Get or create job board
      const jobBoardRecord = await jobBoardService.getOrCreateJobBoard(userId, validatedData.jobBoard)
      
      // Get default workflow for user
      let defaultWorkflow = await workflowService.getDefaultWorkflow(userId)
      
      if (!defaultWorkflow) {
        // Create a basic default workflow if none exists
        defaultWorkflow = await workflowService.createWorkflow({
          userId,
          name: 'Default Workflow',
          description: 'Default application workflow',
          isDefault: true,
          steps: [
            { statusId: 'applied', isOptional: false },
            { statusId: 'phone_screen', isOptional: true },
            { statusId: 'interview', isOptional: true },
            { statusId: 'offer', isOptional: true },
            { statusId: 'hired', isOptional: true },
            { statusId: 'rejected', isOptional: true }
          ]
        })
      }
      
      // Get or create initial "Applied" status
      let appliedStatus = await workflowService.getStatuses(userId).then(statuses => 
        statuses.find(status => status.name.toLowerCase() === 'applied')
      )
      
      if (!appliedStatus) {
        appliedStatus = await workflowService.createStatus({
          userId,
          name: 'Applied',
          description: 'Application submitted',
          isTerminal: false
        })
      }
      
      // Create the job application
      const application = await applicationService.createApplication({
        userId,
        companyName: validatedData.companyName,
        roleName: validatedData.roleName,
        jobPostingUrl: validatedData.jobPostingUrl || undefined,
        jobBoard: {
          id: jobBoardRecord._id!.toString(),
          name: jobBoardRecord.name
        },
        workflow: {
          id: defaultWorkflow._id!.toString(),
          name: defaultWorkflow.name
        },
        applicationType: validatedData.applicationType as 'cold' | 'warm',
        roleType: validatedData.roleType as 'manager' | 'engineer',
        locationType: validatedData.locationType as 'on-site' | 'hybrid' | 'remote',
        events: [
          {
            statusId: appliedStatus._id!.toString(),
            statusName: appliedStatus.name,
            date: validatedData.appliedDate,
            notes: validatedData.notes || undefined
          }
        ],
        currentStatus: {
          id: appliedStatus._id!.toString(),
          name: appliedStatus.name
        }
      })
      
      return createSuccessResponse({
        application: {
          id: application._id!.toString(),
          companyName: application.companyName,
          roleName: application.roleName,
          currentStatus: application.currentStatus,
          createdAt: application.createdAt
        }
      }, 201)
      
    } catch (error: any) {
      console.error('Error creating application:', error)
      return createErrorResponse('Failed to create application')
    }
  }
})