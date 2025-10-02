// src/router.tsx
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { ApplicationService } from "./db/services/applications";
import { WorkflowService } from "./db/services/workflows";
import { JobBoardService } from "./db/services/job-boards";

// Auth context type for router
export interface AuthContext {
  user: {
    id: string;
    email?: string;
    name?: string;
    username?: string;
    createdAt: Date;
    updatedAt?: Date;
  } | null;
  userType: "admin" | "user" | null;
  authenticated: boolean;
  session?: {
    userId: string;
    userType: "admin" | "user";
    expires: number;
  } | null;
}

// Services context type for dependency injection
export interface ServicesContext {
  applicationService: ApplicationService;
  workflowService: WorkflowService;
  jobBoardService: JobBoardService;
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
      },
      services: undefined as any, // Will be set during app initialization
    } as { auth: AuthContext; services: ServicesContext },
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
