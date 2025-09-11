import { useMemo, useContext } from "react";
import {
  ServicesContext,
  ClientServices,
  CreateApplicationData,
} from "../contexts/ServicesContext";
import { AuthContext } from "../contexts/AuthContext";
import {
  encryptFields,
  decryptFields,
  isDataEncrypted,
} from "../services/encryption-service";

/**
 * Lightweight ServicesProvider - services will be added back gradually
 * For now, focusing on performance by avoiding heavy initialization
 */
export function ServicesProvider({ children }: { children: React.ReactNode }) {
  // Provide a minimal, non-blocking services context
  const emptyServices = useMemo(
    () => ({
      applications: {
        list: async () => ({
          success: false,
          error: "Services not implemented yet",
        }),
        create: async () => ({
          success: false,
          error: "Services not implemented yet",
        }),
        createBulk: async () => ({
          success: false,
          error: "Services not implemented yet",
        }),
        get: async () => ({
          success: false,
          error: "Services not implemented yet",
        }),
        update: async () => ({
          success: false,
          error: "Services not implemented yet",
        }),
        delete: async () => ({
          success: false,
          error: "Services not implemented yet",
        }),
        createEvent: async () => ({
          success: false,
          error: "Services not implemented yet",
        }),
      },
      analytics: {
        dashboard: async () => ({
          success: false,
          error: "Services not implemented yet",
        }),
        projection: async () => ({
          success: false,
          error: "Services not implemented yet",
        }),
      },
      jobBoards: {
        list: async () => ({
          success: false,
          error: "Services not implemented yet",
        }),
        create: async () => ({
          success: false,
          error: "Services not implemented yet",
        }),
      },
    }),
    [],
  );

  return (
    <ServicesContext.Provider value={emptyServices}>
      {children}
    </ServicesContext.Provider>
  );
}
