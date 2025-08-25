import { createServerFileRoute } from "@tanstack/react-start/server";
import { applicationService } from "../../../db/services/applications";
import { workflowService } from "../../../db/services/workflows";
import { jobBoardService } from "../../../db/services/job-boards";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../../../utils/auth-helpers";
import { requireUserAuth } from "../../../middleware/auth";
import { z } from "zod";

// Schema for application creation validation
const CreateApplicationSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  roleName: z.string().min(1, "Job title is required"),
  jobPostingUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  appliedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  jobBoard: z.string().min(1, "Job board is required"),
  applicationType: z.enum(["cold", "warm"]),
  roleType: z.enum(["manager", "engineer"]),
  locationType: z.enum(["on-site", "hybrid", "remote"]),
  notes: z.string().optional().or(z.literal("")),
});

// Schema for bulk application creation
const BulkCreateApplicationSchema = z.array(CreateApplicationSchema);

export const ServerRoute = createServerFileRoute("/api/applications/create")
  .middleware([requireUserAuth])
  .methods({
    POST: async ({ request, context }) => {
      const { auth } = context;

      if (!auth.authenticated || !auth.user) {
        return createErrorResponse("Unauthorized", 401);
      }

      const userId = auth.user.id;

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

        // Import CSRF validation function directly to avoid request consumption issue
        const { verifyCSRFToken } = await import("../../../utils/csrf-server");
        if (!verifyCSRFToken(csrfToken, csrfHash)) {
          return createErrorResponse(
            "Invalid security token. Please refresh the page and try again.",
            403,
          );
        }

        // Check if this is a bulk operation
        const applicationsData = formData.get("applications");
        let validatedData: z.infer<typeof CreateApplicationSchema> | undefined;
        let isBulkOperation = false;
        let bulkValidatedData: z.infer<typeof BulkCreateApplicationSchema> = [];

        if (applicationsData) {
          // Bulk operation - parse JSON array
          isBulkOperation = true;
          try {
            const parsedApplications = JSON.parse(applicationsData as string);
            const bulkValidation =
              BulkCreateApplicationSchema.safeParse(parsedApplications);

            if (!bulkValidation.success) {
              return createErrorResponse(
                bulkValidation.error.issues[0].message,
                400,
              );
            }

            bulkValidatedData = bulkValidation.data;
          } catch (error) {
            return createErrorResponse("Invalid application data format", 400);
          }
        } else {
          // Single operation - extract form fields
          const companyName = formData.get("companyName") as string;
          const roleName = formData.get("roleName") as string;
          const jobPostingUrl = formData.get("jobPostingUrl") as string;
          const appliedDate = formData.get("appliedDate") as string;
          const jobBoard = formData.get("jobBoard") as string;
          const applicationType = formData.get("applicationType") as string;
          const roleType = formData.get("roleType") as string;
          const locationType = formData.get("locationType") as string;
          const notes = formData.get("notes") as string;

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
            notes,
          });

          if (!validation.success) {
            return createErrorResponse(validation.error.issues[0].message, 400);
          }

          validatedData = validation.data;
        }

        // Get default workflow and status for user (shared for both single and bulk)
        let defaultWorkflow = await workflowService.getDefaultWorkflow(userId);

        if (!defaultWorkflow) {
          // Create a basic default workflow if none exists
          defaultWorkflow = await workflowService.createWorkflow({
            userId,
            name: "Default Workflow",
            description: "Default application workflow",
            isDefault: true,
            steps: [
              { statusId: "applied", isOptional: false },
              { statusId: "phone_screen", isOptional: true },
              { statusId: "interview", isOptional: true },
              { statusId: "offer", isOptional: true },
              { statusId: "hired", isOptional: true },
              { statusId: "rejected", isOptional: true },
            ],
          });
        }

        // Get or create initial "Applied" status
        let appliedStatus = await workflowService
          .getStatuses(userId)
          .then((statuses) =>
            statuses.find((status) => status.name.toLowerCase() === "applied"),
          );

        if (!appliedStatus) {
          appliedStatus = await workflowService.createStatus({
            userId,
            name: "Applied",
            description: "Application submitted",
            isTerminal: false,
          });
        }

        if (isBulkOperation) {
          // Handle bulk creation
          const createdApplications: Array<{
            id: string;
            companyName: string;
            roleName: string;
            currentStatus: any;
            createdAt: Date;
          }> = [];

          for (const appData of bulkValidatedData) {
            // Get or create job board for each application
            const jobBoardRecord = await jobBoardService.getOrCreateJobBoard(
              userId,
              appData.jobBoard,
            );

            // Create the job application
            const application = await applicationService.createApplication({
              userId,
              companyName: appData.companyName,
              roleName: appData.roleName,
              jobPostingUrl: appData.jobPostingUrl || undefined,
              jobBoard: {
                id: jobBoardRecord._id!.toString(),
                name: jobBoardRecord.name,
              },
              workflow: {
                id: defaultWorkflow._id!.toString(),
                name: defaultWorkflow.name,
              },
              applicationType: appData.applicationType as "cold" | "warm",
              roleType: appData.roleType as "manager" | "engineer",
              locationType: appData.locationType as
                | "on-site"
                | "hybrid"
                | "remote",
              events: [
                {
                  id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  title: "Application submitted",
                  description: appData.notes || "Applied to position",
                  date: appData.appliedDate,
                },
              ],
              currentStatus: {
                id: appliedStatus._id!.toString(),
                name: appliedStatus.name,
              },
            });

            createdApplications.push({
              id: application._id!.toString(),
              companyName: application.companyName,
              roleName: application.roleName,
              currentStatus: application.currentStatus,
              createdAt: application.createdAt,
            });
          }

          return createSuccessResponse(
            {
              applications: createdApplications,
              count: createdApplications.length,
            },
            201,
          );
        } else {
          // Handle single creation (existing logic)
          if (!validatedData) {
            return createErrorResponse("Invalid application data", 400);
          }

          const jobBoardRecord = await jobBoardService.getOrCreateJobBoard(
            userId,
            validatedData.jobBoard,
          );

          // Create the job application
          const application = await applicationService.createApplication({
            userId,
            companyName: validatedData.companyName,
            roleName: validatedData.roleName,
            jobPostingUrl: validatedData.jobPostingUrl || undefined,
            jobBoard: {
              id: jobBoardRecord._id!.toString(),
              name: jobBoardRecord.name,
            },
            workflow: {
              id: defaultWorkflow._id!.toString(),
              name: defaultWorkflow.name,
            },
            applicationType: validatedData.applicationType as "cold" | "warm",
            roleType: validatedData.roleType as "manager" | "engineer",
            locationType: validatedData.locationType as
              | "on-site"
              | "hybrid"
              | "remote",
            events: [
              {
                id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                title: "Application submitted",
                description: validatedData.notes || "Applied to position",
                date: validatedData.appliedDate,
              },
            ],
            currentStatus: {
              id: appliedStatus._id!.toString(),
              name: appliedStatus.name,
            },
          });

          return createSuccessResponse(
            {
              application: {
                id: application._id!.toString(),
                companyName: application.companyName,
                roleName: application.roleName,
                currentStatus: application.currentStatus,
                createdAt: application.createdAt,
              },
            },
            201,
          );
        }
      } catch (error: any) {
        console.error("Error creating application:", error);
        return createErrorResponse("Failed to create application");
      }
    },
  });
