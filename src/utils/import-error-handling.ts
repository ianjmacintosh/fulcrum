// Import error types and handling utilities

export interface ImportErrorInfo {
  type:
    | "network"
    | "validation"
    | "authentication"
    | "server"
    | "csrf"
    | "timeout"
    | "unknown";
  message: string;
  details?: any;
}

export class ImportError extends Error {
  constructor(
    public type: ImportErrorInfo["type"],
    message: string,
    public details?: any,
  ) {
    super(message);
    this.name = "ImportError";
  }
}

/**
 * Handles HTTP response errors and converts them to ImportError
 */
export async function handleImportResponse(response: Response): Promise<any> {
  if (!response.ok) {
    let errorMessage = `Import failed with status ${response.status}`;
    let errorType: ImportErrorInfo["type"] = "unknown";

    // Try to get error details from response
    let errorDetails;
    try {
      const responseData = await response.json();
      if (responseData.error) {
        errorMessage = responseData.error;
        errorDetails = responseData;
      }
    } catch {
      // Ignore JSON parsing errors, use default message
    }

    // Categorize errors by status code
    if (response.status === 400) {
      errorType = "validation";
      errorMessage =
        errorDetails?.error ||
        "Invalid data provided. Please check your input and try again.";
    } else if (response.status === 401 || response.status === 403) {
      errorType = "authentication";
      errorMessage =
        "Authentication failed. Please refresh the page and try again.";
    } else if (response.status >= 500) {
      errorType = "server";
      errorMessage = "Server error occurred. Please try again later.";
    }

    throw new ImportError(errorType, errorMessage, errorDetails);
  }

  return response.json();
}

/**
 * Converts any error into a structured ImportErrorInfo object
 */
export function handleImportError(error: any): ImportErrorInfo {
  // Handle network/fetch errors
  if (
    error instanceof TypeError &&
    (error.message.includes("fetch") ||
      error.message.includes("Failed to fetch"))
  ) {
    return {
      type: "network",
      message: "Network error. Please check your connection and try again.",
      details: error.message,
    };
  }

  // Handle timeout errors
  if (error.name === "AbortError" || error.message?.includes("timeout")) {
    return {
      type: "timeout",
      message: "Request timed out. Please try again.",
      details: error.message,
    };
  }

  // Handle CSRF errors
  if (
    error.message?.includes("CSRF") ||
    error.message?.includes("csrf") ||
    error.message?.includes("security token")
  ) {
    return {
      type: "csrf",
      message: "Security token expired. Please refresh the page and try again.",
      details: error.message,
    };
  }

  // Handle structured ImportError
  if (error instanceof ImportError) {
    return {
      type: error.type,
      message: error.message,
      details: error.details,
    };
  }

  // Handle already structured ImportErrorInfo
  if (error.type && error.message) {
    return error;
  }

  // Default to unknown error
  return {
    type: "unknown",
    message: "An unexpected error occurred. Please try again.",
    details: error.message || String(error),
  };
}

/**
 * Gets user-friendly error message based on error type
 */
export function getErrorDisplayMessage(error: ImportErrorInfo): string {
  switch (error.type) {
    case "network":
      return "Network connection failed. Please check your internet connection and try again.";
    case "timeout":
      return "The request took too long to complete. Please try again.";
    case "authentication":
      return "Your session has expired. Please refresh the page and try again.";
    case "csrf":
      return "Security verification failed. Please refresh the page and try again.";
    case "validation":
      return error.message; // Use the specific validation message from server
    case "server":
      return "Server error occurred. Please try again in a few moments.";
    default:
      return "Import failed. Please try again or contact support if the problem persists.";
  }
}

/**
 * Determines if an error is retryable by the user
 */
export function isRetryableError(error: ImportErrorInfo): boolean {
  return ["network", "timeout", "server", "unknown"].includes(error.type);
}

/**
 * Determines if an error requires page refresh
 */
export function requiresRefresh(error: ImportErrorInfo): boolean {
  return ["authentication", "csrf"].includes(error.type);
}
