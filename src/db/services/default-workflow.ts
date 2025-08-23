export interface DefaultStatusDefinition {
  name: string;
  description: string;
  isTerminal: boolean;
  order: number;
}

/**
 * Single source of truth for default application workflow configuration
 *
 * This service provides standardized status definitions that can be used by both
 * ApplicationStatusService and UserOnboardingService to ensure consistency.
 */
export class DefaultWorkflowService {
  /**
   * Get the default workflow statuses
   * Used by all services for consistent 6-state workflow
   */
  getDefaultStatuses(): DefaultStatusDefinition[] {
    return [
      {
        name: "Not Applied",
        description: "Application not yet submitted",
        isTerminal: false,
        order: 1,
      },
      {
        name: "Applied",
        description: "Application has been submitted",
        isTerminal: false,
        order: 2,
      },
      {
        name: "Phone Screen",
        description: "Initial phone screening interview",
        isTerminal: false,
        order: 3,
      },
      {
        name: "Round 1",
        description: "First round interview",
        isTerminal: false,
        order: 4,
      },
      {
        name: "Round 2",
        description: "Second round interview",
        isTerminal: false,
        order: 5,
      },
      {
        name: "Accepted",
        description: "Job offer accepted",
        isTerminal: true,
        order: 6,
      },
      {
        name: "Declined",
        description: "Application was declined or withdrawn",
        isTerminal: true,
        order: 7,
      },
    ];
  }
}

// Export singleton instance
export const defaultWorkflowService = new DefaultWorkflowService();
