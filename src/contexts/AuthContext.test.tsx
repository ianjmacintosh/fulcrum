import { render, act, waitFor } from "@testing-library/react";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "../hooks/useAuth";
import { createKeyFromPassword } from "../services/encryption-service";

// Mock the encryption service
vi.mock("../services/encryption-service", () => ({
  createKeyFromPassword: vi.fn(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("AuthContext", () => {
  let mockCryptoKey: CryptoKey;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock crypto key
    mockCryptoKey = {} as CryptoKey;

    // Mock successful encryption service
    vi.mocked(createKeyFromPassword).mockResolvedValue({
      key: mockCryptoKey,
      salt: "mockedSaltString",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("preserves encryption key after successful login and auth status check", async () => {
    // Mock successful login response
    mockFetch.mockImplementation((url) => {
      if (url === "/api/auth/login") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              userType: "user",
              userId: "user123",
              redirectUrl: "/dashboard",
            }),
        });
      }

      // Mock auth status check - user is authenticated
      if (url === "/api/auth/status") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              authenticated: true,
              user: {
                id: "user123",
                email: "test@example.com",
                name: "Test User",
                createdAt: new Date("2025-01-01"),
              },
              userType: "user",
            }),
        });
      }

      return Promise.reject(new Error(`Unexpected fetch call to ${url}`));
    });

    // Test component to access AuthContext
    function TestComponent() {
      const auth = useAuth();
      return (
        <div>
          <div data-testid="isLoggedIn">{auth.isLoggedIn.toString()}</div>
          <div data-testid="hasEncryptionKey">
            {(auth.encryptionKey !== null).toString()}
          </div>
          <div data-testid="userEmail">{auth.user?.email || "none"}</div>
          <button
            data-testid="checkAuth"
            onClick={() => auth.checkAuthStatus()}
          >
            Check Auth
          </button>
          <button
            data-testid="login"
            onClick={() => auth.login("test@example.com", "password123")}
          >
            Login
          </button>
        </div>
      );
    }

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    // Wait for initial auth check to complete
    await waitFor(() => {
      expect(getByTestId("isLoggedIn")).toHaveTextContent("false");
    });

    // Perform login
    await act(async () => {
      getByTestId("login").click();
    });

    // Verify login succeeded and encryption key is available
    await waitFor(() => {
      expect(getByTestId("isLoggedIn")).toHaveTextContent("true");
      expect(getByTestId("hasEncryptionKey")).toHaveTextContent("true");
      expect(getByTestId("userEmail")).toHaveTextContent("test@example.com");
    });

    // Now trigger another auth status check (this simulates what happens during app lifecycle)
    await act(async () => {
      getByTestId("checkAuth").click();
    });

    // CRITICAL TEST: Encryption key should still be available after auth status check
    await waitFor(() => {
      expect(getByTestId("isLoggedIn")).toHaveTextContent("true");
      expect(getByTestId("hasEncryptionKey")).toHaveTextContent("true");
      expect(getByTestId("userEmail")).toHaveTextContent("test@example.com");
    });

    // Verify that createKeyFromPassword was only called once (during login)
    expect(createKeyFromPassword).toHaveBeenCalledTimes(1);
    expect(createKeyFromPassword).toHaveBeenCalledWith(
      "password123",
      "user123",
    );
  });

  test("clears encryption key when user logs out", async () => {
    // Mock successful login and logout responses
    mockFetch.mockImplementation((url) => {
      if (url === "/api/auth/login") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              userType: "user",
              userId: "user123",
              redirectUrl: "/dashboard",
            }),
        });
      }

      if (url === "/api/auth/status") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              authenticated: true,
              user: {
                id: "user123",
                email: "test@example.com",
                name: "Test User",
                createdAt: new Date("2025-01-01"),
              },
              userType: "user",
            }),
        });
      }

      if (url === "/api/auth/logout") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }

      return Promise.reject(new Error(`Unexpected fetch call to ${url}`));
    });

    // Test component with logout functionality
    function TestComponentWithLogout() {
      const auth = useAuth();
      return (
        <div>
          <div data-testid="hasEncryptionKey-logout">
            {(auth.encryptionKey !== null).toString()}
          </div>
          <button
            data-testid="login-logout"
            onClick={() => auth.login("test@example.com", "password123")}
          >
            Login
          </button>
          <button data-testid="logout-logout" onClick={() => auth.logout()}>
            Logout
          </button>
        </div>
      );
    }

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponentWithLogout />
      </AuthProvider>,
    );

    // Login first
    await act(async () => {
      getByTestId("login-logout").click();
    });

    await waitFor(() => {
      expect(getByTestId("hasEncryptionKey-logout")).toHaveTextContent("true");
    });

    // Perform logout
    await act(async () => {
      getByTestId("logout-logout").click();
    });

    // Verify encryption key is cleared after logout
    await waitFor(() => {
      expect(getByTestId("hasEncryptionKey-logout")).toHaveTextContent("false");
    });
  });

  test("handles encryption key derivation failure gracefully", async () => {
    // Mock successful login but failed encryption key derivation
    mockFetch.mockImplementation((url) => {
      if (url === "/api/auth/login") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              userType: "user",
              userId: "user123",
              redirectUrl: "/dashboard",
            }),
        });
      }

      if (url === "/api/auth/status") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              authenticated: true,
              user: {
                id: "user123",
                email: "test@example.com",
                name: "Test User",
                createdAt: new Date("2025-01-01"),
              },
              userType: "user",
            }),
        });
      }

      return Promise.reject(new Error(`Unexpected fetch call to ${url}`));
    });

    // Mock encryption service to fail
    vi.mocked(createKeyFromPassword).mockRejectedValue(
      new Error("Key derivation failed"),
    );

    // Test component for failed encryption
    function TestComponentFailedEncryption() {
      const auth = useAuth();
      return (
        <div>
          <div data-testid="isLoggedIn-failed">
            {auth.isLoggedIn.toString()}
          </div>
          <div data-testid="hasEncryptionKey-failed">
            {(auth.encryptionKey !== null).toString()}
          </div>
          <div data-testid="userEmail-failed">{auth.user?.email || "none"}</div>
          <button
            data-testid="login-failed"
            onClick={() => auth.login("test@example.com", "password123")}
          >
            Login
          </button>
        </div>
      );
    }

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponentFailedEncryption />
      </AuthProvider>,
    );

    // Perform login
    await act(async () => {
      getByTestId("login-failed").click();
    });

    // Verify login succeeded but no encryption key
    await waitFor(() => {
      expect(getByTestId("isLoggedIn-failed")).toHaveTextContent("true");
      expect(getByTestId("hasEncryptionKey-failed")).toHaveTextContent("false");
      expect(getByTestId("userEmail-failed")).toHaveTextContent(
        "test@example.com",
      );
    });
  });
});
