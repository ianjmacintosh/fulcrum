import { createServerFileRoute } from "@tanstack/react-start/server";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../../../../utils/auth-helpers";
import { requireUserAuth } from "../../../../middleware/auth";
import { createServices } from "../../../../services/factory";

export const ServerRoute = createServerFileRoute("/api/applications/$id/")
  .middleware([requireUserAuth])
  .methods({
    GET: async ({ context, params }) => {
      const { auth } = context;
      const { id } = params;

      if (!auth.authenticated || !auth.user) {
        return createErrorResponse("Unauthorized", 401);
      }

      if (!id) {
        return createErrorResponse("Application ID is required", 400);
      }

      try {
        // Initialize services
        const services = await createServices();

        const application =
          await services.applicationService.getApplicationById(
            auth.user.id,
            id,
          );

        if (!application) {
          return createErrorResponse("Application not found", 404);
        }

        // Sort events chronologically (oldest first) for timeline display
        const sortedEvents = [...application.events].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );

        const applicationWithSortedEvents = {
          ...application,
          events: sortedEvents,
        };

        return createSuccessResponse({
          application: applicationWithSortedEvents,
        });
      } catch (error: any) {
        console.error("Applications API: Error fetching application:", error);
        return createErrorResponse("Failed to load application");
      }
    },
    PATCH: async ({ context, params, request }) => {
      const { auth } = context;
      const { id } = params;

      if (!auth.authenticated || !auth.user) {
        return createErrorResponse("Unauthorized", 401);
      }

      if (!id) {
        return createErrorResponse("Application ID is required", 400);
      }

      try {
        // Initialize services
        const services = await createServices();

        const body = await request.json();

        // Validate that we're only updating status date fields
        const allowedFields = [
          "appliedDate",
          "phoneScreenDate",
          "round1Date",
          "round2Date",
          "acceptedDate",
          "declinedDate",
        ];
        const updateFields = Object.keys(body);

        if (!updateFields.every((field) => allowedFields.includes(field))) {
          return createErrorResponse(
            "Invalid update fields. Only status dates can be updated via this endpoint.",
            400,
          );
        }

        const updatedApplication =
          await services.applicationService.updateApplicationWithStatusCalculation(
            auth.user.id,
            id,
            body,
          );

        if (!updatedApplication) {
          return createErrorResponse("Application not found", 404);
        }

        return createSuccessResponse({ application: updatedApplication });
      } catch (error: any) {
        console.error("Applications API: Error updating application:", error);
        return createErrorResponse("Failed to update application");
      }
    },
  });
