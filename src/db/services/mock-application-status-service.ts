import { ObjectId } from 'mongodb'
import { ApplicationStatus } from '../schemas'
import { defaultWorkflowService } from './default-workflow'

// In-memory storage
let statuses: ApplicationStatus[] = []
let nextId = 1

const createStatus = async (status: Omit<ApplicationStatus, '_id' | 'createdAt'>): Promise<ApplicationStatus> => {
  const newStatus: ApplicationStatus = {
    ...status,
    _id: new ObjectId(`${nextId++}`.padStart(24, '0')),
    createdAt: new Date()
  }

  statuses.push(newStatus)
  return newStatus
}

export const mockApplicationStatusService = {
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
      const status = await createStatus(statusData)
      createdStatuses.push(status)
    }

    return createdStatuses
  },

  async getAllStatuses(userId: string): Promise<ApplicationStatus[]> {
    return statuses
      .filter(status => status.userId === userId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  },


  // Test utility
  clear(): void {
    statuses = []
    nextId = 1
  }
}