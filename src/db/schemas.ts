import { z } from 'zod'
import { ObjectId } from 'mongodb'

// Zod schemas for validation
export const ApplicationEventSchema = z.object({
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
  name: z.string()
})

export const JobApplicationSchema = z.object({
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
  name: z.string(),
  description: z.string().optional(),
  isDefault: z.boolean(),
  steps: z.array(WorkflowStepSchema),
  createdAt: z.date()
})

export const JobBoardSchema = z.object({
  name: z.string(),
  url: z.string(),
  description: z.string().optional(),
  createdAt: z.date()
})

// TypeScript interfaces (for use in application code)
export interface ApplicationEvent {
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
}

export interface JobApplication {
  _id?: ObjectId
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
  name: string
  description?: string
  isDefault: boolean
  steps: WorkflowStep[]
  createdAt: Date
}

export interface JobBoard {
  _id?: ObjectId
  name: string
  url: string
  description?: string
  createdAt: Date
}