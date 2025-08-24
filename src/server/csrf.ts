import { createServerFn } from "@tanstack/react-start";
import { getCSRFTokenData } from "../utils/csrf-server";

// GET /api/csrf/token - Generate CSRF token for client use
export const getCSRFToken = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const tokenData = getCSRFTokenData();

      return {
        success: true,
        ...tokenData,
      };
    } catch (error) {
      console.error("CSRF token generation error:", error);
      throw new Error("Failed to generate CSRF token");
    }
  },
);
