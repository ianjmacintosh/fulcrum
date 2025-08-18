// src/router.tsx
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

// Auth context type for router
export interface AuthContext {
  user: {
    id: string
    email?: string
    name?: string  
    username?: string
    createdAt: Date
    updatedAt?: Date
  } | null
  userType: 'admin' | 'user' | null
  authenticated: boolean
  session?: {
    userId: string
    userType: 'admin' | 'user'
    expires: number
  } | null
}

export function createRouter() {
    const router = createTanStackRouter({
        routeTree,
        scrollRestoration: true,
        context: {
          auth: {
            user: null,
            userType: null,
            authenticated: false,
            session: null,
          }
        } as { auth: AuthContext },
    })

    return router
}

declare module '@tanstack/react-router' {
    interface Register {
        router: ReturnType<typeof createRouter>
    }
}