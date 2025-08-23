import { createServerFileRoute } from "@tanstack/react-start/server";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../../../../utils/auth-helpers";
import { requireUserAuth } from "../../../../middleware/auth";
import { applicationService } from "../../../../db/services/applications";
import { z } from "zod";
import { randomUUID } from "crypto";

// Validation schema for event creation
const CreateEventSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  description: z.string().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
});

export const ServerRoute = createServerFileRoute("/api/applications/$id/events")
  .middleware([requireUserAuth])
  .methods({
    POST: async ({ context, params, request }) => {
      const { auth } = context;
      const { id } = params;

      if (!auth.authenticated || !auth.user) {
        return createErrorResponse("Unauthorized", 401);
      }

      if (!id) {
        return createErrorResponse("Application ID is required", 400);
      }

      try {
        const body = await request.json();
        const validationResult = CreateEventSchema.safeParse(body);

        if (!validationResult.success) {
          return createErrorResponse(
            `Validation error: ${validationResult.error.message}`,
            400,
          );
        }

        const { title, description, date } = validationResult.data;

        // Get the application
        const application = await applicationService.getApplicationById(
          auth.user.id,
          id,
        );
        if (!application) {
          return createErrorResponse("Application not found", 404);
        }

        // Generate unique ID for the new event
        const eventId = `event_${randomUUID()}`;

        // Create the new event (simplified structure)
        const newEvent = {
          id: eventId,
          title: title,
          description: description || undefined,
          date: date,
        };

        // Add the event to existing events
        const updatedEvents = [...application.events, newEvent];

        // Update the application with new event (no status change logic here)
        const updateData = { events: updatedEvents };

        // Update the application atomically
        const updatedApplication = await applicationService.updateApplication(
          auth.user.id,
          id,
          updateData,
        );

        if (!updatedApplication) {
          return createErrorResponse("Failed to update application", 500);
        }

        // Sort events chronologically for response
        const sortedEvents = [...updatedApplication.events].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );

        const applicationWithSortedEvents = {
          ...updatedApplication,
          events: sortedEvents,
        };

        console.log(
          `Applications API: Added event ${eventId} to application ${id} for userId:`,
          auth.user.id,
        );
        return createSuccessResponse({
          application: applicationWithSortedEvents,
          event: newEvent,
        });
      } catch (error: any) {
        console.error("Applications API: Error adding event:", error);
        return createErrorResponse("Failed to add event");
      }
    },
  });
