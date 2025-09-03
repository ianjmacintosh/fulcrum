import { Db, Collection, ObjectId } from "mongodb";
import {
  Workflow,
  WorkflowSchema,
  ApplicationStatus,
  ApplicationStatusSchema,
} from "../schemas";

export class WorkflowService {
  private workflowsCollection: Collection<Workflow>;
  private statusesCollection: Collection<ApplicationStatus>;

  constructor(db: Db) {
    this.workflowsCollection = db.collection<Workflow>("workflows");
    this.statusesCollection = db.collection<ApplicationStatus>(
      "application_statuses",
    );
  }

  async createWorkflow(
    workflow: Omit<Workflow, "_id" | "createdAt">,
  ): Promise<Workflow> {
    const newWorkflow: Workflow = {
      ...workflow,
      createdAt: new Date(),
    };

    const validationResult = WorkflowSchema.safeParse({
      ...newWorkflow,
      createdAt: newWorkflow.createdAt,
    });

    if (!validationResult.success) {
      throw new Error(`Validation error: ${validationResult.error.message}`);
    }

    const result = await this.workflowsCollection.insertOne(newWorkflow);
    return { ...newWorkflow, _id: result.insertedId };
  }

  async getWorkflows(
    userId: string,
    limit: number = 100,
    skip: number = 0,
  ): Promise<Workflow[]> {
    return await collection
      .find({ userId })
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 })
      .toArray();
  }

  async getWorkflowById(
    userId: string,
    id: string | ObjectId,
  ): Promise<Workflow | null> {
    const objectId = typeof id === "string" ? new ObjectId(id) : id;
    return await this.workflowsCollection.findOne({ _id: objectId, userId });
  }

  async getDefaultWorkflow(userId: string): Promise<Workflow | null> {
    return await this.workflowsCollection.findOne({ userId, isDefault: true });
  }

  async updateWorkflow(
    userId: string,
    id: string | ObjectId,
    updates: Partial<Workflow>,
  ): Promise<Workflow | null> {
    const objectId = typeof id === "string" ? new ObjectId(id) : id;

    const updateDoc = { ...updates };
    delete updateDoc._id;
    delete updateDoc.userId;

    const result = await this.workflowsCollection.findOneAndUpdate(
      { _id: objectId, userId },
      { $set: updateDoc },
      { returnDocument: "after" },
    );

    return result || null;
  }

  async deleteWorkflow(
    userId: string,
    id: string | ObjectId,
  ): Promise<boolean> {
    const objectId = typeof id === "string" ? new ObjectId(id) : id;

    const result = await this.workflowsCollection.deleteOne({
      _id: objectId,
      userId,
    });
    return result.deletedCount === 1;
  }

  // Application Status methods
  async createStatus(
    status: Omit<ApplicationStatus, "_id" | "createdAt">,
  ): Promise<ApplicationStatus> {
    const newStatus: ApplicationStatus = {
      ...status,
      createdAt: new Date(),
    };

    const validationResult = ApplicationStatusSchema.safeParse({
      ...newStatus,
      createdAt: newStatus.createdAt,
    });

    if (!validationResult.success) {
      throw new Error(`Validation error: ${validationResult.error.message}`);
    }

    const result = await this.statusesCollection.insertOne(newStatus);
    return { ...newStatus, _id: result.insertedId };
  }

  async getStatuses(
    userId: string,
    limit: number = 100,
    skip: number = 0,
  ): Promise<ApplicationStatus[]> {
    return await collection
      .find({ userId })
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 })
      .toArray();
  }

  // Admin methods (bypass user scoping)
  async getAllWorkflowsForUser(userId: string): Promise<Workflow[]> {
    return await this.workflowsCollection.find({ userId }).toArray();
  }

  async getAllStatusesForUser(userId: string): Promise<ApplicationStatus[]> {
    return await this.statusesCollection.find({ userId }).toArray();
  }

  async deleteAllWorkflowsForUser(userId: string): Promise<number> {
    const result = await this.workflowsCollection.deleteMany({ userId });
    return result.deletedCount;
  }

  async deleteAllStatusesForUser(userId: string): Promise<number> {
    const result = await this.statusesCollection.deleteMany({ userId });
    return result.deletedCount;
  }
}

// WorkflowService now uses dependency injection - no singleton export
