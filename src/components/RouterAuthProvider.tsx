import { useContext, useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { AuthContext as ReactAuthContext } from '../contexts/AuthContext'
import { AuthContext } from '../router'

/**
 * Bridge component that syncs React Auth Context with TanStack Router Context
 */
export function RouterAuthProvider({ children }: { children: React.ReactNode }) {
  const authContext = useContext(ReactAuthContext)
  const router = useRouter()

  useEffect(() => {
    if (!authContext) return

    // Update router context whenever auth state changes
    const newAuthContext: AuthContext = {
      user: authContext.user,
      userType: authContext.userType,
      authenticated: authContext.isLoggedIn,
      session: null, // Client-side doesn't have access to session details
    }

    // Update router context synchronously
    router.update({
      context: {
        auth: newAuthContext,
      },
    })
  }, [authContext?.user, authContext?.userType, authContext?.isLoggedIn, router])

  // Don't render children until auth context is available
  if (!authContext) {
    return null
  }

  return <>{children}</>
}