import { createServerFileRoute } from '@tanstack/react-start/server'
import { clearAdminSession, ADMIN_SESSION_COOKIE } from '../../../utils/admin-session'
import { createSuccessResponse } from '../../../utils/admin-auth-helpers'

export const ServerRoute = createServerFileRoute('/api/admin/logout').methods({
  GET: async ({ request }) => {
    const cookieHeader = request.headers.get('cookie')
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map(cookie => {
          const [key, value] = cookie.trim().split('=')
          return [key, value]
        })
      )
      
      const sessionId = cookies[ADMIN_SESSION_COOKIE]
      if (sessionId) {
        clearAdminSession(sessionId)
      }
    }
    
    // Only use Secure flag in production (HTTPS)
    const isProduction = process.env.NODE_ENV === 'production'
    const secureFlag = isProduction ? 'Secure; ' : ''
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Logged out successfully'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `${ADMIN_SESSION_COOKIE}=; Path=/; ${secureFlag}SameSite=Strict; Max-Age=0`
      }
    })
  }
})