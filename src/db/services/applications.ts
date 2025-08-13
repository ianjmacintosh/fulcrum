import { Db, Collection, ObjectId } from 'mongodb'
import { connectToDatabase } from '../connection'
import { JobApplication, JobApplicationSchema } from '../schemas'

export class ApplicationService {
  private db: Db | null = null
  private collection: Collection<JobApplication> | null = null

  private async getCollection(): Promise<Collection<JobApplication>> {
    if (!this.collection) {
      this.db = await connectToDatabase()
      this.collection = this.db.collection<JobApplication>('applications')
    }
    return this.collection
  }

  async createApplication(application: Omit<JobApplication, '_id' | 'createdAt' | 'updatedAt'>): Promise<JobApplication> {
    const collection = await this.getCollection()
    
    const newApplication: JobApplication = {
      ...application,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Validate with Zod (excluding _id since MongoDB will generate it)
    const validationResult = JobApplicationSchema.safeParse({
      ...newApplication,
      createdAt: newApplication.createdAt,
      updatedAt: newApplication.updatedAt
    })

    if (!validationResult.success) {
      throw new Error(`Validation error: ${validationResult.error.message}`)
    }

    const result = await collection.insertOne(newApplication)
    return { ...newApplication, _id: result.insertedId }
  }

  async getApplications(userId: string, filter: any = {}, limit: number = 100, skip: number = 0): Promise<JobApplication[]> {
    const collection = await this.getCollection()
    const userFilter = { ...filter, userId }
    return await collection.find(userFilter).limit(limit).skip(skip).sort({ createdAt: -1 }).toArray()
  }

  async getApplicationById(userId: string, id: string | ObjectId): Promise<JobApplication | null> {
    const collection = await this.getCollection()
    const objectId = typeof id === 'string' ? new ObjectId(id) : id
    return await collection.findOne({ _id: objectId, userId })
  }

  async updateApplication(userId: string, id: string | ObjectId, updates: Partial<JobApplication>): Promise<JobApplication | null> {
    const collection = await this.getCollection()
    const objectId = typeof id === 'string' ? new ObjectId(id) : id
    
    const updateDoc = {
      ...updates,
      updatedAt: new Date()
    }
    
    delete updateDoc._id // Don't update the _id field
    delete updateDoc.userId // Don't allow userId to be changed

    const result = await collection.findOneAndUpdate(
      { _id: objectId, userId },
      { $set: updateDoc },
      { returnDocument: 'after' }
    )

    return result || null
  }

  async deleteApplication(userId: string, id: string | ObjectId): Promise<boolean> {
    const collection = await this.getCollection()
    const objectId = typeof id === 'string' ? new ObjectId(id) : id
    
    const result = await collection.deleteOne({ _id: objectId, userId })
    return result.deletedCount === 1
  }

  async getApplicationCount(userId: string, filter: any = {}): Promise<number> {
    const collection = await this.getCollection()
    const userFilter = { ...filter, userId }
    return await collection.countDocuments(userFilter)
  }

  // Analytics helper methods
  async getApplicationsByStatus(userId: string, statusId: string): Promise<JobApplication[]> {
    const collection = await this.getCollection()
    return await collection.find({ userId, 'currentStatus.id': statusId }).toArray()
  }

  async getApplicationsByWorkflow(userId: string, workflowId: string): Promise<JobApplication[]> {
    const collection = await this.getCollection()
    return await collection.find({ userId, 'workflow.id': workflowId }).toArray()
  }

  async getApplicationsInDateRange(userId: string, startDate: Date, endDate: Date): Promise<JobApplication[]> {
    const collection = await this.getCollection()
    return await collection.find({
      userId,
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    }).toArray()
  }

  async getApplicationsWithPhoneScreens(userId: string): Promise<JobApplication[]> {
    const collection = await this.getCollection()
    return await collection.find({
      userId,
      'events.statusId': { $in: ['phone_screen'] }
    }).toArray()
  }

  async getApplicationsWithStatus(userId: string, statusIds: string[]): Promise<JobApplication[]> {
    const collection = await this.getCollection()
    return await collection.find({
      userId,
      'currentStatus.id': { $in: statusIds }
    }).toArray()
  }

  // Admin methods (bypass user scoping)
  async getAllApplicationsForUser(userId: string): Promise<JobApplication[]> {
    const collection = await this.getCollection()
    return await collection.find({ userId }).toArray()
  }

  async deleteAllApplicationsForUser(userId: string): Promise<number> {
    const collection = await this.getCollection()
    const result = await collection.deleteMany({ userId })
    return result.deletedCount
  }
}

// Export singleton instance
export const applicationService = new ApplicationService()