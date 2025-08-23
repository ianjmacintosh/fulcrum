// Session cookie configuration
export const ADMIN_SESSION_COOKIE = "fulcrum_admin_session";
export const SESSION_MAX_AGE = 4 * 60 * 60 * 1000; // 4 hours

// Simple session store (in production, use Redis or proper session store)
export const sessionStore = new Map<
  string,
  { adminId: string; expires: number }
>();

// Clean up expired sessions every hour
setInterval(
  () => {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, data] of sessionStore.entries()) {
      if (now > data.expires) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach((id) => sessionStore.delete(id));
  },
  60 * 60 * 1000,
);

/**
 * Generate a secure session ID
 */
export function generateSessionId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Create admin session
 */
export function createAdminSession(adminId: string): string {
  const sessionId = generateSessionId();
  const expires = Date.now() + SESSION_MAX_AGE;

  sessionStore.set(sessionId, { adminId, expires });
  return sessionId;
}

/**
 * Clear admin session
 */
export function clearAdminSession(sessionId: string): void {
  sessionStore.delete(sessionId);
}

/**
 * Get admin session from request
 */
export function getAdminSession(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((cookie) => {
      const [key, value] = cookie.trim().split("=");
      return [key, value];
    }),
  );

  const sessionId = cookies[ADMIN_SESSION_COOKIE];
  if (!sessionId) return null;

  const session = sessionStore.get(sessionId);
  if (!session || Date.now() > session.expires) {
    if (session) sessionStore.delete(sessionId);
    return null;
  }

  return session.adminId;
}
