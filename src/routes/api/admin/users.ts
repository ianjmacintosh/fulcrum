import { createServerFileRoute } from '@tanstack/react-start/server'
import { userService } from '../../../db/services/users'

export const ServerRoute = createServerFileRoute('/api/admin/users').methods({
  GET: async ({ request }) => {
    try {
      console.log('🔐 Admin: Fetching all users...')
      const users = await userService.getAllUsers()
      
      // Don't return hashed passwords in the response for security
      const safeUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }))
      
      console.log(`✅ Admin: Retrieved ${safeUsers.length} users`)
      
      return new Response(JSON.stringify({
        success: true,
        users: safeUsers
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
      
    } catch (error) {
      console.error('❌ Admin get users error:', error)
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