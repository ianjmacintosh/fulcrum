import { createServerFn } from "@tanstack/react-start";
import { generateCSRFToken, createCSRFHash } from "../utils/csrf-server";

// Generate CSRF tokens (server function)
export const getCSRFTokens = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const { token, secret } = generateCSRFToken();
      const hash = createCSRFHash(token, secret);

      return {
        success: true,
        csrfToken: token,
        csrfHash: hash,
      };
    } catch {
      return {
        success: false,
        error: "Failed to generate CSRF token",
      };
    }
  },
);
