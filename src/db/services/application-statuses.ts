import { Db, Collection, ObjectId } from 'mongodb'
import { connectToDatabase } from '../connection'
import { ApplicationStatus, ApplicationStatusSchema } from '../schemas'

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
    const defaultStatuses = [
      {
        userId,
        name: 'Applied',
        description: 'Application has been submitted',
        isTerminal: false
      },
      {
        userId,
        name: 'Rejected by Employer',
        description: 'Application was rejected by the company',
        isTerminal: true
      },
      {
        userId,
        name: 'Rejected by Job Seeker',
        description: 'Job seeker declined or withdrew from the process',
        isTerminal: true
      },
      {
        userId,
        name: 'Phone Screen Scheduled',
        description: 'Phone screen has been scheduled',
        isTerminal: false
      },
      {
        userId,
        name: 'Phone Screen Completed',
        description: 'Phone screen has been completed',
        isTerminal: false
      },
      {
        userId,
        name: 'Interview Scheduled',
        description: 'Interview has been scheduled',
        isTerminal: false
      },
      {
        userId,
        name: 'Interview Completed',
        description: 'Interview has been completed',
        isTerminal: false
      },
      {
        userId,
        name: 'Job Offer Received',
        description: 'Job offer has been received',
        isTerminal: false
      },
      {
        userId,
        name: 'Job Offer Accepted',
        description: 'Job offer has been accepted',
        isTerminal: true
      },
      {
        userId,
        name: 'Counteroffer by Employer',
        description: 'Employer made a counteroffer',
        isTerminal: false
      },
      {
        userId,
        name: 'Counteroffer by Job Seeker',
        description: 'Job seeker made a counteroffer',
        isTerminal: false
      }
    ]

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

  async getStatusById(userId: string, id: string | ObjectId): Promise<ApplicationStatus | null> {
    const collection = await this.getCollection()
    const objectId = typeof id === 'string' ? new ObjectId(id) : id
    return await collection.findOne({ _id: objectId, userId })
  }

  async getStatusByName(userId: string, name: string): Promise<ApplicationStatus | null> {
    const collection = await this.getCollection()
    return await collection.findOne({ userId, name })
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