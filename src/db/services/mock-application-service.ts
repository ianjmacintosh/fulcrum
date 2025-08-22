import { ObjectId } from 'mongodb'
import { JobApplication, CurrentStatus } from '../schemas'

// In-memory storage
let applications: JobApplication[] = []
let nextId = 1

export const mockApplicationService = {
  async createApplication(application: Omit<JobApplication, '_id' | 'createdAt' | 'updatedAt'>): Promise<JobApplication> {
    const now = new Date()
    const newApplication: JobApplication = {
      ...application,
      _id: new ObjectId(`${nextId++}`.padStart(24, '0')),
      createdAt: now,
      updatedAt: now
    }

    applications.push(newApplication)
    return newApplication
  },

  async getApplicationById(userId: string, id: string | ObjectId): Promise<JobApplication | null> {
    const searchId = typeof id === 'string' ? id : id.toString()
    const application = applications.find(
      app => app._id?.toString() === searchId && app.userId === userId
    )
    return application || null
  },

  async updateApplication(userId: string, id: string | ObjectId, updates: Partial<JobApplication>): Promise<JobApplication | null> {
    const searchId = typeof id === 'string' ? id : id.toString()
    const applicationIndex = applications.findIndex(
      app => app._id?.toString() === searchId && app.userId === userId
    )

    if (applicationIndex === -1) {
      return null
    }

    // Update the application
    const updatedApplication = {
      ...applications[applicationIndex],
      ...updates,
      updatedAt: new Date(),
      // Preserve immutable fields
      _id: applications[applicationIndex]._id,
      userId: applications[applicationIndex].userId,
      createdAt: applications[applicationIndex].createdAt
    }

    applications[applicationIndex] = updatedApplication
    return updatedApplication
  },

  async getAllApplicationsForUser(userId: string): Promise<JobApplication[]> {
    return applications.filter(app => app.userId === userId)
  },

  calculateCurrentStatus(application: Partial<JobApplication>): CurrentStatus {
    const statusDates = [
      { date: application.declinedDate, status: { id: 'declined', name: 'Declined' }, priority: 7 },
      { date: application.acceptedDate, status: { id: 'accepted', name: 'Accepted' }, priority: 6 },
      { date: application.round2Date, status: { id: 'round_2', name: 'Round 2' }, priority: 5 },
      { date: application.round1Date, status: { id: 'round_1', name: 'Round 1' }, priority: 4 },
      { date: application.phoneScreenDate, status: { id: 'phone_screen', name: 'Phone Screen' }, priority: 3 },
      { date: application.appliedDate, status: { id: 'applied', name: 'Applied' }, priority: 2 }
    ]

    // Find the latest status date, with higher priority for equal dates
    let latestStatus = { id: 'not_applied', name: 'Not Applied' }
    let latestDate: Date | null = null
    let latestPriority = 0

    for (const { date, status, priority } of statusDates) {
      if (date) {
        const statusDate = new Date(date)
        // Skip invalid dates
        if (isNaN(statusDate.getTime())) {
          continue
        }
        
        // Update if this date is later, or if same date but higher priority
        if (!latestDate || 
            statusDate > latestDate || 
            (statusDate.getTime() === latestDate.getTime() && priority > latestPriority)) {
          latestStatus = status
          latestDate = statusDate
          latestPriority = priority
        }
      }
    }

    return latestStatus
  },

  async updateApplicationWithStatusCalculation(userId: string, id: string | ObjectId, updates: Partial<JobApplication>): Promise<JobApplication | null> {
    const searchId = typeof id === 'string' ? id : id.toString()
    const applicationIndex = applications.findIndex(
      app => app._id?.toString() === searchId && app.userId === userId
    )

    if (applicationIndex === -1) {
      return null
    }

    // First get the current application to merge with updates
    const currentApplication = applications[applicationIndex]
    
    // Merge current application with updates to get complete date fields
    const mergedApplication = { ...currentApplication, ...updates }
    
    // Calculate the new current status
    const newCurrentStatus = this.calculateCurrentStatus(mergedApplication)
    
    // Update the application with new status calculation
    const updatedApplication = {
      ...currentApplication,
      ...updates,
      currentStatus: newCurrentStatus,
      updatedAt: new Date(),
      // Preserve immutable fields
      _id: currentApplication._id,
      userId: currentApplication.userId,
      createdAt: currentApplication.createdAt
    }

    applications[applicationIndex] = updatedApplication
    return updatedApplication
  },

  // Test utility
  clear(): void {
    applications = []
    nextId = 1
  }
}