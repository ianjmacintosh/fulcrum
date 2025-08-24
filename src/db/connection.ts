import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// MongoDB connection string - Railway provides different URLs for different contexts
const MONGODB_URI =
  process.env.MONGO_URL || // Railway private endpoint (preferred)
  process.env.MONGODB_URI || // Legacy local development
  process.env.DATABASE_URL || // Alternative Railway variable
  process.env.MONGO_PUBLIC_URL || // Railway public endpoint (fallback)
  "mongodb://localhost:27017/fulcrum"; // Local MongoDB fallback

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  if (!client) {
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      maxPoolSize: 10,
    });
    await client.connect();
  }

  db = client.db("fulcrum");
  return db;
}

export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  await closeDatabaseConnection();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeDatabaseConnection();
  process.exit(0);
});
