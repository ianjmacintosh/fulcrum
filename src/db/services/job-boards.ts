import { Db, Collection, ObjectId } from 'mongodb'
import { connectToDatabase } from '../connection'
import { JobBoard, JobBoardSchema } from '../schemas'

export class JobBoardService {
  private db: Db | null = null
  private collection: Collection<JobBoard> | null = null

  private async getCollection(): Promise<Collection<JobBoard>> {
    if (!this.collection) {
      this.db = await connectToDatabase()
      this.collection = this.db.collection<JobBoard>('job_boards')
    }
    return this.collection
  }

  async createJobBoard(jobBoard: Omit<JobBoard, '_id' | 'createdAt'>): Promise<JobBoard> {
    const collection = await this.getCollection()
    
    const newJobBoard: JobBoard = {
      ...jobBoard,
      createdAt: new Date()
    }

    const validationResult = JobBoardSchema.safeParse({
      ...newJobBoard,
      createdAt: newJobBoard.createdAt
    })

    if (!validationResult.success) {
      throw new Error(`Validation error: ${validationResult.error.message}`)
    }

    const result = await collection.insertOne(newJobBoard)
    return { ...newJobBoard, _id: result.insertedId }
  }

  async getJobBoards(userId: string, limit: number = 100, skip: number = 0): Promise<JobBoard[]> {
    const collection = await this.getCollection()
    return await collection.find({ userId }).limit(limit).skip(skip).sort({ createdAt: -1 }).toArray()
  }

  async getJobBoardById(userId: string, id: string | ObjectId): Promise<JobBoard | null> {
    const collection = await this.getCollection()
    const objectId = typeof id === 'string' ? new ObjectId(id) : id
    return await collection.findOne({ _id: objectId, userId })
  }

  async getJobBoardByName(userId: string, name: string): Promise<JobBoard | null> {
    const collection = await this.getCollection()
    return await collection.findOne({ userId, name })
  }

  async updateJobBoard(userId: string, id: string | ObjectId, updates: Partial<JobBoard>): Promise<JobBoard | null> {
    const collection = await this.getCollection()
    const objectId = typeof id === 'string' ? new ObjectId(id) : id
    
    const updateDoc = { ...updates }
    delete updateDoc._id
    delete updateDoc.userId

    const result = await collection.findOneAndUpdate(
      { _id: objectId, userId },
      { $set: updateDoc },
      { returnDocument: 'after' }
    )

    return result || null
  }

  async deleteJobBoard(userId: string, id: string | ObjectId): Promise<boolean> {
    const collection = await this.getCollection()
    const objectId = typeof id === 'string' ? new ObjectId(id) : id
    
    const result = await collection.deleteOne({ _id: objectId, userId })
    return result.deletedCount === 1
  }

  async getJobBoardCount(userId: string): Promise<number> {
    const collection = await this.getCollection()
    return await collection.countDocuments({ userId })
  }

  // Helper method to get or create a job board by name
  async getOrCreateJobBoard(userId: string, name: string, url?: string): Promise<JobBoard> {
    const existing = await this.getJobBoardByName(userId, name)
    if (existing) {
      return existing
    }
    
    return await this.createJobBoard({
      userId,
      name,
      url: url || `https://${name.toLowerCase().replace(/\s+/g, '')}.com`,
      description: `Job board: ${name}`
    })
  }

  // Admin methods (bypass user scoping)
  async getAllJobBoardsForUser(userId: string): Promise<JobBoard[]> {
    const collection = await this.getCollection()
    return await collection.find({ userId }).toArray()
  }

  async deleteAllJobBoardsForUser(userId: string): Promise<number> {
    const collection = await this.getCollection()
    const result = await collection.deleteMany({ userId })
    return result.deletedCount
  }
}

// Export singleton instance
export const jobBoardService = new JobBoardService()