import { useContext, useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { AuthContext as ReactAuthContext } from "../contexts/AuthContext";
import { AuthContext } from "../router";

/**
 * Bridge component that syncs React Auth Context with TanStack Router Context
 */
export function RouterAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const authContext = useContext(ReactAuthContext);
  const router = useRouter();

  useEffect(() => {
    if (!authContext) return;

    // Update router context whenever auth state changes
    const newAuthContext: AuthContext = {
      user: authContext.user
        ? {
            id:
              "id" in authContext.user
                ? authContext.user.id
                : authContext.user.username,
            email:
              "email" in authContext.user ? authContext.user.email : undefined,
            name:
              "name" in authContext.user ? authContext.user.name : undefined,
            username:
              "username" in authContext.user
                ? authContext.user.username
                : undefined,
            createdAt: authContext.user.createdAt,
            updatedAt:
              "updatedAt" in authContext.user
                ? authContext.user.updatedAt
                : undefined,
          }
        : null,
      userType: authContext.userType,
      authenticated: authContext.isLoggedIn,
      session: null, // Client-side doesn't have access to session details
    };

    // Update router context synchronously (assume services are already initialized)
    router.update({
      context: {
        auth: newAuthContext,
        services: (router as any).context?.services || undefined,
      },
    });

    // After auth context is loaded, check if we need to redirect protected routes
    if (!authContext.isLoading) {
      const currentLocation = router.state.location;
      const currentRoute =
        router.state.matches[router.state.matches.length - 1];

      // If we're on a protected route and not authenticated, redirect to login
      if (currentRoute && currentLocation.pathname !== "/login") {
        const isProtectedRoute =
          currentLocation.pathname.startsWith("/dashboard") ||
          currentLocation.pathname.startsWith("/applications") ||
          currentLocation.pathname.startsWith("/admin");

        if (isProtectedRoute && !authContext.isLoggedIn) {
          router.navigate({
            to: "/login",
            search: {
              redirect: currentLocation.href,
            },
          });
        }
        // If we're authenticated and on a protected route, reload the route to get fresh data
        else if (isProtectedRoute && authContext.isLoggedIn) {
          // Force reload the current route to fetch data with authentication
          router.invalidate();
        }
      }
    }
  }, [
    authContext?.user,
    authContext?.userType,
    authContext?.isLoggedIn,
    authContext?.isLoading,
    router,
  ]);

  // Don't render children until auth context is available
  if (!authContext) {
    return null;
  }

  return <>{children}</>;
}
