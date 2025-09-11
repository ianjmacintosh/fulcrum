import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { JobApplication } from "../db/schemas";
import { decryptFields, isDataEncrypted } from "../services/encryption-service";
import { useAuth } from "../hooks/useAuth";

interface ApplicationsContextType {
  applications: JobApplication[];
  isLoading: boolean;
  error: string | null;
  decryptionError: string | null;
  refreshApplications: () => Promise<void>;
  getApplication: (id: string) => JobApplication | null;
}

const ApplicationsContext = createContext<ApplicationsContextType | null>(null);

interface ApplicationsProviderProps {
  children: ReactNode;
}

export function ApplicationsProvider({ children }: ApplicationsProviderProps) {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  const { encryptionKey, isLoggedIn } = useAuth();

  const decryptApplications = async (
    rawApplications: JobApplication[],
  ): Promise<JobApplication[]> => {
    if (rawApplications.length === 0) {
      return rawApplications;
    }

    // Check if any application has encrypted data
    const hasEncryptedData = rawApplications.some((app) =>
      isDataEncrypted(app, "JobApplication"),
    );

    if (!hasEncryptedData) {
      // No encrypted data, use applications as-is
      setDecryptionError(null);
      return rawApplications;
    }

    if (!encryptionKey) {
      // Need encryption key but don't have it
      setDecryptionError(
        "Encryption key not available. Please log out and log back in to decrypt your data.",
      );
      return rawApplications; // Return encrypted data as fallback
    }

    try {
      // Decrypt all applications
      const decryptedApps = await Promise.all(
        rawApplications.map(async (app) => {
          try {
            return await decryptFields(app, encryptionKey, "JobApplication");
          } catch (error) {
            console.warn(`Failed to decrypt application ${app._id}:`, error);
            // Return original app if decryption fails (backward compatibility)
            return app;
          }
        }),
      );

      setDecryptionError(null);
      return decryptedApps;
    } catch (error) {
      console.error("Decryption failed:", error);
      setDecryptionError("Failed to decrypt application data.");
      return rawApplications; // Return encrypted data as fallback
    }
  };

  const fetchApplications = async (): Promise<void> => {
    if (!isLoggedIn) {
      setApplications([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

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

      const decryptedApplications = await decryptApplications(
        result.applications,
      );
      setApplications(decryptedApplications);
    } catch (err) {
      console.error("Failed to fetch applications:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch applications",
      );
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-decrypt applications when encryption key changes
  useEffect(() => {
    const reDecryptApplications = async () => {
      if (applications.length > 0) {
        const decryptedApplications = await decryptApplications(applications);
        setApplications(decryptedApplications);
      }
    };

    reDecryptApplications();
  }, [encryptionKey]);

  // Fetch applications when user logs in
  useEffect(() => {
    fetchApplications();
  }, [isLoggedIn]);

  const getApplication = (id: string): JobApplication | null => {
    return applications.find((app) => app._id?.toString() === id) || null;
  };

  const refreshApplications = async (): Promise<void> => {
    await fetchApplications();
  };

  const value: ApplicationsContextType = {
    applications,
    isLoading,
    error,
    decryptionError,
    refreshApplications,
    getApplication,
  };

  return (
    <ApplicationsContext.Provider value={value}>
      {children}
    </ApplicationsContext.Provider>
  );
}

export function useApplications(): ApplicationsContextType {
  const context = useContext(ApplicationsContext);
  if (!context) {
    throw new Error(
      "useApplications must be used within an ApplicationsProvider",
    );
  }
  return context;
}

export { ApplicationsContext };
