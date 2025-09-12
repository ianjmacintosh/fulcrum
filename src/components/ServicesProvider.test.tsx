import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { ServicesProvider } from "./ServicesProvider";
import { useServices } from "../contexts/ServicesContext";
import { useAuth } from "../hooks/useAuth";
import * as encryptionService from "../services/encryption-service";

// Mock dependencies
vi.mock("../hooks/useAuth");
vi.mock("../services/encryption-service");
vi.mock("../utils/csrf-client");

// Mock fetch
global.fetch = vi.fn();

const mockUseAuth = useAuth as any;
const mockEncryptFields = encryptionService.encryptFields as any;
const mockDecryptFields = encryptionService.decryptFields as any;
const mockIsDataEncrypted = encryptionService.isDataEncrypted as any;

// Mock CSRF client - need to import and mock the actual module
import * as csrfClient from "../utils/csrf-client";
const mockFetchCSRFTokens = vi.spyOn(csrfClient, "fetchCSRFTokens");

// Test component that uses the services
function TestComponent() {
  const services = useServices();

  const handleTestCall = async () => {
    try {
      const result = await services.applications.list();
      // Display result for testing
      const resultDiv = document.createElement("div");
      resultDiv.textContent = JSON.stringify(result);
      resultDiv.setAttribute("data-testid", "api-result");
      document.body.appendChild(resultDiv);
    } catch (error) {
      console.error("Test call failed:", error);
    }
  };

  return (
    <div>
      <button onClick={handleTestCall} data-testid="test-button">
        Test API Call
      </button>
    </div>
  );
}

describe("ServicesProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockUseAuth.mockReturnValue({
      encryptionKey: null,
      isLoggedIn: false,
    });

    mockEncryptFields.mockImplementation((data: any) => Promise.resolve(data));
    mockDecryptFields.mockImplementation((data: any) => Promise.resolve(data));
    mockIsDataEncrypted.mockReturnValue(false);

    // Setup CSRF mock
    mockFetchCSRFTokens.mockResolvedValue({
      csrfToken: "test-token",
      csrfHash: "test-hash",
    });
  });

  afterEach(() => {
    // Clean up DOM between tests to avoid element conflicts
    document.body.innerHTML = "";
  });

  it("provides services context to children", () => {
    render(
      <ServicesProvider>
        <TestComponent />
      </ServicesProvider>,
    );

    expect(screen.getByTestId("test-button")).toBeInTheDocument();
  });

  it("handles API calls without encryption when no key is available", async () => {
    const mockApplications = [
      { _id: "1", companyName: "Test Company", roleName: "Developer" },
    ];

    (fetch as any).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          applications: mockApplications,
        }),
    });

    render(
      <ServicesProvider>
        <TestComponent />
      </ServicesProvider>,
    );

    const button = screen.getByTestId("test-button");
    button.click();

    await waitFor(() => {
      const result = document.querySelector('[data-testid="api-result"]');
      expect(result).toBeInTheDocument();
    });

    // Verify fetch was called correctly
    expect(fetch).toHaveBeenCalledWith("/api/applications/", {
      credentials: "include",
    });

    // Verify no encryption/decryption was attempted
    expect(mockEncryptFields).not.toHaveBeenCalled();
    expect(mockDecryptFields).not.toHaveBeenCalled();
  });

  it("handles case when encryption key is null despite being logged in", async () => {
    const encryptedApplications = [
      { _id: "1", companyName: "encrypted_data", roleName: "encrypted_data" },
    ];

    // Simulate case where user is logged in but encryption key is null
    // (e.g., key failed to load from IndexedDB)
    mockUseAuth.mockReturnValue({
      encryptionKey: null,
      isLoggedIn: true,
    });

    mockIsDataEncrypted.mockReturnValue(true);

    (fetch as any).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          applications: encryptedApplications,
        }),
    });

    render(
      <ServicesProvider>
        <TestComponent />
      </ServicesProvider>,
    );

    const button = screen.getByTestId("test-button");
    button.click();

    await waitFor(() => {
      const result = document.querySelector('[data-testid="api-result"]');
      expect(result).toBeInTheDocument();
    });

    // Verify no decryption was attempted (no encryption key)
    expect(mockIsDataEncrypted).not.toHaveBeenCalled();
    expect(mockDecryptFields).not.toHaveBeenCalled();

    // Should return encrypted data as-is
    const result = document.querySelector('[data-testid="api-result"]');
    expect(result?.textContent).toContain('"companyName":"encrypted_data"');
  });

  it("handles automatic decryption when encryption key is available", async () => {
    const mockEncryptionKey = {} as CryptoKey; // Mock key
    const encryptedApplications = [
      { _id: "1", companyName: "encrypted_data", roleName: "encrypted_data" },
    ];
    const decryptedApplications = [
      { _id: "1", companyName: "Test Company", roleName: "Developer" },
    ];

    mockUseAuth.mockReturnValue({
      encryptionKey: mockEncryptionKey,
      isLoggedIn: true,
    });

    mockIsDataEncrypted.mockReturnValue(true);
    mockDecryptFields.mockResolvedValue(decryptedApplications[0]);

    (fetch as any).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          applications: encryptedApplications,
        }),
    });

    render(
      <ServicesProvider>
        <TestComponent />
      </ServicesProvider>,
    );

    const button = screen.getByTestId("test-button");
    button.click();

    await waitFor(() => {
      const result = document.querySelector('[data-testid="api-result"]');
      expect(result).toBeInTheDocument();
    });

    // Verify decryption was attempted
    expect(mockIsDataEncrypted).toHaveBeenCalledWith(
      encryptedApplications[0],
      "JobApplication",
    );
    expect(mockDecryptFields).toHaveBeenCalledWith(
      encryptedApplications[0],
      mockEncryptionKey,
      "JobApplication",
    );
  });

  it("handles API errors gracefully", async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    render(
      <ServicesProvider>
        <TestComponent />
      </ServicesProvider>,
    );

    const button = screen.getByTestId("test-button");
    button.click();

    await waitFor(() => {
      const result = document.querySelector('[data-testid="api-result"]');
      expect(result).toBeInTheDocument();
      expect(result?.textContent).toContain('"success":false');
      expect(result?.textContent).toContain("Failed to fetch applications");
    });
  });

  it("handles network errors gracefully", async () => {
    (fetch as any).mockRejectedValue(new Error("Network error"));

    render(
      <ServicesProvider>
        <TestComponent />
      </ServicesProvider>,
    );

    const button = screen.getByTestId("test-button");
    button.click();

    await waitFor(() => {
      const result = document.querySelector('[data-testid="api-result"]');
      expect(result).toBeInTheDocument();
      expect(result?.textContent).toContain('"success":false');
      expect(result?.textContent).toContain("Network error");
    });
  });

  it("throws error when useServices is used outside provider", () => {
    // Capture console errors to avoid test output noise
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useServices must be used within ServicesProvider");

    consoleSpy.mockRestore();
  });

  describe("createApplication method", () => {
    it("should automatically inject timestamps and encrypt all sensitive fields", async () => {
      const mockEncryptionKey = {} as CryptoKey;
      const mockDate = "2023-12-01T10:00:00.000Z";

      // Mock Date.now() for consistent timestamps
      vi.spyOn(Date.prototype, "toISOString").mockReturnValue(mockDate);

      mockUseAuth.mockReturnValue({
        encryptionKey: mockEncryptionKey,
        isLoggedIn: true,
      });

      const inputData = {
        companyName: "Test Company",
        roleName: "Software Engineer",
        jobPostingUrl: "https://example.com/job",
        notes: "Interesting position",
        appliedDate: "2023-12-01",
      };

      const expectedEncryptedData = {
        companyName: "encrypted_company_name",
        roleName: "encrypted_role_name",
        jobPostingUrl: "encrypted_job_url",
        notes: "encrypted_notes",
        appliedDate: "encrypted_applied_date",
        createdAt: "encrypted_created_at",
        updatedAt: "encrypted_updated_at",
        events: [
          {
            id: expect.any(String),
            title: "encrypted_event_title",
            description: "encrypted_event_description",
            date: "encrypted_event_date",
          },
        ],
      };

      mockEncryptFields.mockImplementation(
        async (data: any, key: CryptoKey, entityType: string) => {
          if (entityType === "JobApplication") {
            return {
              ...data,
              companyName: "encrypted_company_name",
              roleName: "encrypted_role_name",
              jobPostingUrl: "encrypted_job_url",
              notes: "encrypted_notes",
              appliedDate: "encrypted_applied_date",
              createdAt: "encrypted_created_at",
              updatedAt: "encrypted_updated_at",
            };
          } else if (entityType === "ApplicationEvent") {
            return {
              ...data,
              title: "encrypted_event_title",
              description: "encrypted_event_description",
              date: "encrypted_event_date",
            };
          }
          return data;
        },
      );

      (fetch as any).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            application: { _id: "123", ...expectedEncryptedData },
          }),
      });

      // Create test component that calls createApplication
      function CreateTestComponent() {
        const services = useServices();

        const handleCreate = async () => {
          const result = await services.applications.create(inputData);
          const resultDiv = document.createElement("div");
          resultDiv.textContent = JSON.stringify(result);
          resultDiv.setAttribute("data-testid", "create-result");
          document.body.appendChild(resultDiv);
        };

        return (
          <button onClick={handleCreate} data-testid="create-button">
            Create Application
          </button>
        );
      }

      render(
        <ServicesProvider>
          <CreateTestComponent />
        </ServicesProvider>,
      );

      const button = screen.getByTestId("create-button");
      button.click();

      await waitFor(() => {
        const result = document.querySelector('[data-testid="create-result"]');
        expect(result).toBeInTheDocument();
      });

      // Verify timestamps were injected before encryption
      expect(mockEncryptFields).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: "Test Company",
          roleName: "Software Engineer",
          createdAt: mockDate,
          updatedAt: mockDate,
          events: expect.arrayContaining([
            expect.objectContaining({
              title: "Application submitted",
              description: "Interesting position",
              date: "2023-12-01",
            }),
          ]),
        }),
        mockEncryptionKey,
        "JobApplication",
      );

      // Verify events were encrypted separately
      expect(mockEncryptFields).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Application submitted",
          description: "Interesting position",
          date: "2023-12-01",
        }),
        mockEncryptionKey,
        "ApplicationEvent",
      );

      // Verify encrypted data was sent to API
      expect(fetch).toHaveBeenCalledWith(
        "/api/applications/create",
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData),
        }),
      );
    });

    it("should handle missing encryption key gracefully", async () => {
      mockUseAuth.mockReturnValue({
        encryptionKey: null,
        isLoggedIn: true,
      });

      function CreateTestComponent() {
        const services = useServices();

        const handleCreate = async () => {
          try {
            await services.applications.create({
              companyName: "Test Company",
              roleName: "Engineer",
            });
          } catch (error) {
            const resultDiv = document.createElement("div");
            resultDiv.textContent = (error as Error).message;
            resultDiv.setAttribute("data-testid", "error-result");
            document.body.appendChild(resultDiv);
          }
        };

        return (
          <button onClick={handleCreate} data-testid="create-button">
            Create Application
          </button>
        );
      }

      render(
        <ServicesProvider>
          <CreateTestComponent />
        </ServicesProvider>,
      );

      const button = screen.getByTestId("create-button");
      button.click();

      await waitFor(() => {
        const result = document.querySelector('[data-testid="error-result"]');
        expect(result).toBeInTheDocument();
        expect(result?.textContent).toContain("Encryption key not available");
      });
    });

    it("should properly format encrypted data for API submission", async () => {
      const mockEncryptionKey = {} as CryptoKey;

      mockUseAuth.mockReturnValue({
        encryptionKey: mockEncryptionKey,
        isLoggedIn: true,
      });

      mockEncryptFields.mockImplementation(async (data: any) => ({
        ...data,
        companyName: "base64_encrypted_company_name==",
        roleName: "base64_encrypted_role_name==",
      }));

      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, application: {} }),
      });

      function CreateTestComponent() {
        const services = useServices();

        const handleCreate = async () => {
          await services.applications.create({
            companyName: "Test Company",
            roleName: "Engineer",
            jobBoard: "LinkedIn",
            applicationType: "cold",
          });
        };

        return (
          <button onClick={handleCreate} data-testid="create-button">
            Create Application
          </button>
        );
      }

      render(
        <ServicesProvider>
          <CreateTestComponent />
        </ServicesProvider>,
      );

      const button = screen.getByTestId("create-button");
      button.click();

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      // Verify FormData contains encrypted values
      const fetchCall = (fetch as any).mock.calls[0];
      const formData = fetchCall[1].body as FormData;

      expect(formData.get("companyName")).toBe(
        "base64_encrypted_company_name==",
      );
      expect(formData.get("roleName")).toBe("base64_encrypted_role_name==");
      expect(formData.get("jobBoard")).toBe("LinkedIn"); // Unencrypted reference data
      expect(formData.get("applicationType")).toBe("cold"); // Unencrypted enum
    });
  });
});
