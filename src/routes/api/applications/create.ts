import { createServerFileRoute } from "@tanstack/react-start/server";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../../../utils/auth-helpers";
import { requireUserAuth } from "../../../middleware/auth";
import { createServices } from "../../../services/factory";
import { z } from "zod";

/**
 * Schema for application creation validation
 *
 * Fields are validated differently based on whether they are encrypted:
 * - Encrypted fields: Basic presence/structure validation only (client handles content validation)
 * - Non-encrypted fields: Full validation (enums, formats, etc.)
 *
 * Encrypted fields: companyName, roleName, jobPostingUrl, notes, appliedDate, createdAt, updatedAt
 * Non-encrypted fields: jobBoard, applicationType, roleType, locationType
 */
const CreateApplicationSchema = z.object({
  // Encrypted fields - validate structure only, not content
  companyName: z.string().min(1, "companyName is required"),
  roleName: z.string().min(1, "roleName is required"),
  jobPostingUrl: z.string().optional().or(z.literal("")), // Encrypted - no URL validation
  appliedDate: z.string().optional().or(z.literal("")), // Encrypted - no date format validation
  notes: z.string().optional().or(z.literal("")), // Encrypted - basic string validation
  createdAt: z.string().optional().or(z.literal("")), // Encrypted timestamp from client
  updatedAt: z.string().optional().or(z.literal("")), // Encrypted timestamp from client

  // Non-encrypted fields - full validation
  jobBoard: z.string().optional().or(z.literal("")),
  applicationType: z.enum(["cold", "warm"]).optional(),
  roleType: z.enum(["manager", "engineer"]).optional(),
  locationType: z.enum(["on-site", "hybrid", "remote"]).optional(),
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
        // Initialize services
        const services = await createServices();
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
              const issue = bulkValidation.error.issues[0];
              const fieldName =
                issue.path.length > 0 ? issue.path.join(".") : "unknown field";
              return createErrorResponse(`${fieldName}: ${issue.message}`, 400);
            }

            bulkValidatedData = bulkValidation.data;
          } catch {
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
          // Extract encrypted timestamps from ServicesProvider (if present)
          const createdAt = formData.get("createdAt") as string;
          const updatedAt = formData.get("updatedAt") as string;

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
            createdAt,
            updatedAt,
          });

          if (!validation.success) {
            const issue = validation.error.issues[0];
            const fieldName =
              issue.path.length > 0 ? issue.path.join(".") : "unknown field";
            return createErrorResponse(`${fieldName}: ${issue.message}`, 400);
          }

          validatedData = validation.data;
        }

        // Get default workflow and status for user (shared for both single and bulk)
        let defaultWorkflow =
          await services.workflowService.getDefaultWorkflow(userId);

        if (!defaultWorkflow) {
          // Create a basic default workflow if none exists
          defaultWorkflow = await services.workflowService.createWorkflow({
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

        if (isBulkOperation) {
          // Handle bulk creation using optimized batch operations
          // Get unique job board names for batch processing
          const uniqueJobBoardNames =
            services.applicationService.getUniqueJobBoards(
              bulkValidatedData.map((app) => ({ jobBoard: app.jobBoard })),
            );

          // Batch get/create all job boards at once
          const jobBoardsMap =
            await services.jobBoardService.getOrCreateJobBoardsBatch(
              userId,
              uniqueJobBoardNames,
            );

          // Prepare all applications for batch creation
          const applicationsToCreate = bulkValidatedData.map((appData) => {
            const jobBoardName = appData.jobBoard || "General";
            const jobBoardRecord = jobBoardsMap.get(jobBoardName)!;

            // Set defaults for optional fields
            const applicationType = appData.applicationType || "cold";
            const roleType = appData.roleType || "engineer";
            const locationType = appData.locationType || "remote";
            const hasAppliedDate =
              appData.appliedDate && appData.appliedDate.trim() !== "";

            return {
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
              applicationType: applicationType as "cold" | "warm",
              roleType: roleType as "manager" | "engineer",
              locationType: locationType as "on-site" | "hybrid" | "remote",
              // No server-side event generation - all events must come from client with encrypted dates
              events: [],
              appliedDate: hasAppliedDate ? appData.appliedDate : undefined,
              notes: appData.notes || undefined,
              currentStatus: services.applicationService.calculateCurrentStatus(
                {
                  appliedDate: hasAppliedDate ? appData.appliedDate : undefined,
                },
              ),
            };
          });

          // Batch create all applications at once
          const createdApplications =
            await services.applicationService.createApplicationsBatch(
              applicationsToCreate,
            );

          // Format response
          const formattedApplications = createdApplications.map(
            (application) => ({
              id: application._id!.toString(),
              companyName: application.companyName,
              roleName: application.roleName,
              currentStatus: application.currentStatus,
              createdAt: application.createdAt,
            }),
          );

          return createSuccessResponse(
            {
              applications: formattedApplications,
              count: formattedApplications.length,
            },
            201,
          );
        } else {
          // Handle single creation (existing logic)
          if (!validatedData) {
            return createErrorResponse("Invalid application data", 400);
          }

          // Get or create job board - use default if not provided
          const jobBoardName = validatedData.jobBoard || "General";
          const jobBoardRecord =
            await services.jobBoardService.getOrCreateJobBoard(
              userId,
              jobBoardName,
            );

          // Set defaults for optional fields
          const applicationType = validatedData.applicationType || "cold";
          const roleType = validatedData.roleType || "engineer";
          const locationType = validatedData.locationType || "remote";
          const hasAppliedDate =
            validatedData.appliedDate &&
            validatedData.appliedDate.trim() !== "";

          // Check if this is a legacy form submission (no encrypted timestamps)
          const hasEncryptedTimestamps =
            validatedData.createdAt &&
            validatedData.createdAt.trim() !== "" &&
            validatedData.updatedAt &&
            validatedData.updatedAt.trim() !== "";

          // Require encrypted timestamps for security
          if (!hasEncryptedTimestamps) {
            return createErrorResponse(
              "Encrypted timestamps are required for security. Please ensure your client provides encrypted createdAt and updatedAt fields.",
              400,
            );
          }

          // Create application data - timestamps are required and validated by schema
          const applicationData = {
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
            applicationType: applicationType as "cold" | "warm",
            roleType: roleType as "manager" | "engineer",
            locationType: locationType as "on-site" | "hybrid" | "remote",
            // No server-side event generation - all events must come from client with encrypted dates
            events: [],
            appliedDate: hasAppliedDate ? validatedData.appliedDate : undefined,
            notes: validatedData.notes || undefined,
            // Always include encrypted timestamps from client - server cannot generate them
            createdAt: validatedData.createdAt, // Required encrypted timestamp from client
            updatedAt: validatedData.updatedAt, // Required encrypted timestamp from client
            currentStatus: services.applicationService.calculateCurrentStatus({
              appliedDate: hasAppliedDate
                ? validatedData.appliedDate
                : undefined,
            }),
          };

          // Create the job application
          const application =
            await services.applicationService.createApplication(
              applicationData,
            );

          return createSuccessResponse(
            {
              application: {
                id: application._id!.toString(),
                companyName: application.companyName,
                roleName: application.roleName,
                currentStatus: application.currentStatus,
                createdAt: application.createdAt,
                updatedAt: application.updatedAt,
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
