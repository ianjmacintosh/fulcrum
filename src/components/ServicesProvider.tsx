import { useMemo, useContext } from "react";
import {
  ServicesContext,
  ClientServices,
  CreateApplicationData,
  ApplicationResponse,
} from "../contexts/ServicesContext";
import { AuthContext } from "../contexts/AuthContext";
import {
  encryptFields,
  decryptFields,
  isDataEncrypted,
} from "../services/encryption-service";
import { useAuth } from "../hooks/useAuth";
import { fetchCSRFTokens } from "../utils/csrf-client";
import { ApplicationsContext } from "../contexts/ApplicationsContext";

/**
 * ServicesProvider with HTTP handling and automatic encryption
 */
export function ServicesProvider({ children }: { children: React.ReactNode }) {
  const { encryptionKey, isLoggedIn, isLoading } = useAuth();

  // Helper function to inject timestamps and create events
  const prepareApplicationData = (data: CreateApplicationData) => {
    const now = new Date().toISOString();
    return {
      ...data,
      createdAt: now,
      updatedAt: now,
      events: data.appliedDate
        ? [
            {
              id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
              title: "Application submitted",
              description: data.notes || "Applied to position",
              date: data.appliedDate,
            },
          ]
        : [],
    };
  };

  // Helper function to encrypt application data including nested events
  const encryptApplicationData = async (data: any) => {
    // Encrypt main application fields
    const encryptedData = await encryptFields(
      data,
      encryptionKey!,
      "JobApplication",
    );

    // Encrypt events separately if they exist
    if (encryptedData.events && encryptedData.events.length > 0) {
      encryptedData.events = await Promise.all(
        encryptedData.events.map(
          async (event: any) =>
            await encryptFields(event, encryptionKey!, "ApplicationEvent"),
        ),
      );
    }

    return encryptedData;
  };

  // Helper function to create FormData for API submission
  const createFormData = (
    encryptedData: any,
    originalData: CreateApplicationData,
    csrfTokens: any,
  ) => {
    const formData = new FormData();

    // Add encrypted sensitive fields
    formData.append("companyName", encryptedData.companyName || "");
    formData.append("roleName", encryptedData.roleName || "");
    formData.append("jobPostingUrl", encryptedData.jobPostingUrl || "");
    formData.append("appliedDate", encryptedData.appliedDate || "");
    formData.append("notes", encryptedData.notes || "");

    // Add encrypted timestamps
    formData.append("createdAt", encryptedData.createdAt || "");
    formData.append("updatedAt", encryptedData.updatedAt || "");

    // Add unencrypted reference data
    formData.append("jobBoard", originalData.jobBoard || "");
    formData.append("applicationType", originalData.applicationType || "cold");
    formData.append("roleType", originalData.roleType || "engineer");
    formData.append("locationType", originalData.locationType || "remote");

    // Add CSRF tokens
    formData.append("csrf_token", csrfTokens.csrfToken);
    formData.append("csrf_hash", csrfTokens.csrfHash);

    return formData;
  };

  // Create application with automatic timestamp injection and encryption

  const createApplication = async (
    data: CreateApplicationData,
  ): Promise<ApplicationResponse> => {
    // Check if encryption key is available
    if (!encryptionKey) {
      throw new Error(
        "Encryption key not available. Please log out and log back in.",
      );
    }

    try {
      // Get CSRF tokens for security
      const csrfTokens = await fetchCSRFTokens();

      // Prepare data with timestamps and events
      const preparedData = prepareApplicationData(data);

      // Encrypt all sensitive fields
      const encryptedData = await encryptApplicationData(preparedData);

      // Create form data for API submission
      const formData = createFormData(encryptedData, data, csrfTokens);

      // Submit to API
      const response = await fetch("/api/applications/create", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to create application");
      }

      return {
        success: true,
        application: result.application,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        application: null,
      } as ApplicationResponse;
    }
  };

  const services = useMemo(() => {
    // List applications with automatic decryption
    const listApplications = async () => {
      try {
        // Fetch applications from API
        const response = await fetch("/api/applications/", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch applications");
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error("Applications API returned error");
        }

        const rawApplications = result.applications || [];

        if (encryptionKey && rawApplications.length > 0) {
          // Check if any application has encrypted data
          const hasEncryptedData = rawApplications.some((app: any) =>
            isDataEncrypted(app, "JobApplication"),
          );

          if (hasEncryptedData) {
            // Decrypt all applications
            const decryptedApps = await Promise.all(
              rawApplications.map(async (app: any) => {
                try {
                  // Decrypt main application fields
                  const decryptedApp = await decryptFields(
                    app,
                    encryptionKey,
                    "JobApplication",
                  );

                  // Also decrypt events if they exist and are encrypted
                  if (
                    decryptedApp.events &&
                    Array.isArray(decryptedApp.events) &&
                    decryptedApp.events.length > 0
                  ) {
                    decryptedApp.events = await Promise.all(
                      decryptedApp.events.map(async (event: any) => {
                        try {
                          // Check if event has encrypted data
                          if (isDataEncrypted(event, "ApplicationEvent")) {
                            return await decryptFields(
                              event,
                              encryptionKey,
                              "ApplicationEvent",
                            );
                          }
                          return event;
                        } catch (error) {
                          console.warn(
                            `Failed to decrypt event ${event.id}:`,
                            error,
                          );
                          return event;
                        }
                      }),
                    );
                  }

                  return decryptedApp;
                } catch (error) {
                  console.warn(
                    `Failed to decrypt application ${app._id}:`,
                    error,
                  );
                  // Return original app if decryption fails (backward compatibility)
                  return app;
                }
              }),
            );
            console.log(
              `Returning ${decryptedApps.length} decrypted applications`,
            );
            console.log(decryptedApps);
            return {
              success: true,
              applications: decryptedApps,
            };
          }
        }

        // Return unencrypted data or if no encryption key
        return {
          success: true,
          applications: rawApplications,
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch applications",
          applications: [],
        };
      }
    };

    return {
      applications: {
        list: listApplications,
        create: createApplication,
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
    };
  }, [encryptionKey, isLoggedIn]); // Re-create services when auth state changes

  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
}
