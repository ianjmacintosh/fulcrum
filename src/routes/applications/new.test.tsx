import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// Mock the router
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: vi.fn(() => (config: any) => ({
    beforeLoad: config.beforeLoad,
    component: config.component,
  })),
  useRouter: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock route guards
vi.mock("../../utils/route-guards", () => ({
  requireUserAuth: vi.fn(),
}));

// Mock dependencies
vi.mock("../../hooks/useAuth");
vi.mock("../../contexts/ServicesContext");
vi.mock("../../utils/csrf-client");

import { AuthProvider } from "../../contexts/AuthContext";
import { ServicesProvider } from "../../components/ServicesProvider";
import { useServices } from "../../contexts/ServicesContext";
import { useAuth } from "../../hooks/useAuth";
import { fetchCSRFTokens } from "../../utils/csrf-client";
import { KeyManager } from "../../services/key-manager";
import { NewApplication } from "./new";

const mockUseAuth = useAuth as any;
const mockUseServices = useServices as any;
const mockFetchCSRFTokens = fetchCSRFTokens as any;

// Mock job boards API
global.fetch = vi.fn();

describe("NewApplication Component", () => {
  let testKeyManager: KeyManager;
  const mockCreateApplication = vi.fn();
  const mockServices = {
    applications: {
      create: mockCreateApplication,
      list: vi.fn(),
      createBulk: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      createEvent: vi.fn(),
    },
    analytics: {
      dashboard: vi.fn(),
      projection: vi.fn(),
    },
    jobBoards: {
      list: vi.fn(),
      create: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";

    // Create a test KeyManager with memory strategy
    testKeyManager = new KeyManager("memory");

    // Setup default mocks
    mockUseAuth.mockReturnValue({
      encryptionKey: {} as CryptoKey,
      isLoggedIn: true,
      user: { id: "test-user" },
    });

    mockUseServices.mockReturnValue(mockServices);

    mockFetchCSRFTokens.mockResolvedValue({
      csrfToken: "test-token",
      csrfHash: "test-hash",
    });

    // Mock job boards API
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          jobBoards: [
            { id: "linkedin", name: "LinkedIn", url: "https://linkedin.com" },
          ],
        }),
    });

    mockCreateApplication.mockResolvedValue({
      success: true,
      application: { _id: "new-app-id" },
    });
  });

  it("should use ServicesProvider.applications.create instead of direct fetch", async () => {
    render(
      <AuthProvider keyManager={testKeyManager}>
        <ServicesProvider>
          <NewApplication />
        </ServicesProvider>
      </AuthProvider>,
    );

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByText("Add New Job")).toBeDefined();
    });

    // Fill out required fields
    const companyInput = screen.getByLabelText(/Company Name/);
    const roleInput = screen.getByLabelText(/Job Title/);

    fireEvent.change(companyInput, { target: { value: "Test Company" } });
    fireEvent.change(roleInput, { target: { value: "Software Engineer" } });

    // Submit form
    const submitButton = screen.getByRole("button", { name: /Add Job/ });
    fireEvent.click(submitButton);

    // Verify that services.applications.create was called instead of fetch
    await waitFor(() => {
      expect(mockCreateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: "Test Company",
          roleName: "Software Engineer",
        }),
      );
    });

    // Verify direct fetch was NOT called for application creation
    const fetchCalls = (global.fetch as any).mock.calls;
    const applicationCreateCalls = fetchCalls.filter((call: any) =>
      call[0].includes("/api/applications/create"),
    );
    expect(applicationCreateCalls).toHaveLength(0);
  });

  it("should pass all form data to ServicesProvider.applications.create", async () => {
    render(
      <AuthProvider keyManager={testKeyManager}>
        <ServicesProvider>
          <NewApplication />
        </ServicesProvider>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Add New Job")).toBeDefined();
    });

    // Fill out all form fields
    fireEvent.change(screen.getByLabelText(/Company Name/), {
      target: { value: "Test Company" },
    });
    fireEvent.change(screen.getByLabelText(/Job Title/), {
      target: { value: "Senior Engineer" },
    });
    fireEvent.change(screen.getByLabelText(/Job URL/), {
      target: { value: "https://example.com/job" },
    });
    fireEvent.change(screen.getByLabelText(/Applied Date/), {
      target: { value: "2023-12-01" },
    });
    fireEvent.change(screen.getByDisplayValue(/Select job board/), {
      target: { value: "LinkedIn" },
    });
    fireEvent.change(screen.getByDisplayValue(/Engineer \(default\)/), {
      target: { value: "manager" },
    });
    fireEvent.click(screen.getByDisplayValue("warm"));
    fireEvent.click(screen.getByDisplayValue("hybrid"));
    fireEvent.change(screen.getByLabelText(/Additional Notes/), {
      target: { value: "Great opportunity" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Add Job/ }));

    await waitFor(() => {
      expect(mockCreateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: "Test Company",
          roleName: "Senior Engineer",
          jobPostingUrl: "https://example.com/job",
          appliedDate: "2023-12-01",
          jobBoard: "LinkedIn",
          applicationType: "warm",
          roleType: "manager",
          locationType: "hybrid",
          notes: "Great opportunity",
        }),
      );
    });
  });

  it("should handle ServicesProvider errors gracefully", async () => {
    mockCreateApplication.mockResolvedValue({
      success: false,
      error: "Service error occurred",
      application: null,
    });

    render(
      <AuthProvider keyManager={testKeyManager}>
        <ServicesProvider>
          <NewApplication />
        </ServicesProvider>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Add New Job")).toBeDefined();
    });

    // Fill required fields and submit
    fireEvent.change(screen.getByLabelText(/Company Name/), {
      target: { value: "Test Company" },
    });
    fireEvent.change(screen.getByLabelText(/Job Title/), {
      target: { value: "Engineer" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Add Job/ }));

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText("Service error occurred")).toBeDefined();
    });
  });

  it("should NOT perform manual encryption when using ServicesProvider", async () => {
    render(
      <AuthProvider keyManager={testKeyManager}>
        <ServicesProvider>
          <NewApplication />
        </ServicesProvider>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Add New Job")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/Company Name/), {
      target: { value: "Test Company" },
    });
    fireEvent.change(screen.getByLabelText(/Job Title/), {
      target: { value: "Engineer" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Add Job/ }));

    await waitFor(() => {
      expect(mockCreateApplication).toHaveBeenCalled();
    });

    // Verify the data passed to service is NOT encrypted (plain text)
    const callArgs = mockCreateApplication.mock.calls[0][0];
    expect(callArgs.companyName).toBe("Test Company"); // Plain text, not encrypted
    expect(callArgs.roleName).toBe("Engineer"); // Plain text, not encrypted
  });
});
