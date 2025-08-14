import { connectToDatabase } from '../connection'
import { JobBoard, Workflow, ApplicationStatus, JobApplication } from '../schemas'
import { jobBoardService } from './job-boards'
import { workflowService } from './workflows'
import { applicationService } from './applications'

export interface ResetOptions {
  includeTestData: boolean
  preserveCustomJobBoards: boolean
}

export class UserOnboardingService {
  
  /**
   * Provisions default data for a new user (job boards, workflow, statuses)
   */
  async provisionDefaultUserData(userId: string): Promise<void> {
    // Create default job boards
    const defaultJobBoards = [
      { name: 'LinkedIn', url: 'https://linkedin.com', description: 'Professional networking platform' },
      { name: 'Indeed', url: 'https://indeed.com', description: 'Job search engine' },
      { name: 'Glassdoor', url: 'https://glassdoor.com', description: 'Company reviews and job listings' },
      { name: 'Otta', url: 'https://otta.com', description: 'Startup and tech job platform' },
      { name: 'Company Site', url: '', description: 'Direct application to company website' }
    ]

    for (const jobBoardData of defaultJobBoards) {
      await jobBoardService.createJobBoard({
        userId,
        ...jobBoardData
      })
    }

    // Create default application statuses
    const defaultStatuses = [
      { name: 'Applied', description: 'Application submitted', isTerminal: false },
      { name: 'Phone Screen', description: 'Initial phone screening', isTerminal: false },
      { name: 'Round 1', description: 'First round interview', isTerminal: false },
      { name: 'Round 2', description: 'Second round interview', isTerminal: false },
      { name: 'Offer Letter Received', description: 'Job offer received', isTerminal: false },
      { name: 'Accepted', description: 'Job offer accepted', isTerminal: true },
      { name: 'Declined', description: 'Application declined or withdrawn', isTerminal: true }
    ]

    const createdStatuses: { [key: string]: string } = {}
    
    for (const statusData of defaultStatuses) {
      const status = await workflowService.createStatus({
        userId,
        ...statusData
      })
      createdStatuses[statusData.name] = status._id!.toString()
    }

    // Create default workflow using actual status IDs
    await workflowService.createWorkflow({
      userId,
      name: 'Basic Workflow',
      description: 'Standard job application workflow',
      isDefault: true,
      steps: [
        { statusId: createdStatuses['Applied'], isOptional: false },
        { statusId: createdStatuses['Phone Screen'], isOptional: true },
        { statusId: createdStatuses['Round 1'], isOptional: true },
        { statusId: createdStatuses['Round 2'], isOptional: true },
        { statusId: createdStatuses['Offer Letter Received'], isOptional: true },
        { statusId: createdStatuses['Accepted'], isOptional: true },
        { statusId: createdStatuses['Declined'], isOptional: true } // Can be reached from any step
      ]
    })
  }

  /**
   * Adds sample job applications for demo/testing purposes
   */
  async provisionSampleApplications(userId: string): Promise<void> {
    // Get user's default workflow and job boards
    const defaultWorkflow = await workflowService.getDefaultWorkflow(userId)
    const jobBoards = await jobBoardService.getJobBoards(userId)
    const statuses = await workflowService.getStatuses(userId)

    if (!defaultWorkflow || jobBoards.length === 0 || statuses.length === 0) {
      throw new Error('User must have default workflow, job boards, and statuses before adding sample applications')
    }

    const linkedinBoard = jobBoards.find(board => board.name === 'LinkedIn')
    if (!linkedinBoard) {
      throw new Error('LinkedIn job board not found for user')
    }

    // Helper to find status by name
    const findStatus = (name: string) => {
      const status = statuses.find(s => s.name === name)
      if (!status) throw new Error(`Status '${name}' not found for user`)
      return status
    }

    const sampleApplications = [
      {
        companyName: 'TechCorp Alpha',
        roleName: 'Senior Frontend Manager',
        jobPostingUrl: 'https://techcorp.com/careers/frontend-manager',
        jobBoard: { id: linkedinBoard._id!.toString(), name: linkedinBoard.name },
        workflow: { id: defaultWorkflow._id!.toString(), name: defaultWorkflow.name },
        applicationType: 'cold' as const,
        roleType: 'manager' as const,
        locationType: 'on-site' as const,
        events: [
          { 
            statusId: findStatus('Applied')._id!.toString(), 
            statusName: 'Applied', 
            date: '2025-06-17', 
            notes: 'Applied through LinkedIn' 
          },
          { 
            statusId: findStatus('Phone Screen')._id!.toString(), 
            statusName: 'Phone Screen', 
            date: '2025-07-24', 
            notes: 'Phone screen completed' 
          },
          { 
            statusId: findStatus('Round 2')._id!.toString(), 
            statusName: 'Round 2', 
            date: '2025-07-29', 
            notes: 'Technical interview scheduled' 
          }
        ],
        currentStatus: { 
          id: findStatus('Round 2')._id!.toString(), 
          name: 'Round 2' 
        }
      },
      {
        companyName: 'StartupBeta',
        roleName: 'Frontend Engineer - Platform',
        jobPostingUrl: 'https://startupbeta.com/jobs/frontend-engineer',
        jobBoard: { id: linkedinBoard._id!.toString(), name: linkedinBoard.name },
        workflow: { id: defaultWorkflow._id!.toString(), name: defaultWorkflow.name },
        applicationType: 'cold' as const,
        roleType: 'engineer' as const,
        locationType: 'remote' as const,
        events: [
          { 
            statusId: findStatus('Applied')._id!.toString(), 
            statusName: 'Applied', 
            date: '2025-07-13', 
            notes: 'Applied through LinkedIn' 
          },
          { 
            statusId: findStatus('Phone Screen')._id!.toString(), 
            statusName: 'Phone Screen', 
            date: '2025-07-24', 
            notes: 'Phone screen with hiring manager' 
          },
          { 
            statusId: findStatus('Round 1')._id!.toString(), 
            statusName: 'Round 1', 
            date: '2025-08-06', 
            notes: 'Technical coding challenge' 
          },
          { 
            statusId: findStatus('Round 2')._id!.toString(), 
            statusName: 'Round 2', 
            date: '2025-08-13', 
            notes: 'Final round interview' 
          }
        ],
        currentStatus: { 
          id: findStatus('Round 2')._id!.toString(), 
          name: 'Round 2' 
        }
      },
      {
        companyName: 'ScaleTech',
        roleName: 'Engineering Manager - Web',
        jobPostingUrl: 'https://scaletech.com/careers/eng-manager',
        jobBoard: { id: linkedinBoard._id!.toString(), name: linkedinBoard.name },
        workflow: { id: defaultWorkflow._id!.toString(), name: defaultWorkflow.name },
        applicationType: 'warm' as const,
        roleType: 'manager' as const,
        locationType: 'on-site' as const,
        events: [
          { 
            statusId: findStatus('Applied')._id!.toString(), 
            statusName: 'Applied', 
            date: '2025-05-28', 
            notes: 'Referral from former colleague' 
          },
          { 
            statusId: findStatus('Phone Screen')._id!.toString(), 
            statusName: 'Phone Screen', 
            date: '2025-06-10', 
            notes: 'Phone screen completed' 
          },
          { 
            statusId: findStatus('Declined')._id!.toString(), 
            statusName: 'Declined', 
            date: '2025-06-20', 
            notes: 'Position filled internally' 
          }
        ],
        currentStatus: { 
          id: findStatus('Declined')._id!.toString(), 
          name: 'Declined' 
        }
      },
      {
        companyName: 'GrowthCo',
        roleName: 'Engineering Manager - Growth',
        jobPostingUrl: 'https://growthco.com/jobs/eng-manager-growth',
        jobBoard: { id: linkedinBoard._id!.toString(), name: linkedinBoard.name },
        workflow: { id: defaultWorkflow._id!.toString(), name: defaultWorkflow.name },
        applicationType: 'cold' as const,
        roleType: 'manager' as const,
        locationType: 'hybrid' as const,
        events: [
          { 
            statusId: findStatus('Applied')._id!.toString(), 
            statusName: 'Applied', 
            date: '2025-07-31', 
            notes: 'Applied through LinkedIn' 
          },
          { 
            statusId: findStatus('Phone Screen')._id!.toString(), 
            statusName: 'Phone Screen', 
            date: '2025-08-14', 
            notes: 'Phone screen scheduled' 
          }
        ],
        currentStatus: { 
          id: findStatus('Phone Screen')._id!.toString(), 
          name: 'Phone Screen' 
        }
      },
      {
        companyName: 'InnovateLabs',
        roleName: 'Principal Software Engineer',
        jobPostingUrl: 'https://innovatelabs.com/careers/principal-engineer',
        jobBoard: { id: linkedinBoard._id!.toString(), name: linkedinBoard.name },
        workflow: { id: defaultWorkflow._id!.toString(), name: defaultWorkflow.name },
        applicationType: 'cold' as const,
        roleType: 'engineer' as const,
        locationType: 'remote' as const,
        events: [
          { 
            statusId: findStatus('Applied')._id!.toString(), 
            statusName: 'Applied', 
            date: '2025-08-01', 
            notes: 'Applied through LinkedIn' 
          }
        ],
        currentStatus: { 
          id: findStatus('Applied')._id!.toString(), 
          name: 'Applied' 
        }
      }
    ]

    // Create each sample application
    for (const appData of sampleApplications) {
      await applicationService.createApplication({
        userId,
        ...appData
      })
    }
  }

  /**
   * Resets user data and optionally reprovisions with default and/or test data
   */
  async resetUserData(userId: string, options: ResetOptions): Promise<void> {
    const db = await connectToDatabase()

    // Always delete applications first (they reference other collections)
    await applicationService.deleteAllApplicationsForUser(userId)

    // Delete statuses and workflows
    await workflowService.deleteAllStatusesForUser(userId)
    await workflowService.deleteAllWorkflowsForUser(userId)

    // Handle job boards based on preserveCustomJobBoards option
    if (!options.preserveCustomJobBoards) {
      await jobBoardService.deleteAllJobBoardsForUser(userId)
    }

    // Always reprovision default data
    await this.provisionDefaultUserData(userId)

    // Optionally add test data
    if (options.includeTestData) {
      await this.provisionSampleApplications(userId)
    }
  }

  /**
   * Gets summary of user's current data for admin display
   */
  async getUserDataSummary(userId: string): Promise<{
    hasApplications: boolean
    hasCustomJobBoards: boolean
    hasDefaultWorkflow: boolean
    applicationCount: number
    jobBoardCount: number
  }> {
    const [applications, jobBoards, defaultWorkflow] = await Promise.all([
      applicationService.getApplications(userId, {}, 1), // Just check if any exist
      jobBoardService.getJobBoards(userId),
      workflowService.getDefaultWorkflow(userId)
    ])

    const applicationCount = await applicationService.getApplicationCount(userId)
    
    // Determine if user has custom job boards (more than the 5 defaults)
    const defaultJobBoardNames = ['LinkedIn', 'Indeed', 'Glassdoor', 'Otta', 'Company Site']
    const hasCustomJobBoards = jobBoards.some(board => 
      !defaultJobBoardNames.includes(board.name)
    ) || jobBoards.length > defaultJobBoardNames.length

    return {
      hasApplications: applicationCount > 0,
      hasCustomJobBoards,
      hasDefaultWorkflow: !!defaultWorkflow,
      applicationCount,
      jobBoardCount: jobBoards.length
    }
  }
}

// Export singleton instance
export const userOnboardingService = new UserOnboardingService()