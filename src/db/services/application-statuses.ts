import { Db, Collection, ObjectId } from 'mongodb'
import { connectToDatabase } from '../connection'
import { ApplicationStatus, ApplicationStatusSchema } from '../schemas'
import { defaultWorkflowService } from './default-workflow'

export class ApplicationStatusService {
  private db: Db | null = null
  private collection: Collection<ApplicationStatus> | null = null

  private async getCollection(): Promise<Collection<ApplicationStatus>> {
    if (!this.collection) {
      this.db = await connectToDatabase()
      this.collection = this.db.collection<ApplicationStatus>('application_statuses')
    }
    return this.collection
  }

  async createStatus(status: Omit<ApplicationStatus, '_id' | 'createdAt'>): Promise<ApplicationStatus> {
    const collection = await this.getCollection()
    
    const newStatus: ApplicationStatus = {
      ...status,
      createdAt: new Date()
    }

    // Validate with Zod (excluding _id since MongoDB will generate it)
    const validationResult = ApplicationStatusSchema.safeParse(newStatus)

    if (!validationResult.success) {
      throw new Error(`Validation error: ${validationResult.error.message}`)
    }

    const result = await collection.insertOne(newStatus)
    return { ...newStatus, _id: result.insertedId }
  }

  async createDefaultStatuses(userId: string): Promise<ApplicationStatus[]> {
    const basicStatuses = defaultWorkflowService.getDefaultStatuses()
    
    const defaultStatuses = basicStatuses.map(statusDef => ({
      userId,
      name: statusDef.name,
      description: statusDef.description,
      isTerminal: statusDef.isTerminal
    }))

    const createdStatuses: ApplicationStatus[] = []
    
    for (const statusData of defaultStatuses) {
      const status = await this.createStatus(statusData)
      createdStatuses.push(status)
    }

    return createdStatuses
  }

  async getAllStatuses(userId: string): Promise<ApplicationStatus[]> {
    const collection = await this.getCollection()
    return await collection.find({ userId }).sort({ createdAt: 1 }).toArray()
  }


  async updateStatus(userId: string, id: string | ObjectId, updates: Partial<ApplicationStatus>): Promise<ApplicationStatus | null> {
    const collection = await this.getCollection()
    const objectId = typeof id === 'string' ? new ObjectId(id) : id
    
    const updateDoc = {
      ...updates
    }
    
    delete updateDoc._id // Don't update the _id field
    delete updateDoc.userId // Don't allow userId to be changed
    delete updateDoc.createdAt // Don't update createdAt

    const result = await collection.findOneAndUpdate(
      { _id: objectId, userId },
      { $set: updateDoc },
      { returnDocument: 'after' }
    )

    return result || null
  }

  async deleteStatus(userId: string, id: string | ObjectId): Promise<boolean> {
    const collection = await this.getCollection()
    const objectId = typeof id === 'string' ? new ObjectId(id) : id
    
    const result = await collection.deleteOne({ _id: objectId, userId })
    return result.deletedCount === 1
  }
}

// Export singleton instance
export const applicationStatusService = new ApplicationStatusService()