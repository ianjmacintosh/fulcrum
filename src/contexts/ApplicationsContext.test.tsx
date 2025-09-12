import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ApplicationsProvider, useApplications } from "./ApplicationsContext";
import { AuthProvider } from "./AuthContext";
import { ServicesProvider } from "../components/ServicesProvider";

const mockApplications = [
  {
    _id: "app1",
    companyName: "Test Company",
    roleName: "Software Engineer",
    currentStatus: { id: "applied", name: "Applied" },
    events: [],
  },
  {
    _id: "app2",
    companyName: "Another Company",
    roleName: "Backend Developer",
    currentStatus: { id: "interview", name: "Interview" },
    events: [],
  },
];

// Mock the fetch function
global.fetch = vi.fn();

// Mock auth context
const mockAuthContext = {
  user: { id: "user1", email: "test@example.com" },
  userType: "user" as const,
  isLoggedIn: true,
  isLoading: false,
  encryptionKey: null,
  login: vi.fn(),
  logout: vi.fn(),
  checkAuthStatus: vi.fn(),
};

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => mockAuthContext,
}));

function TestComponent() {
  const { applications, isLoading, error, getApplication } = useApplications();

  if (error) {
    return <div data-testid="error">{error}</div>;
  }

  if (isLoading) {
    return <div data-testid="loading">Loading...</div>;
  }

  return (
    <div>
      <div data-testid="applications-count">{applications.length}</div>
      <div data-testid="first-application">
        {applications[0]?.companyName || "No applications"}
      </div>
      <div data-testid="get-application">
        {getApplication("app1")?.roleName || "Not found"}
      </div>
    </div>
  );
}

describe("ApplicationsContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clean up DOM between tests to avoid element conflicts
    document.body.innerHTML = "";
  });

  it("provides applications data correctly", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        applications: mockApplications,
      }),
    });

    render(
      <AuthProvider>
        <ServicesProvider>
          <ApplicationsProvider>
            <TestComponent />
          </ApplicationsProvider>
        </ServicesProvider>
      </AuthProvider>,
    );

    // Should show loading initially
    expect(screen.getByTestId("loading")).toBeDefined();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId("applications-count")).toBeDefined();
    });

    expect(screen.getByTestId("applications-count").textContent).toBe("2");
    expect(screen.getByTestId("first-application").textContent).toBe(
      "Test Company",
    );
    expect(screen.getByTestId("get-application").textContent).toBe(
      "Software Engineer",
    );
  });

  it("handles fetch errors correctly", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    render(
      <AuthProvider>
        <ServicesProvider>
          <ApplicationsProvider>
            <TestComponent />
          </ApplicationsProvider>
        </ServicesProvider>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("error")).toBeDefined();
    });

    expect(screen.getByTestId("error").textContent).toContain("Network error");
  });

  it("handles API errors correctly", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, error: "API Error" }),
    });

    render(
      <AuthProvider>
        <ServicesProvider>
          <ApplicationsProvider>
            <TestComponent />
          </ApplicationsProvider>
        </ServicesProvider>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("error")).toBeDefined();
    });

    expect(screen.getByTestId("error").textContent).toContain(
      "Failed to fetch applications",
    );
  });

  it("returns null when application not found", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        applications: mockApplications,
      }),
    });

    function TestNotFoundComponent() {
      const { getApplication } = useApplications();
      const app = getApplication("non-existent");

      return <div data-testid="not-found">{app ? "Found" : "Not found"}</div>;
    }

    render(
      <AuthProvider>
        <ServicesProvider>
          <ApplicationsProvider>
            <TestNotFoundComponent />
          </ApplicationsProvider>
        </ServicesProvider>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("not-found")).toBeDefined();
    });

    expect(screen.getByTestId("not-found").textContent).toBe("Not found");
  });

  // Note: Removed test "does not fetch when user is not logged in" because
  // ServicesProvider handles authentication logic now, not ApplicationsContext
});
