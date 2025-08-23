import { createServerFileRoute } from "@tanstack/react-start/server";
import { adminService } from "../../../db/services/admin";
import { verifyPassword } from "../../../utils/crypto";
import {
  createAdminSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "../../../utils/session";
import { adminRateLimiter, getClientIP } from "../../../utils/rate-limiter";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../../../utils/auth-helpers";
import { z } from "zod";

// Schema for login validation
const LoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const ServerRoute = createServerFileRoute("/api/admin/login").methods({
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
      const { username, password } = data;

      // Validate input
      const validation = LoginSchema.safeParse({ username, password });
      if (!validation.success) {
        adminRateLimiter.record(clientIP, false);
        return createErrorResponse("Invalid username or password.", 400);
      }

      // Find admin user
      const admin = await adminService.getAdminByUsername(username);
      if (!admin) {
        adminRateLimiter.record(clientIP, false);
        return createErrorResponse("Invalid username or password.", 401);
      }

      // Verify password
      const isValidPassword = await verifyPassword(
        password,
        admin.hashedPassword,
      );
      if (!isValidPassword) {
        adminRateLimiter.record(clientIP, false);
        return createErrorResponse("Invalid username or password.", 401);
      }

      // Success - create session
      const sessionId = createAdminSession(admin.username);

      // Record successful login (clears rate limit for this IP)
      adminRateLimiter.record(clientIP, true);

      // Secure HttpOnly cookie for production security
      const isProduction = process.env.NODE_ENV === "production";
      const secureFlag = isProduction ? "Secure; " : "";
      const sessionCookie = `${SESSION_COOKIE}=${sessionId}; Path=/; ${secureFlag}HttpOnly; SameSite=Strict; Max-Age=${SESSION_MAX_AGE / 1000}`;

      return new Response(
        JSON.stringify({
          success: true,
          message: "Login successful",
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
