import { Db, Collection, ObjectId } from "mongodb";
import { connectToDatabase } from "../connection";
import {
  Workflow,
  WorkflowSchema,
  ApplicationStatus,
  ApplicationStatusSchema,
} from "../schemas";

export class WorkflowService {
  private db: Db | null = null;
  private workflowsCollection: Collection<Workflow> | null = null;
  private statusesCollection: Collection<ApplicationStatus> | null = null;

  private async getWorkflowsCollection(): Promise<Collection<Workflow>> {
    if (!this.workflowsCollection) {
      this.db = await connectToDatabase();
      this.workflowsCollection = this.db.collection<Workflow>("workflows");
    }
    return this.workflowsCollection;
  }

  private async getStatusesCollection(): Promise<
    Collection<ApplicationStatus>
  > {
    if (!this.statusesCollection) {
      this.db = await connectToDatabase();
      this.statusesCollection = this.db.collection<ApplicationStatus>(
        "application_statuses",
      );
    }
    return this.statusesCollection;
  }

  async createWorkflow(
    workflow: Omit<Workflow, "_id" | "createdAt">,
  ): Promise<Workflow> {
    const collection = await this.getWorkflowsCollection();

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

    const result = await collection.insertOne(newWorkflow);
    return { ...newWorkflow, _id: result.insertedId };
  }

  async getWorkflows(
    userId: string,
    limit: number = 100,
    skip: number = 0,
  ): Promise<Workflow[]> {
    const collection = await this.getWorkflowsCollection();
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
    const collection = await this.getWorkflowsCollection();
    const objectId = typeof id === "string" ? new ObjectId(id) : id;
    return await collection.findOne({ _id: objectId, userId });
  }

  async getDefaultWorkflow(userId: string): Promise<Workflow | null> {
    const collection = await this.getWorkflowsCollection();
    return await collection.findOne({ userId, isDefault: true });
  }

  async updateWorkflow(
    userId: string,
    id: string | ObjectId,
    updates: Partial<Workflow>,
  ): Promise<Workflow | null> {
    const collection = await this.getWorkflowsCollection();
    const objectId = typeof id === "string" ? new ObjectId(id) : id;

    const updateDoc = { ...updates };
    delete updateDoc._id;
    delete updateDoc.userId;

    const result = await collection.findOneAndUpdate(
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
    const collection = await this.getWorkflowsCollection();
    const objectId = typeof id === "string" ? new ObjectId(id) : id;

    const result = await collection.deleteOne({ _id: objectId, userId });
    return result.deletedCount === 1;
  }

  // Application Status methods
  async createStatus(
    status: Omit<ApplicationStatus, "_id" | "createdAt">,
  ): Promise<ApplicationStatus> {
    const collection = await this.getStatusesCollection();

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

    const result = await collection.insertOne(newStatus);
    return { ...newStatus, _id: result.insertedId };
  }

  async getStatuses(
    userId: string,
    limit: number = 100,
    skip: number = 0,
  ): Promise<ApplicationStatus[]> {
    const collection = await this.getStatusesCollection();
    return await collection
      .find({ userId })
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 })
      .toArray();
  }

  // Admin methods (bypass user scoping)
  async getAllWorkflowsForUser(userId: string): Promise<Workflow[]> {
    const collection = await this.getWorkflowsCollection();
    return await collection.find({ userId }).toArray();
  }

  async getAllStatusesForUser(userId: string): Promise<ApplicationStatus[]> {
    const collection = await this.getStatusesCollection();
    return await collection.find({ userId }).toArray();
  }

  async deleteAllWorkflowsForUser(userId: string): Promise<number> {
    const collection = await this.getWorkflowsCollection();
    const result = await collection.deleteMany({ userId });
    return result.deletedCount;
  }

  async deleteAllStatusesForUser(userId: string): Promise<number> {
    const collection = await this.getStatusesCollection();
    const result = await collection.deleteMany({ userId });
    return result.deletedCount;
  }
}

// Export singleton instance
export const workflowService = new WorkflowService();
