import { authMiddleware } from "../src/middleware/auth";

/**
 * Global middleware registration following TanStack Start best practices
 * This ensures authentication middleware runs for all server functions
 */
export default [authMiddleware];
