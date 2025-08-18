// src/routes/__root.tsx
/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import {
    Outlet,
    createRootRouteWithContext,
    HeadContent,
    Scripts,
} from '@tanstack/react-router'
import { Navigation } from '../components/Navigation'
import { Footer } from '../components/Footer'
import { RouterAuthProvider } from '../components/RouterAuthProvider'
import { AuthProvider } from '../contexts/AuthContext'
import { AuthContext } from '../router'
import '../styles/global.css'

export const Route = createRootRouteWithContext<{ auth: AuthContext }>()({
    head: () => ({
        meta: [
            {
                charSet: 'utf-8',
            },
            {
                name: 'viewport',
                content: 'width=device-width, initial-scale=1',
            },
            {
                title: 'Fulcrum - Find your next job like a pro',
            },
        ],
    }),
    scripts: () => [
    ],
    component: RootComponent,
})

function RootComponent() {
    return (
        <RootDocument>
            <AuthProvider>
                <RouterAuthProvider>
                    <Navigation />
                    <Outlet />
                    <Footer />
                </RouterAuthProvider>
            </AuthProvider>
        </RootDocument>
    )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <html>
            <head>
                <HeadContent />
            </head>
            <body>
                {children}
                <Scripts />

                {/* Hard-coding <script> tag to avoid loading bug: https://github.com/TanStack/router/issues/4585 */}
                <script async src="https://scripts.simpleanalyticscdn.com/latest.js"></script>
            </body>
        </html>
    )
}