import { createServerFileRoute } from "@tanstack/react-start/server";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../../../utils/auth-helpers";
import { requireUserAuth } from "../../../middleware/auth";
import { createServices } from "../../../services/factory";

export const ServerRoute = createServerFileRoute("/api/applications/")
  .middleware([requireUserAuth])
  .methods({
    GET: async ({ context }) => {
      const { auth } = context;

      if (!auth.authenticated || !auth.user) {
        return createErrorResponse("Unauthorized", 401);
      }

      try {
        // Initialize services
        const services = await createServices();

        const applications = await services.applicationService.getApplications(
          auth.user.id,
          {},
          0, // No limit - get all applications
        );

        return createSuccessResponse({ applications });
      } catch (error: any) {
        console.error("Applications API: Error fetching applications:", error);
        return createErrorResponse("Failed to load applications");
      }
    },
  });
