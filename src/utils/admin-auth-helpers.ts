import { getAdminSession } from "./admin-session";

/**
 * Standard unauthorized response for admin routes
 */
export function createUnauthorizedResponse() {
  return new Response(
    JSON.stringify({
      success: false,
      error: "Unauthorized",
    }),
    {
      status: 401,
      headers: { "Content-Type": "application/json" },
    },
  );
}

/**
 * Standard error response for admin routes
 */
export function createErrorResponse(error: string, status: number = 500) {
  return new Response(
    JSON.stringify({
      success: false,
      error,
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}

/**
 * Standard success response for admin routes
 */
export function createSuccessResponse(data: any, status: number = 200) {
  return new Response(
    JSON.stringify({
      success: true,
      ...data,
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}

/**
 * Check admin authentication and return admin ID or null
 * This follows the exact pattern used in /api/admin/users.ts
 */
export function checkAdminAuth(request: Request): string | null {
  return getAdminSession(request);
}

/**
 * Require admin authentication - returns admin ID or unauthorized response
 * Use this helper in admin routes to reduce boilerplate
 */
export function requireAdminAuth(
  request: Request,
): { adminId: string } | { response: Response } {
  const adminId = getAdminSession(request);
  if (!adminId) {
    return { response: createUnauthorizedResponse() };
  }
  return { adminId };
}
