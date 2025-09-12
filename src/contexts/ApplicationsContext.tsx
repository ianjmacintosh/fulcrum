import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { JobApplication } from "../db/schemas";
import { useServices } from "./ServicesContext";
import { useAuth } from "../hooks/useAuth";

interface ApplicationsContextType {
  applications: JobApplication[];
  isLoading: boolean;
  error: string | null;
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
  const services = useServices();
  const { isLoading: authLoading } = useAuth();

  const fetchApplications = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Use ServicesProvider instead of direct fetch
      // ServicesProvider handles encryption/decryption transparently
      const result = await services.applications.list();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch applications");
      }

      setApplications(result.applications || []);
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

  // Fetch applications only after authentication is complete
  useEffect(() => {
    if (!authLoading) {
      fetchApplications();
    }
  }, [authLoading]);

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
