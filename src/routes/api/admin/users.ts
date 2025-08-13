import { createServerFileRoute } from '@tanstack/react-start/server'
import { userService } from '../../../db/services/users'
import { getAdminSession } from '../../../utils/admin-session'

export const ServerRoute = createServerFileRoute('/api/admin/users').methods({
  GET: async ({ request }) => {
    // Check admin authentication
    const adminId = getAdminSession(request)
    if (!adminId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    try {
      const users = await userService.getAllUsers()
      
      // Don't return hashed passwords in the response for security
      const safeUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }))
      
      return new Response(JSON.stringify({
        success: true,
        users: safeUsers
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
      
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch users'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
})