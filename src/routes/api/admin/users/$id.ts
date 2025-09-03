import { createServerFileRoute } from "@tanstack/react-start/server";
import { userService } from "../../../../db/services/users";
import { createServices } from "../../../../services/factory";
import {
  requireAdminAuth,
  createSuccessResponse,
  createErrorResponse,
} from "../../../../utils/auth-helpers";

export const ServerRoute = createServerFileRoute(
  "/api/admin/users/$id",
).methods({
  DELETE: async ({ request, params }) => {
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
      // Initialize services
      const services = await createServices();

      // Validate CSRF token from headers
      const csrfToken = request.headers.get("x-csrf-token");
      const csrfHash = request.headers.get("x-csrf-hash");

      if (!csrfToken || !csrfHash) {
        return createErrorResponse(
          "Invalid security token. Please refresh the page and try again.",
          403,
        );
      }

      // Import CSRF validation function directly
      const { verifyCSRFToken } = await import("../../../../utils/csrf-server");
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

      // Delete all user's applications first
      const deletedApplications =
        await services.applicationService.deleteAllApplicationsForUser(userId);

      // Delete the user
      const userDeleted = await userService.deleteUser(userId);

      if (userDeleted) {
        return createSuccessResponse({
          message: `User deleted successfully. ${deletedApplications} associated records were also removed.`,
        });
      } else {
        return createErrorResponse("Failed to delete user");
      }
    } catch {
      return createErrorResponse("Failed to delete user");
    }
  },
});
