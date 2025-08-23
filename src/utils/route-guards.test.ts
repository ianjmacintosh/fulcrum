import { describe, expect, test, vi, beforeEach } from "vitest";
import { requireUserAuth, requireAdminAuth } from "./route-guards";
import { AuthContext } from "../router";

// Mock @tanstack/react-router
vi.mock("@tanstack/react-router", () => ({
  redirect: vi.fn((options) => {
    throw new Error(`REDIRECT: ${JSON.stringify(options)}`);
  }),
}));

const mockLocation = {
  href: "http://localhost:3000/applications",
  pathname: "/applications",
};

const createAuthContext = (
  overrides: Partial<AuthContext> = {},
): AuthContext => ({
  user: null,
  userType: null,
  authenticated: false,
  session: null,
  ...overrides,
});

describe("requireUserAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window to be defined (client-side)
    Object.defineProperty(global, "window", {
      value: { location: {} },
      writable: true,
    });
  });

  test("allows authenticated user access", async () => {
    const authContext = createAuthContext({
      user: {
        id: "user123",
        email: "user@example.com",
        createdAt: new Date("2025-01-01"),
      },
      userType: "user",
      authenticated: true,
    });

    const result = await requireUserAuth({
      location: mockLocation,
      context: { auth: authContext },
    });

    expect(result).toEqual({ user: authContext.user });
  });

  test("throws redirect for unauthenticated user on client-side", async () => {
    const authContext = createAuthContext({
      user: null,
      userType: null,
      authenticated: false,
    });

    await expect(
      requireUserAuth({
        location: mockLocation,
        context: { auth: authContext },
      }),
    ).rejects.toThrow(
      'REDIRECT: {"to":"/login","search":{"redirect":"http://localhost:3000/applications"}}',
    );
  });

  test("throws redirect for admin user trying to access user route", async () => {
    const authContext = createAuthContext({
      user: {
        id: "admin",
        username: "admin",
        createdAt: new Date("2025-01-01"),
      },
      userType: "admin",
      authenticated: true,
    });

    await expect(
      requireUserAuth({
        location: mockLocation,
        context: { auth: authContext },
      }),
    ).rejects.toThrow(
      'REDIRECT: {"to":"/login","search":{"redirect":"http://localhost:3000/applications"}}',
    );
  });

  test("allows access on server-side regardless of auth state", async () => {
    // Mock server-side environment by setting window to undefined
    const originalWindow = global.window;
    (global as any).window = undefined;

    const authContext = createAuthContext({
      user: null,
      userType: null,
      authenticated: false,
    });

    const result = await requireUserAuth({
      location: mockLocation,
      context: { auth: authContext },
    });

    expect(result).toEqual({ user: null });

    // Restore window
    global.window = originalWindow;
  });

  test("allows access when authenticated flag is true even with null user", async () => {
    // This tests the actual behavior - route guards only check authenticated flag and userType
    const authContext = createAuthContext({
      user: null, // User is null but authenticated is true
      userType: "user",
      authenticated: true,
    });

    const result = await requireUserAuth({
      location: mockLocation,
      context: { auth: authContext },
    });

    expect(result).toEqual({ user: null });
  });
});

describe("requireAdminAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window to be defined (client-side)
    Object.defineProperty(global, "window", {
      value: { location: {} },
      writable: true,
    });
  });

  test("allows authenticated admin access", async () => {
    const authContext = createAuthContext({
      user: {
        id: "admin",
        username: "admin",
        createdAt: new Date("2025-01-01"),
      },
      userType: "admin",
      authenticated: true,
    });

    const result = await requireAdminAuth({
      location: mockLocation,
      context: { auth: authContext },
    });

    expect(result).toEqual({ user: authContext.user });
  });

  test("throws redirect for unauthenticated user on client-side", async () => {
    const authContext = createAuthContext({
      user: null,
      userType: null,
      authenticated: false,
    });

    await expect(
      requireAdminAuth({
        location: mockLocation,
        context: { auth: authContext },
      }),
    ).rejects.toThrow(
      'REDIRECT: {"to":"/login","search":{"redirect":"http://localhost:3000/applications"}}',
    );
  });

  test("throws redirect for regular user trying to access admin route", async () => {
    const authContext = createAuthContext({
      user: {
        id: "user123",
        email: "user@example.com",
        createdAt: new Date("2025-01-01"),
      },
      userType: "user",
      authenticated: true,
    });

    await expect(
      requireAdminAuth({
        location: mockLocation,
        context: { auth: authContext },
      }),
    ).rejects.toThrow(
      'REDIRECT: {"to":"/login","search":{"redirect":"http://localhost:3000/applications"}}',
    );
  });

  test("allows access on server-side regardless of auth state", async () => {
    // Mock server-side environment by setting window to undefined
    const originalWindow = global.window;
    (global as any).window = undefined;

    const authContext = createAuthContext({
      user: null,
      userType: null,
      authenticated: false,
    });

    const result = await requireAdminAuth({
      location: mockLocation,
      context: { auth: authContext },
    });

    expect(result).toEqual({ user: null });

    // Restore window
    global.window = originalWindow;
  });

  test("allows access when authenticated flag is true even with null admin user", async () => {
    // This tests the actual behavior - route guards only check authenticated flag and userType
    const authContext = createAuthContext({
      user: null, // User is null but authenticated is true
      userType: "admin",
      authenticated: true,
    });

    const result = await requireAdminAuth({
      location: mockLocation,
      context: { auth: authContext },
    });

    expect(result).toEqual({ user: null });
  });

  test("preserves redirect URL in search params", async () => {
    const customLocation = {
      href: "http://localhost:3000/admin/users?tab=active",
      pathname: "/admin/users",
    };

    const authContext = createAuthContext({
      user: null,
      userType: null,
      authenticated: false,
    });

    await expect(
      requireAdminAuth({
        location: customLocation,
        context: { auth: authContext },
      }),
    ).rejects.toThrow(
      'REDIRECT: {"to":"/login","search":{"redirect":"http://localhost:3000/admin/users?tab=active"}}',
    );
  });
});

describe("route guards environment handling", () => {
  test("server-side and client-side behavior differs correctly", async () => {
    const authContext = createAuthContext({
      user: null,
      userType: null,
      authenticated: false,
    });

    // Server-side: should allow access
    const originalWindow = global.window;
    (global as any).window = undefined;

    const serverResult = await requireUserAuth({
      location: mockLocation,
      context: { auth: authContext },
    });
    expect(serverResult).toEqual({ user: null });

    // Client-side: should redirect
    global.window = originalWindow;

    await expect(
      requireUserAuth({
        location: mockLocation,
        context: { auth: authContext },
      }),
    ).rejects.toThrow("REDIRECT:");
  });
});
