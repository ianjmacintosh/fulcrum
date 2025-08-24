import { getSession, getAdminSession, getUserSession } from "./session";
import { adminService } from "../db/services/admin";
import { userService } from "../db/services/users";
import { verifyPassword } from "./crypto";

/**
 * Standard unauthorized response
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
 * Standard error response
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
 * Standard success response
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
 */
export function checkAdminAuth(request: Request): string | null {
  return getAdminSession(request);
}

/**
 * Check user authentication and return user ID or null
 */
export function checkUserAuth(request: Request): string | null {
  return getUserSession(request);
}

/**
 * Require admin authentication - returns admin ID or unauthorized response
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

/**
 * Require user authentication - returns user ID or unauthorized response
 */
export function requireUserAuth(
  request: Request,
): { userId: string } | { response: Response } {
  const userId = getUserSession(request);
  if (!userId) {
    return { response: createUnauthorizedResponse() };
  }
  return { userId };
}

/**
 * Require authentication of any type - returns session data or unauthorized response
 */
export function requireAuth(
  request: Request,
):
  | { session: { userId: string; userType: "admin" | "user" } }
  | { response: Response } {
  const session = getSession(request);
  if (!session) {
    return { response: createUnauthorizedResponse() };
  }
  return { session: { userId: session.userId, userType: session.userType } };
}

/**
 * Authenticate admin credentials
 */
export async function authenticateAdmin(
  username: string,
  password: string,
): Promise<
  { success: true; adminId: string } | { success: false; error: string }
> {
  try {
    const admin = await adminService.getAdminByUsername(username);
    if (!admin) {
      return { success: false, error: "Invalid username or password." };
    }

    const isValidPassword = await verifyPassword(
      password,
      admin.hashedPassword,
    );
    if (!isValidPassword) {
      return { success: false, error: "Invalid username or password." };
    }

    return { success: true, adminId: admin.username };
  } catch {
    return { success: false, error: "Authentication failed." };
  }
}

/**
 * Authenticate user credentials
 */
export async function authenticateUser(
  email: string,
  password: string,
): Promise<
  { success: true; userId: string } | { success: false; error: string }
> {
  try {
    const user = await userService.getUserByEmail(email);
    if (!user) {
      return { success: false, error: "Email address or password incorrect" };
    }

    const isValidPassword = await verifyPassword(password, user.hashedPassword);
    if (!isValidPassword) {
      return { success: false, error: "Email address or password incorrect" };
    }

    return { success: true, userId: user.id };
  } catch {
    return { success: false, error: "Authentication failed." };
  }
}

/**
 * Unified authentication - supports both admin (username) and user (email) credentials
 */
export async function authenticate(
  identifier: string,
  password: string,
): Promise<
  | { success: true; userId: string; userType: "admin" }
  | { success: true; userId: string; userType: "user" }
  | { success: false; error: string }
> {
  // First try admin authentication (by username)
  const adminResult = await authenticateAdmin(identifier, password);
  if (adminResult.success) {
    return { success: true, userId: adminResult.adminId, userType: "admin" };
  }

  // Then try user authentication (by email)
  const userResult = await authenticateUser(identifier, password);
  if (userResult.success) {
    return { success: true, userId: userResult.userId, userType: "user" };
  }

  // Return a generic error message for security
  return { success: false, error: "Invalid credentials" };
}
