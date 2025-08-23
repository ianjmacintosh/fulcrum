import { createServerFileRoute } from "@tanstack/react-start/server";
import { createSuccessResponse } from "../../../utils/auth-helpers";
import { authMiddleware } from "../../../middleware/auth";

export const ServerRoute = createServerFileRoute("/api/auth/status")
  .middleware([authMiddleware])
  .methods({
    GET: async ({ context }) => {
      const { auth } = context;

      return createSuccessResponse({
        authenticated: auth.authenticated,
        user: auth.user,
        userType: auth.userType,
      });
    },
  });
