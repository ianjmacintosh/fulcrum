import { getAdminSession } from "../utils/admin-session";

/**
 * Middleware to protect admin routes
 * Redirects unauthenticated users to the admin login page
 */
export function requireAdminAuth() {
  return async (request: Request): Promise<Response | null> => {
    const url = new URL(request.url);

    // Skip authentication check for login page and API endpoints
    if (
      url.pathname === "/admin" ||
      url.pathname.startsWith("/api/admin/login")
    ) {
      return null; // Continue to route handler
    }

    // Check if admin is authenticated
    const adminId = getAdminSession(request);
    if (!adminId) {
      // Redirect to admin login page
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/admin",
        },
      });
    }

    return null; // Continue to route handler
  };
}

/**
 * Check if current request is from authenticated admin
 * @param request - The incoming request
 * @returns The admin ID if authenticated, null otherwise
 */
export function getAuthenticatedAdmin(request: Request): string | null {
  return getAdminSession(request);
}

/**
 * Ensure admin authentication and return admin ID or throw error
 * @param request - The incoming request
 * @returns The admin ID
 * @throws Error if not authenticated
 */
export function requireAuthentication(request: Request): string {
  const adminId = getAdminSession(request);
  if (!adminId) {
    throw new Error("Authentication required");
  }
  return adminId;
}
