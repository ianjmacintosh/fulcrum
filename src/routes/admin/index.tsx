import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/')({
  beforeLoad: async ({ location }) => {
    // Check if admin is already authenticated
    try {
      const response = await fetch('/api/auth/status', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const authData = await response.json()
        if (authData.success && authData.authenticated && authData.userType === 'admin') {
          // Admin is already logged in, redirect to users page
          throw redirect({ to: '/admin/users' })
        }
      }
    } catch (error) {
      if (error instanceof Response || (error as any)?.to) {
        throw error // Re-throw redirects
      }
    }
    
    // Not authenticated as admin, redirect to main login
    throw redirect({
      to: '/login',
      search: {
        redirect: location.href,
      }
    })
  },
  component: () => null, // This component should never render
})