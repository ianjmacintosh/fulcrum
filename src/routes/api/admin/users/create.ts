import { createServerFileRoute } from "@tanstack/react-start/server";
import { userService } from "../../../../db/services/users";
import { createServices } from "../../../../services/factory";
import { UserOnboardingService } from "../../../../db/services/user-onboarding";
import { hashPassword } from "../../../../utils/crypto";
import {
  requireAdminAuth,
  createSuccessResponse,
  createErrorResponse,
} from "../../../../utils/auth-helpers";
import { z } from "zod";

// Schema for user creation validation
const CreateUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const ServerRoute = createServerFileRoute(
  "/api/admin/users/create",
).methods({
  POST: async ({ request }) => {
    // Check admin authentication
    const authResult = requireAdminAuth(request);
    if ("response" in authResult) {
      return authResult.response;
    }

    try {
      // Parse form data first
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
      const { verifyCSRFToken } = await import("../../../../utils/csrf-server");
      if (!verifyCSRFToken(csrfToken, csrfHash)) {
        return createErrorResponse(
          "Invalid security token. Please refresh the page and try again.",
          403,
        );
      }

      const email = formData.get("email") as string;
      const name = formData.get("name") as string;
      const password = formData.get("password") as string;

      // Validate input
      const validation = CreateUserSchema.safeParse({ email, name, password });
      if (!validation.success) {
        return createErrorResponse(validation.error.issues[0].message, 400);
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const user = await userService.createUser({
        email,
        name,
        hashedPassword,
      });

      // Provision default user data (job boards, workflows, statuses)
      try {
        const services = await createServices();
        const userOnboardingService = new UserOnboardingService(
          services.applicationService,
          services.jobBoardService,
          services.workflowService,
        );
        await userOnboardingService.provisionDefaultUserData(user.id);
      } catch (onboardingError) {
        console.error(
          "Failed to provision default user data:",
          onboardingError,
        );
        // User was created successfully, but onboarding failed
        // We could choose to delete the user or let admin handle it manually
        // For now, we'll continue and report success but mention the onboarding issue
      }

      return createSuccessResponse(
        {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt,
          },
        },
        201,
      );
    } catch (error: any) {
      if (error.message.includes("Email address already exists")) {
        return createErrorResponse("Email address already exists", 409);
      }

      return createErrorResponse("Failed to create user");
    }
  },
});
