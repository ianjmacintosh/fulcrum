import { describe, test, expect, vi } from "vitest";
import {
  handleImportResponse,
  handleImportError,
  getErrorDisplayMessage,
  isRetryableError,
  requiresRefresh,
  ImportError,
  ImportErrorInfo,
} from "./import-error-handling";

describe("Import Error Handling", () => {
  describe("handleImportResponse", () => {
    test("should return JSON for successful response", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      } as unknown as Response;

      const result = await handleImportResponse(mockResponse);
      expect(result).toEqual({ success: true });
    });

    test("should throw validation error for 400 status", async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({}),
      } as unknown as Response;

      await expect(handleImportResponse(mockResponse)).rejects.toThrow(
        "Invalid data provided",
      );
      await expect(handleImportResponse(mockResponse)).rejects.toHaveProperty(
        "type",
        "validation",
      );
    });

    test("should throw authentication error for 401 status", async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({}),
      } as unknown as Response;

      await expect(handleImportResponse(mockResponse)).rejects.toThrow(
        "Authentication failed",
      );
      await expect(handleImportResponse(mockResponse)).rejects.toHaveProperty(
        "type",
        "authentication",
      );
    });

    test("should throw authentication error for 403 status", async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        json: vi.fn().mockResolvedValue({}),
      } as unknown as Response;

      await expect(handleImportResponse(mockResponse)).rejects.toThrow(
        "Authentication failed",
      );
      await expect(handleImportResponse(mockResponse)).rejects.toHaveProperty(
        "type",
        "authentication",
      );
    });

    test("should throw server error for 500+ status", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({}),
      } as unknown as Response;

      await expect(handleImportResponse(mockResponse)).rejects.toThrow(
        "Server error occurred",
      );
      await expect(handleImportResponse(mockResponse)).rejects.toHaveProperty(
        "type",
        "server",
      );
    });

    test("should throw unknown error for other error status", async () => {
      const mockResponse = {
        ok: false,
        status: 418, // I'm a teapot
        json: vi.fn().mockResolvedValue({}),
      } as unknown as Response;

      await expect(handleImportResponse(mockResponse)).rejects.toThrow(
        "Import failed with status 418",
      );
      await expect(handleImportResponse(mockResponse)).rejects.toHaveProperty(
        "type",
        "unknown",
      );
    });
  });

  describe("handleImportError", () => {
    test("should handle network/fetch errors", () => {
      const networkError = new TypeError("Failed to fetch");
      const result = handleImportError(networkError);

      expect(result).toEqual({
        type: "network",
        message: "Network error. Please check your connection and try again.",
        details: "Failed to fetch",
      });
    });

    test("should handle timeout errors", () => {
      const timeoutError = { name: "AbortError", message: "Request aborted" };
      const result = handleImportError(timeoutError);

      expect(result).toEqual({
        type: "timeout",
        message: "Request timed out. Please try again.",
        details: "Request aborted",
      });
    });

    test("should handle CSRF errors", () => {
      const csrfError = { message: "Invalid CSRF token" };
      const result = handleImportError(csrfError);

      expect(result).toEqual({
        type: "csrf",
        message:
          "Security token expired. Please refresh the page and try again.",
        details: "Invalid CSRF token",
      });
    });

    test("should pass through structured ImportError", () => {
      const structuredError = {
        type: "validation",
        message: "Custom validation error",
        details: { field: "companyName" },
      };

      const result = handleImportError(structuredError);
      expect(result).toEqual(structuredError);
    });

    test("should handle unknown errors", () => {
      const unknownError = new Error("Something went wrong");
      const result = handleImportError(unknownError);

      expect(result).toEqual({
        type: "unknown",
        message: "An unexpected error occurred. Please try again.",
        details: "Something went wrong",
      });
    });

    test("should handle non-Error objects", () => {
      const stringError = "String error";
      const result = handleImportError(stringError);

      expect(result).toEqual({
        type: "unknown",
        message: "An unexpected error occurred. Please try again.",
        details: "String error",
      });
    });
  });

  describe("ImportError class", () => {
    test("should create structured error with type and message", () => {
      const error = new ImportError("validation", "Test validation error", {
        field: "test",
      });

      expect(error.type).toBe("validation");
      expect(error.message).toBe("Test validation error");
      expect(error.details).toEqual({ field: "test" });
      expect(error.name).toBe("ImportError");
    });
  });

  describe("getErrorDisplayMessage", () => {
    test("should return specific messages for each error type", () => {
      expect(
        getErrorDisplayMessage({ type: "network", message: "Network error" }),
      ).toBe(
        "Network connection failed. Please check your internet connection and try again.",
      );

      expect(
        getErrorDisplayMessage({ type: "timeout", message: "Timeout" }),
      ).toBe("The request took too long to complete. Please try again.");

      expect(
        getErrorDisplayMessage({
          type: "authentication",
          message: "Auth error",
        }),
      ).toBe(
        "Your session has expired. Please refresh the page and try again.",
      );

      expect(
        getErrorDisplayMessage({ type: "csrf", message: "CSRF error" }),
      ).toBe(
        "Security verification failed. Please refresh the page and try again.",
      );

      expect(
        getErrorDisplayMessage({ type: "server", message: "Server error" }),
      ).toBe("Server error occurred. Please try again in a few moments.");

      expect(
        getErrorDisplayMessage({ type: "unknown", message: "Unknown error" }),
      ).toBe(
        "Import failed. Please try again or contact support if the problem persists.",
      );
    });

    test("should return custom message for validation errors", () => {
      const validationError: ImportErrorInfo = {
        type: "validation",
        message: "Company name is required for all rows",
      };

      expect(getErrorDisplayMessage(validationError)).toBe(
        "Company name is required for all rows",
      );
    });
  });

  describe("isRetryableError", () => {
    test("should return true for retryable errors", () => {
      expect(isRetryableError({ type: "network", message: "" })).toBe(true);
      expect(isRetryableError({ type: "timeout", message: "" })).toBe(true);
      expect(isRetryableError({ type: "server", message: "" })).toBe(true);
      expect(isRetryableError({ type: "unknown", message: "" })).toBe(true);
    });

    test("should return false for non-retryable errors", () => {
      expect(isRetryableError({ type: "authentication", message: "" })).toBe(
        false,
      );
      expect(isRetryableError({ type: "csrf", message: "" })).toBe(false);
      expect(isRetryableError({ type: "validation", message: "" })).toBe(false);
    });
  });

  describe("requiresRefresh", () => {
    test("should return true for errors requiring refresh", () => {
      expect(requiresRefresh({ type: "authentication", message: "" })).toBe(
        true,
      );
      expect(requiresRefresh({ type: "csrf", message: "" })).toBe(true);
    });

    test("should return false for errors not requiring refresh", () => {
      expect(requiresRefresh({ type: "network", message: "" })).toBe(false);
      expect(requiresRefresh({ type: "timeout", message: "" })).toBe(false);
      expect(requiresRefresh({ type: "server", message: "" })).toBe(false);
      expect(requiresRefresh({ type: "validation", message: "" })).toBe(false);
      expect(requiresRefresh({ type: "unknown", message: "" })).toBe(false);
    });
  });
});
