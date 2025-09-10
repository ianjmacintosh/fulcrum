/**
 * Provider component for client-side context
 * Note: Services are initialized server-side in API routes, not here
 */
export function ServicesProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
