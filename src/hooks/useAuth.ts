import { useContext } from 'react'
import { AuthContext, AuthContextType } from '../contexts/AuthContext'

/**
 * Hook to consume AuthContext
 * 
 * @returns AuthContextType with user state and auth methods
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}