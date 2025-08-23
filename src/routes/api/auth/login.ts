import { createServerFileRoute } from "@tanstack/react-start/server";
import { authenticate } from "../../../utils/auth-helpers";
import {
  createSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "../../../utils/session";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../../../utils/auth-helpers";
import { adminRateLimiter, getClientIP } from "../../../utils/rate-limiter";
import { z } from "zod";

// Schema for login validation
const LoginSchema = z.object({
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export const ServerRoute = createServerFileRoute("/api/auth/login").methods({
  POST: async ({ request }) => {
    const clientIP = getClientIP(request);

    try {
      // Check rate limiting first
      const rateLimitCheck = adminRateLimiter.check(clientIP);
      if (rateLimitCheck.isBlocked) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Too many failed login attempts. Try again in ${rateLimitCheck.retryAfter} seconds.`,
            retryAfter: rateLimitCheck.retryAfter,
          }),
          {
            status: 429, // Too Many Requests
            headers: {
              "Content-Type": "application/json",
              "Retry-After": rateLimitCheck.retryAfter?.toString() || "900",
            },
          },
        );
      }

      // Parse JSON body
      const data = await request.json();
      const { email, password } = data;

      // Validate input
      const validation = LoginSchema.safeParse({ email, password });
      if (!validation.success) {
        adminRateLimiter.record(clientIP, false);
        return createErrorResponse("Email and password are required.", 400);
      }

      // Authenticate user (supports both admin and user credentials)
      const authResult = await authenticate(email, password);
      if (!authResult.success) {
        adminRateLimiter.record(clientIP, false);
        return createErrorResponse(authResult.error, 401);
      }

      // Success - create session
      const sessionId = createSession(authResult.userId, authResult.userType);

      // Record successful login (clears rate limit for this IP)
      adminRateLimiter.record(clientIP, true);

      // Secure HttpOnly cookie for production security
      const isProduction = process.env.NODE_ENV === "production";
      const secureFlag = isProduction ? "Secure; " : "";
      const sessionCookie = `${SESSION_COOKIE}=${sessionId}; Path=/; ${secureFlag}HttpOnly; SameSite=Strict; Max-Age=${SESSION_MAX_AGE / 1000}`;

      // Determine redirect URL based on user type
      const redirectUrl =
        authResult.userType === "admin" ? "/admin/users" : "/dashboard";

      return new Response(
        JSON.stringify({
          success: true,
          message: "Login successful",
          userType: authResult.userType,
          redirectUrl,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": sessionCookie,
          },
        },
      );
    } catch (error) {
      // Record failed attempt for server errors too
      adminRateLimiter.record(clientIP, false);
      return createErrorResponse("An error occurred. Please try again.");
    }
  },
});
