import { Db, Collection, ObjectId } from "mongodb";
import { connectToDatabase } from "../connection";
import {
  JobApplication,
  JobApplicationSchema,
  CurrentStatus,
  ApplicationCreateData,
  ApplicationEvent,
} from "../schemas";

export class ApplicationService {
  private collection: Collection<JobApplication> | null = null;

  constructor(private dbClient: Db) {}

  private getCollection(): Collection<JobApplication> {
    if (!this.collection) {
      this.collection =
        this.dbClient.collection<JobApplication>("applications");
    }
    return this.collection;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  async createApplication(
    application: ApplicationCreateData,
  ): Promise<JobApplication> {
    const now = new Date();

    // Always generate "Application created" event
    const createdEvent: ApplicationEvent = {
      id: this.generateEventId(),
      title: "Application created",
      description: "Application tracking started",
      date: now.toISOString().split("T")[0],
    };

    const newApplication: JobApplication = {
      ...application,
      events: [...application.events, createdEvent],
      createdAt: now,
      updatedAt: now,
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

    // Store application as-is (client handles encryption)
    const collection = this.getCollection();
    const result = await collection.insertOne(newApplication);
    return { ...newApplication, _id: result.insertedId };
  }

  // Batch create multiple applications efficiently
  async createApplicationsBatch(
    applications: Array<ApplicationCreateData>,
  ): Promise<JobApplication[]> {
    if (applications.length === 0) {
      return [];
    }

    const now = new Date();

    const newApplications: JobApplication[] = applications.map(
      (application) => {
        // Always generate "Application created" event for batch operations too
        const createdEvent: ApplicationEvent = {
          id: this.generateEventId(),
          title: "Application created",
          description: "Application tracking started",
          date: now.toISOString().split("T")[0],
        };

        return {
          ...application,
          events: [...application.events, createdEvent],
          createdAt: now,
          updatedAt: now,
        };
      },
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

    // Store applications as-is (client handles encryption)
    const collection = this.getCollection();
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
    limit: number = 1000,
    skip: number = 0,
  ): Promise<JobApplication[]> {
    const collection = await this.getCollection();
    const userFilter = { ...filter, userId };
    const query = collection.find(userFilter);

    // If limit is 0, don't apply limit (get all results)
    if (limit > 0) {
      query.limit(limit);
    }

    // Return applications as-is (client handles decryption)
    const applications = await query
      .skip(skip)
      .sort({ createdAt: -1 })
      .toArray();

    return applications;
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
    // Get the current application to merge with updates
    const collection = this.getCollection();
    let currentApplication: any = null;

    try {
      // Convert string to ObjectId if needed
      const objectId = typeof id === "string" ? new ObjectId(id) : id;
      currentApplication = await collection.findOne({
        _id: objectId,
        userId,
      });
    } catch {
      // Return null if ObjectId conversion fails
      return null;
    }

    if (!currentApplication) {
      return null;
    }

    // Merge current application with updates to get complete date fields
    const mergedApplication = { ...currentApplication, ...updates };

    // Check for new status dates and generate events
    const newEvents: ApplicationEvent[] = [];
    const statusDateFields = [
      {
        field: "appliedDate",
        title: "Application submitted",
        description: "Applied to position",
      },
      {
        field: "phoneScreenDate",
        title: "Phone screen scheduled",
        description: "Phone screening interview scheduled",
      },
      {
        field: "round1Date",
        title: "First interview scheduled",
        description: "First round interview scheduled",
      },
      {
        field: "round2Date",
        title: "Second interview scheduled",
        description: "Second round interview scheduled",
      },
      {
        field: "acceptedDate",
        title: "Offer accepted",
        description: "Job offer accepted",
      },
      {
        field: "declinedDate",
        title: "Application declined",
        description: "Application was declined or withdrawn",
      },
    ];

    for (const { field, title } of statusDateFields) {
      const oldValue = currentApplication[field];
      const newValue = updates[field];

      // If we have a new date value that wasn't there before, create an event
      if (newValue && newValue !== oldValue) {
        // Determine if this is a new date or a changed date
        const isDateChange = oldValue && oldValue !== newValue;
        const today = new Date().toISOString().split("T")[0];

        let eventTitle = title;
        let eventDescription: string = "";

        // Create proper descriptions based on the field
        if (field === "appliedDate") {
          eventDescription = `Applied to position on ${newValue}`;
        } else if (field === "phoneScreenDate") {
          eventDescription = `Phone screening interview scheduled for ${newValue}`;
        } else if (field === "round1Date") {
          eventDescription = `First round interview scheduled for ${newValue}`;
        } else if (field === "round2Date") {
          eventDescription = `Second round interview scheduled for ${newValue}`;
        } else if (field === "acceptedDate") {
          eventDescription = `Job offer accepted on ${newValue}`;
        } else if (field === "declinedDate") {
          eventDescription = `Application declined on ${newValue}`;
        }

        // Use different titles for date changes vs. new dates
        if (isDateChange) {
          // Map original titles to "rescheduled" versions
          const rescheduleTitleMap: { [key: string]: string } = {
            "Application submitted": "Application resubmitted",
            "Phone screen scheduled": "Phone screen rescheduled",
            "First interview scheduled": "First interview rescheduled",
            "Second interview scheduled": "Second interview rescheduled",
            "Offer accepted": "Offer acceptance updated",
            "Application declined": "Application status updated",
          };

          eventTitle = rescheduleTitleMap[title] || `${title} (updated)`;

          // Update descriptions for rescheduled events
          if (field === "appliedDate") {
            eventDescription = `Application resubmitted on ${newValue}`;
          } else if (field === "phoneScreenDate") {
            eventDescription = `Phone screening interview rescheduled for ${newValue}`;
          } else if (field === "round1Date") {
            eventDescription = `First round interview rescheduled for ${newValue}`;
          } else if (field === "round2Date") {
            eventDescription = `Second round interview rescheduled for ${newValue}`;
          } else if (field === "acceptedDate") {
            eventDescription = `Job offer acceptance updated on ${newValue}`;
          } else if (field === "declinedDate") {
            eventDescription = `Application status updated on ${newValue}`;
          }
        }

        const newEvent: ApplicationEvent = {
          id: this.generateEventId(),
          title: eventTitle,
          description: eventDescription,
          date: today, // Event happened today, not the scheduled date
        };
        newEvents.push(newEvent);
      }
    }

    // Calculate the new current status
    const newCurrentStatus = this.calculateCurrentStatus(mergedApplication);

    const updateDoc = {
      ...updates,
      // Add new events to existing events if any were generated
      ...(newEvents.length > 0 && {
        events: [...currentApplication.events, ...newEvents],
      }),
      currentStatus: newCurrentStatus,
      updatedAt: new Date(),
    };

    delete updateDoc._id; // Don't update the _id field
    delete updateDoc.userId; // Don't allow userId to be changed

    // Update application in database
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

// ApplicationService now uses dependency injection - no singleton export
