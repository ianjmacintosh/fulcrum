// Client-side CSRF utilities (browser-safe)

export interface CSRFTokens {
  csrfToken: string;
  csrfHash: string;
}

/**
 * Fetch CSRF tokens from the server
 * @returns Promise resolving to CSRF token data
 */
export async function fetchCSRFTokens(): Promise<CSRFTokens> {
  try {
    // Call the server function through TanStack Start's client-side mechanism
    // Server functions are automatically available as callable functions on the client
    const { getCSRFTokens } = await import("../server/admin-auth");

    // In TanStack Start, we can call server functions from client code like this
    const result = await getCSRFTokens();

    if (!result || !result.success || !result.csrfToken || !result.csrfHash) {
      throw new Error((result as any)?.error || "Failed to fetch CSRF tokens");
    }

    return {
      csrfToken: result.csrfToken,
      csrfHash: result.csrfHash,
    };
  } catch (error) {
    console.error("Failed to fetch CSRF tokens:", error);
    throw error;
  }
}
