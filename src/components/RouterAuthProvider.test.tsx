import { render, waitFor } from "@testing-library/react";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { RouterAuthProvider } from "./RouterAuthProvider";
import {
  AuthContext as ReactAuthContext,
  AuthContextType,
} from "../contexts/AuthContext";

// Mock TanStack Router
const mockNavigate = vi.fn();
const mockInvalidate = vi.fn();
const mockUpdate = vi.fn();

const mockRouter = {
  navigate: mockNavigate,
  invalidate: mockInvalidate,
  update: mockUpdate,
  state: {
    location: {
      pathname: "/dashboard",
      href: "http://localhost:3000/dashboard",
    },
    matches: [{ id: "dashboard" }],
  },
  context: {
    services: undefined, // Mock services context
  },
} as any;

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => mockRouter,
}));

const defaultAuthContext: AuthContextType = {
  user: null,
  userType: null,
  isLoggedIn: false,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  checkAuthStatus: vi.fn(),
};

// Helper to render with auth context
const renderWithAuthContext = (authContext: Partial<AuthContextType> = {}) => {
  const contextValue: AuthContextType = {
    ...defaultAuthContext,
    ...authContext,
  };

  return render(
    <ReactAuthContext.Provider value={contextValue}>
      <RouterAuthProvider>
        <div data-testid="child">Test Child</div>
      </RouterAuthProvider>
    </ReactAuthContext.Provider>,
  );
};

describe("RouterAuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouter.state.location.pathname = "/dashboard";
    mockRouter.state.matches = [{ id: "dashboard" }];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("renders children when auth context is available", () => {
    const { getByTestId } = renderWithAuthContext();
    expect(getByTestId("child")).toBeInTheDocument();
  });

  test("does not render children when auth context is null", () => {
    const { container } = render(
      <ReactAuthContext.Provider value={null}>
        <RouterAuthProvider>
          <div data-testid="child">Test Child</div>
        </RouterAuthProvider>
      </ReactAuthContext.Provider>,
    );
    expect(container.firstChild).toBeNull();
  });

  test("updates router context when user logs in", async () => {
    const user = {
      id: "user123",
      email: "user@example.com",
      name: "Test User",
      hashedPassword: "hashed_password",
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
    };

    renderWithAuthContext({
      user,
      userType: "user",
      isLoggedIn: true,
      isLoading: false,
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        context: {
          auth: {
            user: {
              id: "user123",
              email: "user@example.com",
              name: "Test User",
              username: undefined,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            },
            userType: "user",
            authenticated: true,
            session: null,
          },
        },
      });
    });
  });

  test("updates router context when admin logs in", async () => {
    const adminUser = {
      username: "admin",
      hashedPassword: "hashed_admin_password",
      createdAt: new Date("2025-01-01"),
    };

    renderWithAuthContext({
      user: adminUser,
      userType: "admin",
      isLoggedIn: true,
      isLoading: false,
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        context: {
          auth: {
            user: {
              id: "admin",
              email: undefined,
              name: undefined,
              username: "admin",
              createdAt: adminUser.createdAt,
              updatedAt: undefined,
            },
            userType: "admin",
            authenticated: true,
            session: null,
          },
        },
      });
    });
  });

  test("redirects to login when accessing protected route while unauthenticated", async () => {
    mockRouter.state.location.pathname = "/applications";

    renderWithAuthContext({
      user: null,
      userType: null,
      isLoggedIn: false,
      isLoading: false, // Important: not loading, so auth check is complete
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/login",
        search: {
          redirect: "http://localhost:3000/dashboard",
        },
      });
    });
  });

  test("redirects to login when accessing admin route while unauthenticated", async () => {
    mockRouter.state.location.pathname = "/admin/users";

    renderWithAuthContext({
      user: null,
      userType: null,
      isLoggedIn: false,
      isLoading: false,
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/login",
        search: {
          redirect: "http://localhost:3000/dashboard",
        },
      });
    });
  });

  test("does not redirect when user is on login page", async () => {
    mockRouter.state.location.pathname = "/login";

    renderWithAuthContext({
      user: null,
      userType: null,
      isLoggedIn: false,
      isLoading: false,
    });

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test("does not redirect when auth is still loading", async () => {
    mockRouter.state.location.pathname = "/applications";

    renderWithAuthContext({
      user: null,
      userType: null,
      isLoggedIn: false,
      isLoading: true, // Still loading, should not redirect yet
    });

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test("invalidates router when authenticated user accesses protected route", async () => {
    mockRouter.state.location.pathname = "/applications";

    const user = {
      id: "user123",
      email: "user@example.com",
      name: "Test User",
      hashedPassword: "hashed_password",
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
    };

    renderWithAuthContext({
      user,
      userType: "user",
      isLoggedIn: true,
      isLoading: false,
    });

    await waitFor(() => {
      expect(mockInvalidate).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test("allows access to public routes without authentication", async () => {
    mockRouter.state.location.pathname = "/";

    renderWithAuthContext({
      user: null,
      userType: null,
      isLoggedIn: false,
      isLoading: false,
    });

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockInvalidate).not.toHaveBeenCalled();
    });
  });

  test("handles auth state changes correctly", async () => {
    const { rerender } = renderWithAuthContext({
      user: null,
      userType: null,
      isLoggedIn: false,
      isLoading: true,
    });

    // Initially loading, no navigation
    expect(mockNavigate).not.toHaveBeenCalled();

    // User logs in
    const user = {
      id: "user123",
      email: "user@example.com",
      name: "Test User",
      hashedPassword: "hashed_password",
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
    };

    rerender(
      <ReactAuthContext.Provider
        value={{
          ...defaultAuthContext,
          user,
          userType: "user",
          isLoggedIn: true,
          isLoading: false,
        }}
      >
        <RouterAuthProvider>
          <div data-testid="child">Test Child</div>
        </RouterAuthProvider>
      </ReactAuthContext.Provider>,
    );

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        context: {
          auth: expect.objectContaining({
            authenticated: true,
            userType: "user",
          }),
        },
      });
    });
  });

  test("handles user logout correctly", async () => {
    // Start with logged in user
    const { rerender } = renderWithAuthContext({
      user: {
        id: "user123",
        email: "user@example.com",
        name: "Test User",
        hashedPassword: "hashed_password",
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      },
      userType: "user",
      isLoggedIn: true,
      isLoading: false,
    });

    // User logs out
    rerender(
      <ReactAuthContext.Provider
        value={{
          ...defaultAuthContext,
          user: null,
          userType: null,
          isLoggedIn: false,
          isLoading: false,
        }}
      >
        <RouterAuthProvider>
          <div data-testid="child">Test Child</div>
        </RouterAuthProvider>
      </ReactAuthContext.Provider>,
    );

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        context: {
          auth: expect.objectContaining({
            authenticated: false,
            user: null,
            userType: null,
          }),
        },
      });
    });
  });
});
