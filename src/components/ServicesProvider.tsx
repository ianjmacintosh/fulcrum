import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { MongoClient } from "mongodb";
import { ApplicationService } from "../db/services/applications";
import { WorkflowService } from "../db/services/workflows";
import { JobBoardService } from "../db/services/job-boards";
import { ServicesContext } from "../router";

/**
 * Provider that initializes database services and syncs them with TanStack Router Context
 */
export function ServicesProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // Initialize services with database client
    const initServices = async () => {
      // Create database connection
      const MONGODB_URI =
        process.env.MONGO_URL ||
        process.env.MONGODB_URI ||
        process.env.DATABASE_URL ||
        process.env.MONGO_PUBLIC_URL ||
        "mongodb://localhost:27017/fulcrum";

      const client = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        maxPoolSize: 10,
      });

      await client.connect();
      const db = client.db("fulcrum");

      const services: ServicesContext = {
        applicationService: new ApplicationService(db),
        workflowService: new WorkflowService(db),
        jobBoardService: new JobBoardService(db),
      };

      // Update router context with services
      router.update({
        context: {
          auth: {
            user: null,
            userType: null,
            authenticated: false,
            session: null,
          },
          services,
        },
      });
    };

    initServices().catch(console.error);
  }, [router]);

  return <>{children}</>;
}
