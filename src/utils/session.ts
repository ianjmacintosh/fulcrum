// Session cookie configuration
export const SESSION_COOKIE = 'fulcrum_session'
export const SESSION_MAX_AGE = 4 * 60 * 60 * 1000 // 4 hours

// Session data structure
export interface SessionData {
  userId: string
  userType: 'admin' | 'user'
  expires: number
}

// Simple session store (in production, use Redis or proper session store)
export const sessionStore = new Map<string, SessionData>()

// Clean up expired sessions every hour
setInterval(() => {
  const now = Date.now()
  const expiredSessions: string[] = []
  
  for (const [sessionId, data] of sessionStore.entries()) {
    if (now > data.expires) {
      expiredSessions.push(sessionId)
    }
  }
  
  expiredSessions.forEach(id => sessionStore.delete(id))
}, 60 * 60 * 1000)

/**
 * Generate a secure session ID
 */
export function generateSessionId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Create session for any user type
 */
export function createSession(userId: string, userType: 'admin' | 'user'): string {
  const sessionId = generateSessionId()
  const expires = Date.now() + SESSION_MAX_AGE
  
  sessionStore.set(sessionId, { userId, userType, expires })
  return sessionId
}

/**
 * Create admin session (compatibility wrapper)
 */
export function createAdminSession(adminId: string): string {
  return createSession(adminId, 'admin')
}

/**
 * Create user session
 */
export function createUserSession(userId: string): string {
  return createSession(userId, 'user')
}

/**
 * Clear session
 */
export function clearSession(sessionId: string): void {
  sessionStore.delete(sessionId)
}

/**
 * Clear admin session (compatibility wrapper)
 */
export function clearAdminSession(sessionId: string): void {
  clearSession(sessionId)
}

/**
 * Get session data from request
 */
export function getSession(request: Request): SessionData | null {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return null
  
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(cookie => {
      const [key, value] = cookie.trim().split('=')
      return [key, value]
    })
  )
  
  const sessionId = cookies[SESSION_COOKIE]
  if (!sessionId) return null
  
  const session = sessionStore.get(sessionId)
  if (!session || Date.now() > session.expires) {
    if (session) sessionStore.delete(sessionId)
    return null
  }
  
  return session
}

/**
 * Get admin session from request (compatibility wrapper)
 */
export function getAdminSession(request: Request): string | null {
  const session = getSession(request)
  return session?.userType === 'admin' ? session.userId : null
}

/**
 * Get user session from request
 */
export function getUserSession(request: Request): string | null {
  const session = getSession(request)
  return session?.userType === 'user' ? session.userId : null
}

/**
 * Check if user is authenticated with specific role
 */
export function isAuthenticated(request: Request, requiredRole?: 'admin' | 'user'): boolean {
  const session = getSession(request)
  if (!session) return false
  
  if (requiredRole) {
    return session.userType === requiredRole
  }
  
  return true
}