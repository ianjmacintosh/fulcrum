import { randomBytes, createHash, timingSafeEqual } from 'crypto'

// CSRF token configuration
const CSRF_TOKEN_LENGTH = 32
const CSRF_SECRET_LENGTH = 32
const TOKEN_EXPIRY_MS = 4 * 60 * 60 * 1000 // 4 hours

// Store for CSRF tokens (in production, use Redis or session store)
const tokenStore = new Map<string, { secret: string; expires: number }>()

// Clean up expired tokens every hour
setInterval(() => {
  const now = Date.now()
  const expiredTokens: string[] = []
  
  for (const [token, data] of tokenStore.entries()) {
    if (now > data.expires) {
      expiredTokens.push(token)
    }
  }
  
  expiredTokens.forEach(token => tokenStore.delete(token))
  
  if (expiredTokens.length > 0) {
    console.log(`🧹 Cleaned up ${expiredTokens.length} expired CSRF tokens`)
  }
}, 60 * 60 * 1000)

/**
 * Generate a new CSRF token and secret pair (SERVER ONLY)
 * @returns Object containing the token and secret
 */
export function generateCSRFToken(): { token: string; secret: string } {
  const token = randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
  const secret = randomBytes(CSRF_SECRET_LENGTH).toString('hex')
  const expires = Date.now() + TOKEN_EXPIRY_MS
  
  tokenStore.set(token, { secret, expires })
  
  return { token, secret }
}

/**
 * Create a CSRF hash from token and secret (SERVER ONLY)
 * @param token - The CSRF token
 * @param secret - The secret associated with the token
 * @returns The CSRF hash to include in forms
 */
export function createCSRFHash(token: string, secret: string): string {
  return createHash('sha256')
    .update(token + secret)
    .digest('hex')
}

/**
 * Verify a CSRF token and hash (SERVER ONLY)
 * @param token - The CSRF token from the client
 * @param hash - The CSRF hash from the client
 * @returns True if the token and hash are valid
 */
export function verifyCSRFToken(token: string, hash: string): boolean {
  if (!token || !hash) {
    return false
  }
  
  const tokenData = tokenStore.get(token)
  if (!tokenData) {
    return false
  }
  
  // Check if token has expired
  if (Date.now() > tokenData.expires) {
    tokenStore.delete(token)
    return false
  }
  
  // Create expected hash
  const expectedHash = createCSRFHash(token, tokenData.secret)
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    const tokenBuffer = Buffer.from(hash, 'hex')
    const expectedBuffer = Buffer.from(expectedHash, 'hex')
    
    if (tokenBuffer.length !== expectedBuffer.length) {
      return false
    }
    
    return timingSafeEqual(tokenBuffer, expectedBuffer)
  } catch (error) {
    return false
  }
}

/**
 * Clean up a CSRF token after successful use (SERVER ONLY)
 * @param token - The token to clean up
 */
export function cleanupCSRFToken(token: string): void {
  tokenStore.delete(token)
}

/**
 * Get CSRF token data for embedding in HTML forms (SERVER ONLY)
 * @returns Object with token and hash for form inclusion
 */
export function getCSRFTokenData(): { csrfToken: string; csrfHash: string } {
  const { token, secret } = generateCSRFToken()
  const hash = createCSRFHash(token, secret)
  
  return {
    csrfToken: token,
    csrfHash: hash
  }
}

/**
 * Middleware helper to validate CSRF tokens from form data or headers (SERVER ONLY)
 * @param request - The incoming request
 * @returns Promise resolving to validation result
 */
export async function validateCSRFFromRequest(request: Request): Promise<boolean> {
  try {
    // Try to get CSRF data from form data first
    if (request.headers.get('content-type')?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      const token = formData.get('csrf_token') as string
      const hash = formData.get('csrf_hash') as string
      
      if (token && hash) {
        return verifyCSRFToken(token, hash)
      }
    }
    
    // Try headers as fallback
    const token = request.headers.get('x-csrf-token')
    const hash = request.headers.get('x-csrf-hash')
    
    if (token && hash) {
      return verifyCSRFToken(token, hash)
    }
    
    return false
  } catch (error) {
    console.error('CSRF validation error:', error)
    return false
  }
}