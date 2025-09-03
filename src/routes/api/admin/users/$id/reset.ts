import { createServerFileRoute } from "@tanstack/react-start/server";
import { userService } from "../../../../../db/services/users";
import { createServices } from "../../../../../services/factory";
import { UserOnboardingService } from "../../../../../db/services/user-onboarding";
import {
  requireAdminAuth,
  createSuccessResponse,
  createErrorResponse,
} from "../../../../../utils/auth-helpers";
import { z } from "zod";

// Schema for reset options validation
const ResetOptionsSchema = z.object({
  includeTestData: z.boolean().default(false),
  preserveCustomJobBoards: z.boolean().default(false),
});

export const ServerRoute = createServerFileRoute(
  "/api/admin/users/$id/reset",
).methods({
  POST: async ({ request, params }) => {
    // Check admin authentication
    const authResult = requireAdminAuth(request);
    if ("response" in authResult) {
      return authResult.response;
    }

    const userId = params?.id as string;
    if (!userId) {
      return createErrorResponse("User ID is required", 400);
    }

    try {
      // Parse form data
      const formData = await request.formData();

      // Validate CSRF token from form data
      const csrfToken = formData.get("csrf_token") as string;
      const csrfHash = formData.get("csrf_hash") as string;

      if (!csrfToken || !csrfHash) {
        return createErrorResponse(
          "Invalid security token. Please refresh the page and try again.",
          403,
        );
      }

      // Import CSRF validation function directly
      const { verifyCSRFToken } = await import(
        "../../../../../utils/csrf-server"
      );
      if (!verifyCSRFToken(csrfToken, csrfHash)) {
        return createErrorResponse(
          "Invalid security token. Please refresh the page and try again.",
          403,
        );
      }

      // Check if user exists
      const user = await userService.getUserById(userId);
      if (!user) {
        return createErrorResponse("User not found", 404);
      }

      // Parse reset options
      const includeTestData = formData.get("includeTestData") === "true";
      const preserveCustomJobBoards =
        formData.get("preserveCustomJobBoards") === "true";

      const resetOptions = ResetOptionsSchema.parse({
        includeTestData,
        preserveCustomJobBoards,
      });

      // Create service instance
      const services = await createServices();
      const userOnboardingService = new UserOnboardingService(
        services.applicationService,
        services.jobBoardService,
        services.workflowService,
      );

      // Get user's current data summary for reporting
      const beforeSummary =
        await userOnboardingService.getUserDataSummary(userId);

      // Perform the reset
      await userOnboardingService.resetUserData(userId, resetOptions);

      // Get summary after reset
      const afterSummary =
        await userOnboardingService.getUserDataSummary(userId);

      // Build result message
      let message = `User "${user.name}" data reset successfully.`;

      if (beforeSummary.applicationCount > 0) {
        message += ` Removed ${beforeSummary.applicationCount} applications.`;
      }

      if (resetOptions.includeTestData) {
        message += ` Added ${afterSummary.applicationCount} sample applications.`;
      }

      if (
        !resetOptions.preserveCustomJobBoards &&
        beforeSummary.hasCustomJobBoards
      ) {
        message += ` Reset job boards to defaults.`;
      }

      return createSuccessResponse({
        message,
        summary: {
          before: beforeSummary,
          after: afterSummary,
          resetOptions,
        },
      });
    } catch (error: any) {
      console.error("Error resetting user data:", error);

      if (error.message.includes("not found")) {
        return createErrorResponse(error.message, 404);
      }

      return createErrorResponse("Failed to reset user data");
    }
  },
});
