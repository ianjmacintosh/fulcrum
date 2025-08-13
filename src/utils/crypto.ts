import bcrypt from 'bcrypt'

// bcrypt salt rounds - higher is more secure but slower
// 12 rounds is a good balance between security and performance
const SALT_ROUNDS = 12

/**
 * Hash a plain text password using bcrypt with automatic salt generation
 * @param plainPassword - The plain text password to hash
 * @returns Promise resolving to the hashed password
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Password must be a non-empty string')
  }
  
  if (plainPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long')
  }

  return await bcrypt.hash(plainPassword, SALT_ROUNDS)
}

/**
 * Verify a plain text password against a hashed password
 * @param plainPassword - The plain text password to verify
 * @param hashedPassword - The hashed password to compare against
 * @returns Promise resolving to true if passwords match, false otherwise
 */
export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  if (!plainPassword || typeof plainPassword !== 'string') {
    return false
  }
  
  if (!hashedPassword || typeof hashedPassword !== 'string') {
    return false
  }

  try {
    return await bcrypt.compare(plainPassword, hashedPassword)
  } catch (error) {
    console.error('Password verification error:', error)
    return false
  }
}

/**
 * Generate a secure random password
 * @param length - Length of the password (default: 16)
 * @returns A randomly generated password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length)
    password += charset[randomIndex]
  }
  
  return password
}