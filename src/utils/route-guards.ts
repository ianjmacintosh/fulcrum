import { redirect } from "@tanstack/react-router";
import { AuthContext } from "../router";

/**
 * Simplified route guard for user routes - now just checks auth context
 * Heavy lifting is done by TanStack Start middleware
 */
export async function requireUserAuth({
  location,
  context,
}: {
  location: any;
  context: { auth: AuthContext };
}) {
  const { auth } = context;

  // On server-side (SSR), we don't have reliable auth context yet
  // Let the client-side handle authentication after hydration
  if (typeof window === "undefined") {
    // Server-side: return empty auth but don't redirect
    // The client will handle auth check after hydration
    return { user: null };
  }

  // Client-side: enforce authentication
  if (!auth.authenticated || auth.userType !== "user") {
    throw redirect({
      to: "/login",
      search: {
        redirect: location.href,
      },
    });
  }

  return { user: auth.user };
}

/**
 * Simplified route guard for admin routes - now just checks auth context
 * Heavy lifting is done by TanStack Start middleware
 */
export async function requireAdminAuth({
  location,
  context,
}: {
  location: any;
  context: { auth: AuthContext };
}) {
  const { auth } = context;

  // On server-side (SSR), we don't have reliable auth context yet
  // Let the client-side handle authentication after hydration
  if (typeof window === "undefined") {
    // Server-side: return empty auth but don't redirect
    // The client will handle auth check after hydration
    return { user: null };
  }

  // Client-side: enforce authentication
  if (!auth.authenticated || auth.userType !== "admin") {
    throw redirect({
      to: "/login",
      search: {
        redirect: location.href,
      },
    });
  }

  return { user: auth.user };
}
