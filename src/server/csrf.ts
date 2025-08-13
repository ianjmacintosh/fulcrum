import { createServerFn } from '@tanstack/react-start'
import { getCSRFTokenData } from '../utils/csrf-server'

// GET /api/csrf/token - Generate CSRF token for client use
export const getCSRFToken = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const tokenData = getCSRFTokenData()
    
    return new Response(JSON.stringify({
      success: true,
      ...tokenData
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('CSRF token generation error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to generate CSRF token'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})