import { Db, Collection, ObjectId } from "mongodb";
import { connectToDatabase } from "../connection";
import {
  JobApplication,
  JobApplicationSchema,
  CurrentStatus,
} from "../schemas";

export class ApplicationService {
  private db: Db | null = null;
  private collection: Collection<JobApplication> | null = null;

  private async getCollection(): Promise<Collection<JobApplication>> {
    if (!this.collection) {
      this.db = await connectToDatabase();
      this.collection = this.db.collection<JobApplication>("applications");
    }
    return this.collection;
  }

  async createApplication(
    application: Omit<JobApplication, "_id" | "createdAt" | "updatedAt">,
  ): Promise<JobApplication> {
    const collection = await this.getCollection();

    const newApplication: JobApplication = {
      ...application,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate with Zod (excluding _id since MongoDB will generate it)
    const validationResult = JobApplicationSchema.safeParse({
      ...newApplication,
      createdAt: newApplication.createdAt,
      updatedAt: newApplication.updatedAt,
    });

    if (!validationResult.success) {
      throw new Error(`Validation error: ${validationResult.error.message}`);
    }

    const result = await collection.insertOne(newApplication);
    return { ...newApplication, _id: result.insertedId };
  }

  // Batch create multiple applications efficiently
  async createApplicationsBatch(
    applications: Array<
      Omit<JobApplication, "_id" | "createdAt" | "updatedAt">
    >,
  ): Promise<JobApplication[]> {
    if (applications.length === 0) {
      return [];
    }

    const collection = await this.getCollection();
    const now = new Date();

    const newApplications: JobApplication[] = applications.map(
      (application) => ({
        ...application,
        createdAt: now,
        updatedAt: now,
      }),
    );

    // Validate all applications before inserting
    for (const [index, application] of newApplications.entries()) {
      const validationResult = JobApplicationSchema.safeParse({
        ...application,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
      });

      if (!validationResult.success) {
        throw new Error(
          `Validation error for application ${index} (${application.companyName} - ${application.roleName}): ${validationResult.error.message}`,
        );
      }
    }

    // Insert all applications at once
    const result = await collection.insertMany(newApplications);

    // Return applications with their generated IDs
    return newApplications.map((application, index) => ({
      ...application,
      _id: result.insertedIds[index],
    }));
  }

  // Helper to extract unique job board names from application data
  getUniqueJobBoards(applications: Array<{ jobBoard?: string }>): string[] {
    const jobBoardNames = applications
      .map((app) => app.jobBoard || "General")
      .filter((name) => name.trim() !== "");

    return [...new Set(jobBoardNames)];
  }

  async getApplications(
    userId: string,
    filter: any = {},
    limit: number = 100,
    skip: number = 0,
  ): Promise<JobApplication[]> {
    const collection = await this.getCollection();
    const userFilter = { ...filter, userId };
    return await collection
      .find(userFilter)
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 })
      .toArray();
  }

  async getApplicationById(
    userId: string,
    id: string | ObjectId,
  ): Promise<JobApplication | null> {
    const collection = await this.getCollection();

    try {
      // Convert string to ObjectId if needed
      const objectId = typeof id === "string" ? new ObjectId(id) : id;
      return await collection.findOne({ _id: objectId, userId });
    } catch {
      // Return null if ObjectId conversion fails or query fails
      return null;
    }
  }

  async updateApplication(
    userId: string,
    id: string | ObjectId,
    updates: Partial<JobApplication>,
  ): Promise<JobApplication | null> {
    const collection = await this.getCollection();

    const updateDoc = {
      ...updates,
      updatedAt: new Date(),
    };

    delete updateDoc._id; // Don't update the _id field
    delete updateDoc.userId; // Don't allow userId to be changed

    try {
      // Convert string to ObjectId if needed
      const objectId = typeof id === "string" ? new ObjectId(id) : id;
      const result = await collection.findOneAndUpdate(
        { _id: objectId, userId },
        { $set: updateDoc },
        { returnDocument: "after" },
      );
      return result;
    } catch {
      // Return null if ObjectId conversion fails or query fails
      return null;
    }
  }

  async deleteApplication(
    userId: string,
    id: string | ObjectId,
  ): Promise<boolean> {
    const collection = await this.getCollection();

    try {
      const objectId = typeof id === "string" ? new ObjectId(id) : id;

      const result = await collection.deleteOne({ _id: objectId, userId });
      return result.deletedCount === 1;
    } catch {
      // Invalid ObjectId format
      return false;
    }
  }

  async getApplicationCount(userId: string, filter: any = {}): Promise<number> {
    const collection = await this.getCollection();
    const userFilter = { ...filter, userId };
    return await collection.countDocuments(userFilter);
  }

  // Analytics helper methods
  async getApplicationsByStatus(
    userId: string,
    statusId: string,
  ): Promise<JobApplication[]> {
    const collection = await this.getCollection();
    return await collection
      .find({ userId, "currentStatus.id": statusId })
      .toArray();
  }

  async getApplicationsByWorkflow(
    userId: string,
    workflowId: string,
  ): Promise<JobApplication[]> {
    const collection = await this.getCollection();
    return await collection
      .find({ userId, "workflow.id": workflowId })
      .toArray();
  }

  async getApplicationsInDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<JobApplication[]> {
    const collection = await this.getCollection();
    return await collection
      .find({
        userId,
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .toArray();
  }

  async getApplicationsWithPhoneScreens(
    userId: string,
  ): Promise<JobApplication[]> {
    const collection = await this.getCollection();
    return await collection
      .find({
        userId,
        "events.statusId": { $in: ["phone_screen"] },
      })
      .toArray();
  }

  async getApplicationsWithStatus(
    userId: string,
    statusIds: string[],
  ): Promise<JobApplication[]> {
    const collection = await this.getCollection();
    return await collection
      .find({
        userId,
        "currentStatus.id": { $in: statusIds },
      })
      .toArray();
  }

  // Admin methods (bypass user scoping)
  async getAllApplicationsForUser(userId: string): Promise<JobApplication[]> {
    const collection = await this.getCollection();
    return await collection.find({ userId }).toArray();
  }

  async deleteAllApplicationsForUser(userId: string): Promise<number> {
    const collection = await this.getCollection();
    const result = await collection.deleteMany({ userId });
    return result.deletedCount;
  }

  /**
   * Calculate current status based on status date fields
   * Uses the latest status date to determine current status according to the 6-state workflow
   */
  calculateCurrentStatus(application: Partial<JobApplication>): CurrentStatus {
    const statusDates = [
      {
        date: application.declinedDate,
        status: { id: "declined", name: "Declined" },
        priority: 7,
      },
      {
        date: application.acceptedDate,
        status: { id: "accepted", name: "Accepted" },
        priority: 6,
      },
      {
        date: application.round2Date,
        status: { id: "round_2", name: "Round 2" },
        priority: 5,
      },
      {
        date: application.round1Date,
        status: { id: "round_1", name: "Round 1" },
        priority: 4,
      },
      {
        date: application.phoneScreenDate,
        status: { id: "phone_screen", name: "Phone Screen" },
        priority: 3,
      },
      {
        date: application.appliedDate,
        status: { id: "applied", name: "Applied" },
        priority: 2,
      },
    ];

    // Find the latest status date, with higher priority for equal dates
    let latestStatus = { id: "not_applied", name: "Not Applied" };
    let latestDate: Date | null = null;
    let latestPriority = 0;

    for (const { date, status, priority } of statusDates) {
      if (date) {
        const statusDate = new Date(date);
        // Skip invalid dates
        if (isNaN(statusDate.getTime())) {
          continue;
        }

        // Update if this date is later, or if same date but higher priority
        if (
          !latestDate ||
          statusDate > latestDate ||
          (statusDate.getTime() === latestDate.getTime() &&
            priority > latestPriority)
        ) {
          latestStatus = status;
          latestDate = statusDate;
          latestPriority = priority;
        }
      }
    }

    return latestStatus;
  }

  /**
   * Update application with automatic current status calculation
   */
  async updateApplicationWithStatusCalculation(
    userId: string,
    id: string | ObjectId,
    updates: Partial<JobApplication>,
  ): Promise<JobApplication | null> {
    const collection = await this.getCollection();

    // First get the current application to merge with updates
    let currentApplication: any = null;

    try {
      // Convert string to ObjectId if needed
      const objectId = typeof id === "string" ? new ObjectId(id) : id;
      currentApplication = await collection.findOne({ _id: objectId, userId });
    } catch {
      // Return null if ObjectId conversion fails
      return null;
    }

    if (!currentApplication) {
      return null;
    }

    // Merge current application with updates to get complete date fields
    const mergedApplication = { ...currentApplication, ...updates };

    // Calculate the new current status
    const newCurrentStatus = this.calculateCurrentStatus(mergedApplication);

    const updateDoc = {
      ...updates,
      currentStatus: newCurrentStatus,
      updatedAt: new Date(),
    };

    delete updateDoc._id; // Don't update the _id field
    delete updateDoc.userId; // Don't allow userId to be changed

    // Now update using the same ID format that worked for finding
    let result: any = null;

    try {
      // Convert string to ObjectId if needed
      const objectId = typeof id === "string" ? new ObjectId(id) : id;
      result = await collection.findOneAndUpdate(
        { _id: objectId, userId },
        { $set: updateDoc },
        { returnDocument: "after" },
      );
      return result;
    } catch {
      // Return null if ObjectId conversion fails or update fails
      return null;
    }
  }

  /**
   * Recalculate current status for all applications (for data migration)
   */
  async recalculateAllCurrentStatuses(userId?: string): Promise<number> {
    const collection = await this.getCollection();

    const filter = userId ? { userId } : {};
    const applications = await collection.find(filter).toArray();

    let updatedCount = 0;

    for (const application of applications) {
      const newCurrentStatus = this.calculateCurrentStatus(application);

      // Only update if the status has changed
      if (
        newCurrentStatus.id !== application.currentStatus?.id ||
        newCurrentStatus.name !== application.currentStatus?.name
      ) {
        await collection.updateOne(
          { _id: application._id },
          {
            $set: {
              currentStatus: newCurrentStatus,
              updatedAt: new Date(),
            },
          },
        );
        updatedCount++;
      }
    }

    return updatedCount;
  }
}

// Export singleton instance
export const applicationService = new ApplicationService();
