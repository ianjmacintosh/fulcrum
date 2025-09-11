import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ServicesProvider } from "./ServicesProvider";
import { useServices } from "../contexts/ServicesContext";
import { useAuth } from "../hooks/useAuth";
import * as encryptionService from "../services/encryption-service";

// Mock dependencies
vi.mock("../hooks/useAuth");
vi.mock("../services/encryption-service");

// Mock fetch
global.fetch = vi.fn();

const mockUseAuth = useAuth as any;
const mockEncryptFields = encryptionService.encryptFields as any;
const mockDecryptFields = encryptionService.decryptFields as any;
const mockIsDataEncrypted = encryptionService.isDataEncrypted as any;

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
      method: "GET",
      credentials: "include",
    });

    // Verify no encryption/decryption was attempted
    expect(mockEncryptFields).not.toHaveBeenCalled();
    expect(mockDecryptFields).not.toHaveBeenCalled();
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
      expect(result?.textContent).toContain("API Error: 500");
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
});
