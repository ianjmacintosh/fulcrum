import { z } from 'zod'
import { ObjectId } from 'mongodb'

// Zod schemas for validation
export const ApplicationEventSchema = z.object({
  id: z.string(),
  statusId: z.string(),
  statusName: z.string(),
  date: z.string(), // ISO date string
  notes: z.string().optional()
})

export const JobBoardRefSchema = z.object({
  id: z.string(),
  name: z.string()
})

export const WorkflowRefSchema = z.object({
  id: z.string(),
  name: z.string()
})

export const CurrentStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  eventId: z.string().optional()
})

export const JobApplicationSchema = z.object({
  userId: z.string(),
  companyName: z.string(),
  roleName: z.string(),
  jobPostingUrl: z.string().optional(),
  jobBoard: JobBoardRefSchema,
  workflow: WorkflowRefSchema,
  applicationType: z.enum(['cold', 'warm']),
  roleType: z.enum(['manager', 'engineer']),
  locationType: z.enum(['on-site', 'hybrid', 'remote']),
  events: z.array(ApplicationEventSchema),
  currentStatus: CurrentStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date()
})

export const ApplicationStatusSchema = z.object({
  userId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  isTerminal: z.boolean(),
  createdAt: z.date()
})

export const WorkflowStepSchema = z.object({
  statusId: z.string(),
  isOptional: z.boolean()
})

export const WorkflowSchema = z.object({
  userId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  isDefault: z.boolean(),
  steps: z.array(WorkflowStepSchema),
  createdAt: z.date()
})

export const JobBoardSchema = z.object({
  userId: z.string(),
  name: z.string(),
  url: z.string(),
  description: z.string().optional(),
  createdAt: z.date()
})

// User and Admin schemas
export const UserSchema = z.object({
  id: z.string(), // UUID
  email: z.string().email(),
  name: z.string(),
  hashedPassword: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const AdminUserSchema = z.object({
  username: z.string(),
  hashedPassword: z.string(),
  createdAt: z.date()
})

// TypeScript interfaces (for use in application code)
export interface ApplicationEvent {
  id: string
  statusId: string
  statusName: string
  date: string
  notes?: string
}

export interface JobBoardRef {
  id: string
  name: string
}

export interface WorkflowRef {
  id: string
  name: string
}

export interface CurrentStatus {
  id: string
  name: string
  eventId?: string
}

export interface JobApplication {
  _id?: ObjectId
  userId: string
  companyName: string
  roleName: string
  jobPostingUrl?: string
  jobBoard: JobBoardRef
  workflow: WorkflowRef
  applicationType: 'cold' | 'warm'
  roleType: 'manager' | 'engineer'
  locationType: 'on-site' | 'hybrid' | 'remote'
  events: ApplicationEvent[]
  currentStatus: CurrentStatus
  createdAt: Date
  updatedAt: Date
}

export interface ApplicationStatus {
  _id?: ObjectId
  userId: string
  name: string
  description?: string
  isTerminal: boolean
  createdAt: Date
}

export interface WorkflowStep {
  statusId: string
  isOptional: boolean
}

export interface Workflow {
  _id?: ObjectId
  userId: string
  name: string
  description?: string
  isDefault: boolean
  steps: WorkflowStep[]
  createdAt: Date
}

export interface JobBoard {
  _id?: ObjectId
  userId: string
  name: string
  url: string
  description?: string
  createdAt: Date
}

// User and Admin interfaces
export interface User {
  _id?: ObjectId
  id: string // UUID
  email: string
  name: string
  hashedPassword: string
  createdAt: Date
  updatedAt: Date
}

export interface AdminUser {
  _id?: ObjectId
  username: string
  hashedPassword: string
  createdAt: Date
}