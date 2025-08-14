import { createServerFileRoute } from '@tanstack/react-start/server'
import { adminService } from '../../../db/services/admin'
import { verifyPassword, hashPassword } from '../../../utils/crypto'
import { requireAdminAuth, createSuccessResponse, createErrorResponse } from '../../../utils/auth-helpers'
import { adminRateLimiter, getClientIP } from '../../../utils/rate-limiter'
import { z } from 'zod'

// Schema for password change validation
const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Password confirmation is required')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New password and confirmation don't match",
  path: ["confirmPassword"]
})

export const ServerRoute = createServerFileRoute('/api/admin/change-password').methods({
  POST: async ({ request }) => {
    // Check admin authentication first
    const authResult = requireAdminAuth(request)
    if ('response' in authResult) {
      return authResult.response
    }
    
    const { adminId } = authResult
    const clientIP = getClientIP(request)
    
    try {
      // Check rate limiting
      const rateLimitCheck = adminRateLimiter.check(clientIP)
      if (rateLimitCheck.isBlocked) {
        return new Response(JSON.stringify({
          success: false,
          error: `Too many password change attempts. Try again in ${rateLimitCheck.retryAfter} seconds.`,
          retryAfter: rateLimitCheck.retryAfter
        }), {
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': rateLimitCheck.retryAfter?.toString() || '900'
          }
        })
      }
      
      // Parse JSON body
      const data = await request.json()
      const { currentPassword, newPassword, confirmPassword } = data
      
      // Validate input
      const validation = ChangePasswordSchema.safeParse({ 
        currentPassword, 
        newPassword, 
        confirmPassword 
      })
      
      if (!validation.success) {
        const errorMessage = validation.error.errors[0]?.message || 'Invalid input'
        adminRateLimiter.record(clientIP, false)
        return createErrorResponse(errorMessage, 400)
      }
      
      // Get current admin user
      const admin = await adminService.getAdminByUsername(adminId)
      if (!admin) {
        adminRateLimiter.record(clientIP, false)
        return createErrorResponse('Admin user not found.', 404)
      }
      
      // Verify current password
      const isCurrentPasswordValid = await verifyPassword(currentPassword, admin.hashedPassword)
      if (!isCurrentPasswordValid) {
        adminRateLimiter.record(clientIP, false)
        return createErrorResponse('Current password is incorrect.', 401)
      }
      
      // Check if new password is different from current
      const isSamePassword = await verifyPassword(newPassword, admin.hashedPassword)
      if (isSamePassword) {
        return createErrorResponse('New password must be different from current password.', 400)
      }
      
      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword)
      
      // Update password in database
      const updateSuccess = await adminService.updateAdminPassword(adminId, hashedNewPassword)
      if (!updateSuccess) {
        return createErrorResponse('Failed to update password. Please try again.', 500)
      }
      
      // Record successful operation (clears rate limit)
      adminRateLimiter.record(clientIP, true)
      
      return createSuccessResponse({
        message: 'Password changed successfully'
      })
      
    } catch (error) {
      console.error('Password change error:', error)
      // Record failed attempt for server errors too
      adminRateLimiter.record(clientIP, false)
      return createErrorResponse('An error occurred while changing password. Please try again.')
    }
  }
})