// Simple in-memory rate limiter
// For production, consider using Redis or a dedicated rate limiting service

interface RateLimitEntry {
  attempts: number
  windowStart: number
  blockedUntil?: number
}

class RateLimiter {
  private attempts: Map<string, RateLimitEntry> = new Map()
  private readonly maxAttempts: number
  private readonly windowMs: number
  private readonly blockDurationMs: number

  constructor(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000, blockDurationMs: number = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts
    this.windowMs = windowMs
    this.blockDurationMs = blockDurationMs
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  /**
   * Check if an identifier (IP, user, etc.) is rate limited
   * @param identifier - The identifier to check (e.g., IP address)
   * @returns Object with isBlocked status and retry info
   */
  check(identifier: string): { isBlocked: boolean; attemptsLeft: number; retryAfter?: number } {
    const now = Date.now()
    const entry = this.attempts.get(identifier)

    // Clean up expired entry
    if (entry && now - entry.windowStart > this.windowMs && (!entry.blockedUntil || now > entry.blockedUntil)) {
      this.attempts.delete(identifier)
      return { isBlocked: false, attemptsLeft: this.maxAttempts }
    }

    // Check if currently blocked
    if (entry?.blockedUntil && now < entry.blockedUntil) {
      return {
        isBlocked: true,
        attemptsLeft: 0,
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000)
      }
    }

    // Check if within rate limit
    if (!entry || now - entry.windowStart > this.windowMs) {
      return { isBlocked: false, attemptsLeft: this.maxAttempts }
    }

    const attemptsLeft = Math.max(0, this.maxAttempts - entry.attempts)
    return { isBlocked: false, attemptsLeft }
  }

  /**
   * Record an attempt for an identifier
   * @param identifier - The identifier to record (e.g., IP address)
   * @param success - Whether the attempt was successful
   */
  record(identifier: string, success: boolean = false): void {
    const now = Date.now()
    let entry = this.attempts.get(identifier)

    // Reset window if expired or successful attempt
    if (!entry || now - entry.windowStart > this.windowMs || success) {
      if (success) {
        // Remove entry on successful attempt
        this.attempts.delete(identifier)
        return
      }
      
      entry = {
        attempts: 0,
        windowStart: now
      }
    }

    entry.attempts++

    // Block if max attempts exceeded
    if (entry.attempts >= this.maxAttempts) {
      entry.blockedUntil = now + this.blockDurationMs
    }

    this.attempts.set(identifier, entry)
  }

  /**
   * Get current status for an identifier
   * @param identifier - The identifier to check
   */
  getStatus(identifier: string): { attempts: number; isBlocked: boolean; blockedUntil?: Date } {
    const entry = this.attempts.get(identifier)
    if (!entry) {
      return { attempts: 0, isBlocked: false }
    }

    const now = Date.now()
    const isBlocked = entry.blockedUntil ? now < entry.blockedUntil : false

    return {
      attempts: entry.attempts,
      isBlocked,
      blockedUntil: entry.blockedUntil ? new Date(entry.blockedUntil) : undefined
    }
  }

  /**
   * Manually clear rate limit for an identifier
   * @param identifier - The identifier to clear
   */
  clear(identifier: string): void {
    this.attempts.delete(identifier)
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, entry] of this.attempts.entries()) {
      // Remove if window expired and not blocked, or if block period expired
      if ((now - entry.windowStart > this.windowMs && !entry.blockedUntil) ||
          (entry.blockedUntil && now > entry.blockedUntil)) {
        expiredKeys.push(key)
      }
    }

    expiredKeys.forEach(key => this.attempts.delete(key))
  }
}

// Create rate limiter instances for different use cases
export const loginRateLimiter = new RateLimiter(
  5,           // 5 attempts
  15 * 60 * 1000,  // per 15 minutes
  15 * 60 * 1000   // block for 15 minutes
)

export const adminRateLimiter = new RateLimiter(
  3,           // 3 attempts (stricter for admin)
  15 * 60 * 1000,  // per 15 minutes  
  30 * 60 * 1000   // block for 30 minutes
)

// Helper function to get client IP from request
export function getClientIP(request: Request): string {
  // Check various headers for the real IP
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'fastly-client-ip', // Fastly
    'x-cluster-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded'
  ]

  for (const header of headers) {
    const value = request.headers.get(header)
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim()
      if (ip && ip !== 'unknown') {
        return ip
      }
    }
  }

  // Fallback to 'unknown' if no IP found
  return 'unknown'
}