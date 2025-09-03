import { connectToDatabase } from "../connection";
import { defaultWorkflowService } from "./default-workflow";

export interface ResetOptions {
  includeTestData: boolean;
  preserveCustomJobBoards: boolean;
}

export class UserOnboardingService {
  /**
   * Provisions default data for a new user (job boards, workflow, statuses)
   */
  async provisionDefaultUserData(userId: string): Promise<void> {
    // Create default job boards
    const defaultJobBoards = [
      {
        name: "LinkedIn",
        url: "https://linkedin.com",
        description: "Professional networking platform",
      },
      {
        name: "Indeed",
        url: "https://indeed.com",
        description: "Job search engine",
      },
      {
        name: "Glassdoor",
        url: "https://glassdoor.com",
        description: "Company reviews and job listings",
      },
      {
        name: "Otta",
        url: "https://otta.com",
        description: "Startup and tech job platform",
      },
      {
        name: "Company Site",
        url: "",
        description: "Direct application to company website",
      },
    ];

    for (const jobBoardData of defaultJobBoards) {
      await jobBoardService.createJobBoard({
        userId,
        ...jobBoardData,
      });
    }

    // Create default application statuses using shared configuration
    const statuses = defaultWorkflowService.getDefaultStatuses();
    const defaultStatuses = statuses.map((statusDef) => ({
      name: statusDef.name,
      description: statusDef.description,
      isTerminal: statusDef.isTerminal,
    }));

    const createdStatuses: { [key: string]: string } = {};

    for (const statusData of defaultStatuses) {
      const status = await workflowService.createStatus({
        userId,
        ...statusData,
      });
      createdStatuses[statusData.name] = status._id!.toString();
    }

    // Create default workflow using actual status IDs
    await workflowService.createWorkflow({
      userId,
      name: "Basic Workflow",
      description: "Standard job application workflow",
      isDefault: true,
      steps: [
        { statusId: createdStatuses["Not Applied"], isOptional: false },
        { statusId: createdStatuses["Applied"], isOptional: false },
        { statusId: createdStatuses["Phone Screen"], isOptional: true },
        { statusId: createdStatuses["Round 1"], isOptional: true },
        { statusId: createdStatuses["Round 2"], isOptional: true },
        { statusId: createdStatuses["Accepted"], isOptional: true },
        { statusId: createdStatuses["Declined"], isOptional: true }, // Can be reached from any step
      ],
    });
  }

  /**
   * Adds sample job applications for demo/testing purposes
   */
  async provisionSampleApplications(userId: string): Promise<void> {
    // Get user's default workflow and job boards
    const defaultWorkflow = await workflowService.getDefaultWorkflow(userId);
    const jobBoards = await jobBoardService.getJobBoards(userId);
    const statuses = await workflowService.getStatuses(userId);

    if (!defaultWorkflow || jobBoards.length === 0 || statuses.length === 0) {
      throw new Error(
        "User must have default workflow, job boards, and statuses before adding sample applications",
      );
    }

    const linkedinBoard = jobBoards.find((board) => board.name === "LinkedIn");
    if (!linkedinBoard) {
      throw new Error("LinkedIn job board not found for user");
    }

    // Helper to find status by name
    const findStatus = (name: string) => {
      const status = statuses.find((s) => s.name === name);
      if (!status) throw new Error(`Status '${name}' not found for user`);
      return status;
    };

    const sampleApplications = [
      {
        companyName: "TechCorp Alpha",
        roleName: "Senior Frontend Manager",
        jobPostingUrl: "https://techcorp.com/careers/frontend-manager",
        jobBoard: {
          id: linkedinBoard._id!.toString(),
          name: linkedinBoard.name,
        },
        workflow: {
          id: defaultWorkflow._id!.toString(),
          name: defaultWorkflow.name,
        },
        applicationType: "cold" as const,
        roleType: "manager" as const,
        locationType: "on-site" as const,
        events: [
          {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: "Application submitted",
            date: "2025-06-17",
            description: "Applied through LinkedIn",
          },
          {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: "Phone screen completed",
            date: "2025-07-24",
            description: "Phone screen completed",
          },
          {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: "Technical interview scheduled",
            date: "2025-07-29",
            description: "Technical interview scheduled",
          },
        ],
        currentStatus: {
          id: findStatus("Round 1")._id!.toString(),
          name: "Round 1",
        },
      },
      {
        companyName: "StartupBeta",
        roleName: "Frontend Engineer - Platform",
        jobPostingUrl: "https://startupbeta.com/jobs/frontend-engineer",
        jobBoard: {
          id: linkedinBoard._id!.toString(),
          name: linkedinBoard.name,
        },
        workflow: {
          id: defaultWorkflow._id!.toString(),
          name: defaultWorkflow.name,
        },
        applicationType: "cold" as const,
        roleType: "engineer" as const,
        locationType: "remote" as const,
        events: [
          {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: "Application submitted",
            date: "2025-07-13",
            description: "Applied through LinkedIn",
          },
          {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: "Phone screen completed",
            date: "2025-07-24",
            description: "Phone screen with hiring manager",
          },
          {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: "Technical interview in progress",
            date: "2025-08-06",
            description: "Technical coding challenge and interviews",
          },
        ],
        currentStatus: {
          id: findStatus("In Progress")._id!.toString(),
          name: "In Progress",
        },
      },
      {
        companyName: "ScaleTech",
        roleName: "Engineering Manager - Web",
        jobPostingUrl: "https://scaletech.com/careers/eng-manager",
        jobBoard: {
          id: linkedinBoard._id!.toString(),
          name: linkedinBoard.name,
        },
        workflow: {
          id: defaultWorkflow._id!.toString(),
          name: defaultWorkflow.name,
        },
        applicationType: "warm" as const,
        roleType: "manager" as const,
        locationType: "on-site" as const,
        events: [
          {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: "Application submitted",
            date: "2025-05-28",
            description: "Referral from former colleague",
          },
          {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: "Phone screen completed",
            date: "2025-06-10",
            description: "Phone screen completed",
          },
          {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: "Application declined",
            date: "2025-06-20",
            description: "Position filled internally",
          },
        ],
        currentStatus: {
          id: findStatus("Declined")._id!.toString(),
          name: "Declined",
        },
      },
      {
        companyName: "GrowthCo",
        roleName: "Engineering Manager - Growth",
        jobPostingUrl: "https://growthco.com/jobs/eng-manager-growth",
        jobBoard: {
          id: linkedinBoard._id!.toString(),
          name: linkedinBoard.name,
        },
        workflow: {
          id: defaultWorkflow._id!.toString(),
          name: defaultWorkflow.name,
        },
        applicationType: "cold" as const,
        roleType: "manager" as const,
        locationType: "hybrid" as const,
        events: [
          {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: "Application submitted",
            date: "2025-07-31",
            description: "Applied through LinkedIn",
          },
          {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: "Phone screen scheduled",
            date: "2025-08-14",
            description: "Phone screen scheduled",
          },
        ],
        currentStatus: {
          id: findStatus("Phone Screen")._id!.toString(),
          name: "Phone Screen",
        },
      },
      {
        companyName: "InnovateLabs",
        roleName: "Principal Software Engineer",
        jobPostingUrl: "https://innovatelabs.com/careers/principal-engineer",
        jobBoard: {
          id: linkedinBoard._id!.toString(),
          name: linkedinBoard.name,
        },
        workflow: {
          id: defaultWorkflow._id!.toString(),
          name: defaultWorkflow.name,
        },
        applicationType: "cold" as const,
        roleType: "engineer" as const,
        locationType: "remote" as const,
        events: [
          {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: "Application submitted",
            date: "2025-08-01",
            description: "Applied through LinkedIn",
          },
        ],
        currentStatus: {
          id: findStatus("Applied")._id!.toString(),
          name: "Applied",
        },
      },
    ];

    // Create each sample application
    for (const appData of sampleApplications) {
      await applicationService.createApplication({
        userId,
        ...appData,
      });
    }
  }

  /**
   * Resets user data and optionally reprovisions with default and/or test data
   */
  async resetUserData(userId: string, options: ResetOptions): Promise<void> {
    await connectToDatabase();

    // Always delete applications first (they reference other collections)
    await applicationService.deleteAllApplicationsForUser(userId);

    // Delete statuses and workflows
    await workflowService.deleteAllStatusesForUser(userId);
    await workflowService.deleteAllWorkflowsForUser(userId);

    // Handle job boards based on preserveCustomJobBoards option
    if (!options.preserveCustomJobBoards) {
      await jobBoardService.deleteAllJobBoardsForUser(userId);
    }

    // Always reprovision default data
    await this.provisionDefaultUserData(userId);

    // Optionally add test data
    if (options.includeTestData) {
      await this.provisionSampleApplications(userId);
    }
  }

  /**
   * Gets summary of user's current data for admin display
   */
  async getUserDataSummary(userId: string): Promise<{
    hasApplications: boolean;
    hasCustomJobBoards: boolean;
    hasDefaultWorkflow: boolean;
    applicationCount: number;
    jobBoardCount: number;
  }> {
    const [, jobBoards, defaultWorkflow] = await Promise.all([
      applicationService.getApplications(userId, {}, 1), // Just check if any exist
      jobBoardService.getJobBoards(userId),
      workflowService.getDefaultWorkflow(userId),
    ]);

    const applicationCount =
      await applicationService.getApplicationCount(userId);

    // Determine if user has custom job boards (more than the 5 defaults)
    const defaultJobBoardNames = [
      "LinkedIn",
      "Indeed",
      "Glassdoor",
      "Otta",
      "Company Site",
    ];
    const hasCustomJobBoards =
      jobBoards.some((board) => !defaultJobBoardNames.includes(board.name)) ||
      jobBoards.length > defaultJobBoardNames.length;

    return {
      hasApplications: applicationCount > 0,
      hasCustomJobBoards,
      hasDefaultWorkflow: !!defaultWorkflow,
      applicationCount,
      jobBoardCount: jobBoards.length,
    };
  }
}

// Export singleton instance
export const userOnboardingService = new UserOnboardingService();
