import { MongoClient } from "mongodb";
import { ApplicationService } from "../db/services/applications";
import { WorkflowService } from "../db/services/workflows";
import { JobBoardService } from "../db/services/job-boards";
import type { ServicesContext } from "../router";

/**
 * Factory to create services with dependency injection for server-side use
 */
export async function createServices(): Promise<ServicesContext> {
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

  return {
    applicationService: new ApplicationService(db),
    workflowService: new WorkflowService(db),
    jobBoardService: new JobBoardService(db),
  };
}
