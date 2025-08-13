# Fulcrum Entity Relationships & Data Model

## Overview

This document provides a detailed explanation of the data model used in Fulcrum, including entity relationships, data flow, and implementation patterns.

## Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│      User       │     │   AdminUser     │     │  JobApplication │
│                 │     │                 │     │                 │
│ + id (UUID)     │     │ + username      │     │ + _id (ObjectId)│
│ + email         │     │ + hashedPwd     │     │ + userId ───────┼──┐
│ + name          │     │ + createdAt     │     │ + companyName   │  │
│ + hashedPwd     │     │                 │     │ + roleName      │  │
│ + createdAt     │     │                 │     │ + events[]      │  │
│ + updatedAt     │     │                 │     │ + currentStatus │  │
│                 │     │                 │     │ + jobBoard      │  │
└─────────────────┘     └─────────────────┘     │ + workflow      │  │
                                                │ + applicationType│  │
                                                │ + roleType      │  │
                                                │ + locationType  │  │
                                                │ + createdAt     │  │
                                                │ + updatedAt     │  │
                                                └─────────────────┘  │
                                                          │          │
                                                          │          │
┌─────────────────┐     ┌─────────────────┐              │          │
│ ApplicationStatus│     │    Workflow     │              │          │
│                 │     │                 │              │          │
│ + _id (ObjectId)│     │ + _id (ObjectId)│              │          │
│ + userId ───────┼──┐  │ + userId ───────┼──┐           │          │
│ + name          │  │  │ + name          │  │           │          │
│ + description   │  │  │ + description   │  │           │          │
│ + isTerminal    │  │  │ + isDefault     │  │           │          │
│ + createdAt     │  │  │ + steps[]       │  │           │          │
│                 │  │  │ + createdAt     │  │           │          │
└─────────────────┘  │  └─────────────────┘  │           │          │
          │          │            │          │           │          │
          │          │            │          │           │          │
          │          │            │          │           │          │
┌─────────────────┐  │  ┌─────────────────┐  │           │          │
│    JobBoard     │  │  │ ApplicationEvent│  │           │          │
│                 │  │  │                 │  │           │          │
│ + _id (ObjectId)│  │  │ + statusId      │  │           │          │
│ + userId ───────┼──┘  │ + statusName    │  │           │          │
│ + name          │     │ + date          │  │           │          │
│ + url           │     │ + notes         │  │           │          │
│ + description   │     │                 │  │           │          │
│ + createdAt     │     └─────────────────┘  │           │          │
│                 │                          │           │          │
└─────────────────┘                          │           │          │
                                             │           │          │
                    ┌────────────────────────┘           │          │
                    │                                    │          │
                    └────────────────────────────────────┘          │
                                                                    │
                              ┌─────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │       User        │
                    │                   │
                    │ Owns all entities │
                    │ Multi-tenant      │
                    │ Data isolation    │
                    └───────────────────┘
```

## Core Entities

### User
**Purpose**: Represents a job seeker using the application
**Collection**: `users`
**Key Features**:
- UUID-based identification for external references
- Email uniqueness enforced at database level
- Password hashing with bcrypt
- Audit timestamps for creation and updates

```typescript
interface User {
  _id?: ObjectId        // MongoDB internal ID
  id: string           // UUID for external references
  email: string        // Unique, lowercase normalized
  name: string         // Display name
  hashedPassword: string // bcrypt hashed, never plaintext
  createdAt: Date
  updatedAt: Date
}
```

### AdminUser
**Purpose**: Administrative users for system management
**Collection**: `admin_users`
**Key Features**:
- Separate from regular users for security
- Username-based authentication
- Session-based authorization

```typescript
interface AdminUser {
  _id?: ObjectId
  username: string     // Unique admin identifier
  hashedPassword: string
  createdAt: Date
}
```

### JobApplication
**Purpose**: Core entity tracking a single job application
**Collection**: `applications`
**Key Features**:
- User-scoped (multi-tenant ready)
- Embedded events for timeline tracking
- Denormalized references for performance
- Type-safe enums for categorization

```typescript
interface JobApplication {
  _id?: ObjectId
  userId: string       // Foreign key to User.id
  companyName: string
  roleName: string
  jobPostingUrl?: string
  
  // Embedded references (denormalized)
  jobBoard: { id: string, name: string }
  workflow: { id: string, name: string }
  currentStatus: { id: string, name: string }
  
  // Categorization (fixed enums)
  applicationType: 'cold' | 'warm'
  roleType: 'manager' | 'engineer'
  locationType: 'on-site' | 'hybrid' | 'remote'
  
  // Timeline (embedded for performance)
  events: ApplicationEvent[]
  
  createdAt: Date
  updatedAt: Date
}
```

### ApplicationEvent
**Purpose**: Timeline entry for job application progress
**Schema**: Embedded within JobApplication
**Key Features**:
- Chronological ordering
- Status references
- Optional notes for context

```typescript
interface ApplicationEvent {
  statusId: string     // Reference to ApplicationStatus
  statusName: string   // Denormalized for display
  date: string        // ISO date string
  notes?: string      // Optional context
}
```

### ApplicationStatus
**Purpose**: Configurable status definitions for workflows
**Collection**: `application_statuses`
**Key Features**:
- User-defined statuses
- Terminal status marking
- Referenced by events and current status

```typescript
interface ApplicationStatus {
  _id?: ObjectId
  userId: string       // User who owns this status
  name: string        // Display name
  description?: string // Optional explanation
  isTerminal: boolean // Ends the application process
  createdAt: Date
}
```

### Workflow
**Purpose**: Defines sequences of statuses for different application types
**Collection**: `workflows`
**Key Features**:
- User-customizable workflows
- Default system workflows
- Ordered step sequences
- Optional step support

```typescript
interface Workflow {
  _id?: ObjectId
  userId: string
  name: string
  description?: string
  isDefault: boolean   // System vs user-defined
  steps: WorkflowStep[]
  createdAt: Date
}

interface WorkflowStep {
  statusId: string     // Reference to ApplicationStatus
  isOptional: boolean  // Can this step be skipped?
}
```

### JobBoard
**Purpose**: Platforms where job opportunities are found
**Collection**: `job_boards`
**Key Features**:
- User-defined job boards
- URL tracking for source attribution
- Performance analytics support

```typescript
interface JobBoard {
  _id?: ObjectId
  userId: string
  name: string
  url: string
  description?: string
  createdAt: Date
}
```

## Relationship Types

### One-to-Many Relationships

1. **User → JobApplication**
   - One user owns many job applications
   - Enforced by `userId` foreign key
   - Enables multi-tenant data isolation

2. **User → ApplicationStatus**
   - One user defines many custom statuses
   - Allows personalized workflow creation

3. **User → Workflow**
   - One user creates many custom workflows
   - System provides default workflows per user

4. **User → JobBoard**
   - One user tracks many job boards
   - Enables source performance analysis

### Embedded Relationships

1. **JobApplication → ApplicationEvent**
   - Events are embedded within applications
   - Optimizes for timeline queries
   - Ensures atomic updates

2. **JobApplication → References**
   - JobBoard, Workflow, and CurrentStatus are embedded as `{id, name}` objects
   - Denormalized for read performance
   - Requires cascade updates when names change

### Many-to-Many Relationships

1. **ApplicationStatus ↔ Workflow**
   - Statuses can be used in multiple workflows
   - Workflows contain multiple statuses
   - Implemented via `WorkflowStep.statusId` references

## Data Access Patterns

### Read Patterns

1. **Dashboard Analytics**
   - Single user query: `applications.find({ userId })`
   - Embedded events enable timeline analysis
   - Denormalized references avoid joins

2. **Application Timeline**
   - Events embedded in application document
   - Single query returns complete history
   - No additional lookups required

3. **Status/Workflow Lookups**
   - Separate collections for management
   - Cached references in applications
   - Fast read performance

### Write Patterns

1. **Application Updates**
   - Event addition updates both events array and currentStatus
   - Atomic operation ensures consistency
   - UpdatedAt timestamp maintained

2. **Reference Updates**
   - Changing job board/workflow/status names requires:
     1. Update master collection
     2. Update all referencing applications
     3. Consider migration scripts for bulk updates

3. **User Isolation**
   - All operations scoped by userId
   - Prevents cross-user data access
   - Enables clean user deletion

## Implementation Considerations

### Performance Optimizations

1. **Embedded Events**
   - Faster timeline queries
   - Reduced database round trips
   - Atomic consistency guarantees

2. **Denormalized References**
   - Avoids joins for common queries
   - Includes display names in references
   - Trade-off: update complexity vs read speed

3. **User-Scoped Queries**
   - All collections partitioned by userId
   - Enables efficient indexing strategies
   - Supports horizontal scaling

### Data Integrity

1. **Foreign Key Constraints**
   - Application layer enforcement
   - Validation schemas with Zod
   - Service layer consistency checks

2. **Referential Integrity**
   - Embedded references may become stale
   - Consider periodic reconciliation jobs
   - Validation on read operations

3. **User Deletion**
   - Cascade deletion across all collections
   - Consider soft deletion for audit trails
   - Backup before major operations

### Scalability Considerations

1. **Multi-Tenancy**
   - User-based partitioning ready
   - Efficient data isolation
   - Per-user analytics possible

2. **Event Growth**
   - Events array grows with application age
   - Consider archiving old events
   - Monitor document size limits

3. **Index Strategy**
   - Compound indexes on (userId, field)
   - Date range indexes for analytics
   - Text indexes for search features

## Migration Strategies

### Adding Label System

If implementing flexible labels alongside current enums:

```typescript
// Phase 1: Add optional label fields
interface JobApplication {
  // ... existing fields
  labels?: Label[]           // New flexible system
  attributes?: Record<string, string[]>  // Alternative approach
}

// Phase 2: Migrate existing data
applicationType: 'cold' → labels: [{ category: 'type', value: 'cold' }]
roleType: 'engineer' → labels: [{ category: 'role', value: 'engineer' }]

// Phase 3: Update analytics to work with both systems
// Phase 4: Remove enum fields once stable
```

### Breaking Changes

When making schema changes:

1. **Backward Compatible Additions**
   - Add optional fields first
   - Maintain existing field validation
   - Gradual migration of data

2. **Breaking Changes**
   - Version API endpoints
   - Provide migration scripts
   - Maintain old schemas temporarily

3. **Reference Updates**
   - Bulk update operations for denormalized data
   - Validation scripts to check consistency
   - Rollback procedures for failed migrations

This data model provides a solid foundation for the job search tracking application while maintaining flexibility for future enhancements.