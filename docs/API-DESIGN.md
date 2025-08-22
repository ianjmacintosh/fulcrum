# Fulcrum API Design Specification

## Table of Contents
1. [Overview](#overview)
2. [Implementation Status](#implementation-status)
3. [Data Model](#data-model)
   - [Core Entities](#core-entities)
   - [Entity Relationships](#entity-relationships)
4. [API Endpoints](#api-endpoints)
   - [Admin Endpoints](#admin-endpoints) ✅ Implemented
   - [Analytics Endpoints](#analytics-endpoints) ✅ Implemented
   - [Applications Collection](#applications-collection) ⚠️ Partial
   - [Job Boards Collection](#job-boards-collection) ❌ Not Implemented
   - [Workflows Collection](#workflows-collection) ❌ Not Implemented
   - [Application Statuses Collection](#application-statuses-collection) ❌ Not Implemented
5. [Filtering and Querying](#filtering-and-querying)
   - [Application Filters](#application-filters)
   - [Analytics Query Parameters](#analytics-query-parameters)
   - [Example Queries](#example-queries)
6. [Homepage/Dashboard Requirements](#homepagedashboard-requirements)
   - [Key Metrics](#key-metrics)
   - [Data Visualization](#data-visualization)
7. [Implementation Notes](#implementation-notes)
   - [Design Decisions](#design-decisions)
   - [Future Considerations](#future-considerations)

## Overview

Fulcrum is a job search tracking application that replaces spreadsheet-based job application tracking with a comprehensive web application. The API is designed to support detailed analytics and insights based on job application data, conversion rates, and success metrics.

### Core Use Cases
- Track job applications through multiple stages (applied → phone screen → interviews → offer/decline)
- Analyze conversion rates for different application types (cold vs warm applications)
- Monitor performance of different job boards and resume versions
- Generate monthly trends and success rate analytics

## Implementation Status

### ✅ **Fully Implemented**
- **Admin Authentication**: Login/logout with session management
- **Admin User Management**: CRUD operations for users
- **Analytics Engine**: Dashboard metrics, job projection, conversion rates
- **Database Layer**: MongoDB with Zod validation schemas
- **Core Data Models**: All entities defined with proper relationships

### ⚠️ **Partially Implemented** 
- **Application Management**: Service layer exists, API routes missing
- **Mock Data**: Comprehensive sample data available for development

### ❌ **Not Yet Implemented**
- **Public API Endpoints**: Applications, Job Boards, Workflows, Application Statuses
- **User Authentication**: Only admin auth exists
- **Filtering/Search**: Advanced query capabilities
- **Pagination**: For large data sets

### 🔄 **Current Architecture**
- **Backend**: TanStack Start with server functions
- **Database**: MongoDB with connection pooling
- **Validation**: Zod schemas for all entities
- **Security**: CSRF protection, password hashing, admin sessions

## Data Model

### Core Entities

#### JobApplication
The primary entity representing a single job application.

```typescript
interface JobApplication {
  id: string
  companyName: string
  roleName: string
  jobPostingUrl: string
  jobBoardId: string          // Foreign key to JobBoard
  workflowId: string          // Foreign key to Workflow
  roleType: 'manager' | 'engineer'
  locationType: 'on-site' | 'hybrid' | 'remote'
  
  // Status derived from ApplicationEvent history
  currentStatusId: string     // Foreign key to ApplicationStatus - current stage
  
  // Audit fields
  createdAt: string
  updatedAt: string
}
```

#### ApplicationStatus
Represents workflow positions in the job application process. Uses a simplified 5-state workflow.

```typescript
interface ApplicationStatus {
  id: string
  name: string              // "Not Started", "Applied", "In Progress", "Accepted", "Declined"
  description?: string      // Optional description of this workflow state
  isTerminal: boolean       // Whether this status ends the application ("Accepted", "Declined")
  createdAt: string
}
```

**Default Workflow States:**
- `Not Started`: Application not yet submitted
- `Applied`: Application has been submitted  
- `In Progress`: Application is being processed (interviews, assessments, etc.)
- `Accepted`: Job offer accepted (terminal)
- `Declined`: Application was declined or withdrawn (terminal)

#### Workflow
Defines a sequence of statuses for different application types. Users can create custom workflows.

```typescript
interface Workflow {
  id: string
  name: string              // e.g., "Cold Apply Process", "Referral Process", "Custom Tech Company"
  description?: string      // Optional description
  isDefault: boolean        // Whether this is a system default workflow
  steps: Array<{
    statusId: string        // Foreign key to ApplicationStatus
    isOptional: boolean     // Whether this step can be skipped
  }>                        // Ordered array - index determines step order
  createdAt: string
}
```

#### ApplicationEvent
Tracks timeline events for job applications. Events describe what happened and optionally trigger status changes.

```typescript
interface ApplicationEvent {
  id: string
  eventType: string         // What happened (e.g., "phone_screen_scheduled", "interview_completed")
  statusId?: string         // Optional: New status if this event changes application status
  statusName?: string       // Optional: Display name for status change
  date: string              // ISO 8601 date string (YYYY-MM-DD format)
  notes?: string            // Optional notes about the event
}
```

**Key Changes:**
- Events are no longer 1:1 with status changes
- `eventType` describes what happened (required)
- `statusId` is optional - only used when event triggers workflow progression
- Events can exist without changing application status (e.g., "follow-up email sent")

#### EventType
Defines the types of events that can occur during a job application process.

```typescript
interface EventType {
  id: string                // e.g., "phone_screen_scheduled", "interview_completed"
  name: string              // Display name (e.g., "Phone Screen Scheduled")
  description: string       // Description of the event
}
```

#### JobBoard
Represents different job boards and platforms where jobs are found.

```typescript
interface JobBoard {
  id: string
  name: string              // e.g., "LinkedIn", "Indeed", "Company Career Page"
  url: string              // Base URL of the job board
  description?: string     // Optional notes about the job board
  createdAt: string
}
```

### Entity Relationships

- **JobApplication** → **JobBoard** (many-to-one): Each application is found through one job board
- **JobApplication** → **Workflow** (many-to-one): Each application follows a specific workflow
- **JobApplication** → **ApplicationStatus** (many-to-one): Each application has a current status
- **JobApplication** → **ApplicationEvent** (one-to-many): Each application can have multiple timeline events
- **ApplicationEvent** → **ApplicationStatus** (many-to-one): Each event represents reaching a specific status
- **Workflow** → **ApplicationStatus** (many-to-many): Each workflow contains multiple statuses in sequence
- **JobBoard** → **JobApplication** (one-to-many): Each job board can have multiple applications

### Default System Data

#### Default Application Statuses
The system provides these default statuses that are used in the default workflows:

```typescript
const defaultStatuses = [
  { id: "cold_apply", name: "Cold Apply", isTerminal: false },
  { id: "warm_apply", name: "Warm Apply", isTerminal: false },
  { id: "phone_screen", name: "Phone Screen", isTerminal: false },
  { id: "round_2", name: "Round 2", isTerminal: false },
  { id: "round_3", name: "Round 3", isTerminal: false },
  { id: "offer", name: "Offer", isTerminal: true },
  { id: "declined", name: "Declined", isTerminal: true }
]
```

#### Default Workflows
The system provides two default workflows:

**Cold Apply Workflow:**
```typescript
{
  name: "Cold Apply Process",
  isDefault: true,
  steps: [
    { statusId: "cold_apply", isOptional: false },
    { statusId: "phone_screen", isOptional: false },
    { statusId: "round_2", isOptional: false },
    { statusId: "round_3", isOptional: false },
    { statusId: "offer", isOptional: false }
  ]
}
```

**Warm Apply Workflow:**
```typescript
{
  name: "Warm Apply Process", 
  isDefault: true,
  steps: [
    { statusId: "warm_apply", isOptional: false },
    { statusId: "phone_screen", isOptional: false },
    { statusId: "round_2", isOptional: false },
    { statusId: "round_3", isOptional: false },
    { statusId: "offer", isOptional: false }
  ]
}
```

**Note:** The "Declined" status can occur at any point in either workflow and is not part of the sequential steps.

#### Custom Workflow Example
Users can create custom workflows with additional statuses. For example, a workflow for tech companies with extensive screening:

```typescript
// First, user creates custom statuses (IDs auto-generated by application)
// POST /api/application-statuses
const customStatuses = [
  { name: "Take-Home Test", isTerminal: false },     // Returns { id: "status_101", ... }
  { name: "Background Check", isTerminal: false },   // Returns { id: "status_102", ... }
  { name: "Drug Screening", isTerminal: false }      // Returns { id: "status_103", ... }
]

// Then user queries all statuses to get IDs for workflow creation
// GET /api/application-statuses returns both default and custom statuses

// Then creates a custom workflow using both default and custom statuses
{
  name: "Tech Company Extended Process",
  isDefault: false,
  steps: [
    { statusId: "cold_apply", isOptional: false },
    { statusId: "phone_screen", isOptional: false },
    { statusId: "status_101", isOptional: false },    // Take-Home Test
    { statusId: "round_2", isOptional: false },
    { statusId: "round_3", isOptional: true },        // Optional final round
    { statusId: "status_102", isOptional: false },    // Background Check
    { statusId: "status_103", isOptional: true },     // Optional drug test
    { statusId: "offer", isOptional: false }
  ]
}
```

## API Endpoints

### Admin Endpoints ✅ Implemented

| Method | Endpoint | Description | Status |
|--------|----------|-------------|---------|
| `POST` | `/api/admin/login` | Authenticate admin user | ✅ |
| `POST` | `/api/admin/logout` | End admin session | ✅ |
| `GET` | `/api/admin/users` | Get all users | ✅ |
| `POST` | `/api/admin/users/create` | Create new user | ✅ |
| `GET` | `/api/admin/users/{id}` | Get user by ID | ✅ |

**Implementation Details:**
- Form-based authentication with CSRF protection
- Session-based authorization using cookies
- Password hashing with bcrypt
- Comprehensive error handling

### Analytics Endpoints ✅ Implemented

| Method | Endpoint | Description | Status |
|--------|----------|-------------|---------|
| `GET` | `/api/analytics/dashboard` | Dashboard metrics | ✅ |
| `GET` | `/api/analytics/projection` | Job offer projection | ✅ |
| `GET` | `/api/analytics/conversion` | Conversion rates | ✅ |

**Implementation Details:**
- Server functions with automatic caching
- Real-time calculations from database
- Fallback to mock data during development
- Comprehensive analytics with ML-style projections

### Applications Collection ⚠️ Partial Implementation

| Method | Endpoint | Description | Status |
|--------|----------|-------------|---------|
| `GET` | `/api/applications` | List applications with filtering | ❌ Route missing |
| `POST` | `/api/applications` | Create a new job application | ❌ Route missing |
| `GET` | `/api/applications/:id` | Get specific application by ID | ❌ Route missing |
| `PATCH` | `/api/applications/:id` | Update existing application | ❌ Route missing |
| `DELETE` | `/api/applications/:id` | Delete application | ❌ Route missing |

**Current Status:**
- ✅ Database service layer fully implemented (`ApplicationService`)
- ✅ Zod validation schemas defined
- ✅ CRUD operations with MongoDB
- ❌ API route handlers not created
- ✅ Mock data available for testing

#### Response Examples

**GET /api/applications**
```json
{
  "data": [
    {
      "id": "app_001",
      "companyName": "TechCorp",
      "roleName": "Senior Software Engineer",
      "jobPostingUrl": "https://techcorp.com/jobs/senior-swe",
      "jobBoardId": "board_001",
      "applicationType": "cold",
      "roleType": "engineer",
      "locationType": "remote",
      "resumeId": "resume_001",
      "applicationDate": "2025-01-15",
      "phoneScreenDate": "2025-01-22",
      "status": "phone-screen",
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-22T14:15:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Application Statuses Collection ❌ Not Implemented

| Method | Endpoint | Description | Status |
|--------|----------|-------------|---------|
| `GET` | `/api/application-statuses` | List all user-defined statuses | ❌ |
| `POST` | `/api/application-statuses` | Create new status | ❌ |
| `GET` | `/api/application-statuses/:id` | Get status by ID | ❌ |
| `PATCH` | `/api/application-statuses/:id` | Update status | ❌ |
| `DELETE` | `/api/application-statuses/:id` | Delete status | ❌ |

**Current Status:**
- ✅ Database schema defined (`ApplicationStatus`)
- ✅ Referenced in job application events
- ❌ Service layer not implemented
- ❌ API routes not implemented
- ⚠️ Currently using hardcoded status IDs

### Workflows Collection ❌ Not Implemented

| Method | Endpoint | Description | Status |
|--------|----------|-------------|---------|
| `GET` | `/api/workflows` | List all workflows (default + custom) | ❌ |
| `POST` | `/api/workflows` | Create new custom workflow | ❌ |
| `GET` | `/api/workflows/:id` | Get workflow by ID | ❌ |
| `PATCH` | `/api/workflows/:id` | Update custom workflow | ❌ |
| `DELETE` | `/api/workflows/:id` | Delete custom workflow | ❌ |

**Current Status:**
- ✅ Database schema defined (`Workflow`)
- ✅ Referenced in job applications as embedded objects
- ❌ Service layer not implemented
- ❌ API routes not implemented
- ⚠️ Currently using embedded references only

### Job Boards Collection ❌ Not Implemented

| Method | Endpoint | Description | Status |
|--------|----------|-------------|---------|
| `GET` | `/api/job-boards` | List all job boards | ❌ |
| `POST` | `/api/job-boards` | Create new job board | ❌ |
| `GET` | `/api/job-boards/:id` | Get job board by ID | ❌ |
| `PATCH` | `/api/job-boards/:id` | Update job board | ❌ |
| `DELETE` | `/api/job-boards/:id` | Delete job board | ❌ |

**Current Status:**
- ✅ Database schema defined (`JobBoard`)
- ✅ Referenced in job applications as embedded objects  
- ❌ Service layer not implemented
- ❌ API routes not implemented
- ⚠️ Currently using embedded references only

#### Analytics Response Examples

**GET /api/analytics/dashboard**
```json
{
  "totalApplications": 127,
  "monthlyOverview": {
    "applicationsThisMonth": 42,
    "trendVsPreviousMonth": 15.2,
    "dailyAverage": 2.1
  },
  "conversionRates": [
    {
      "fromStatusId": "status_001",
      "fromStatusName": "Cold Apply", 
      "toStatusId": "status_002",
      "toStatusName": "Phone Screen",
      "conversionRate": 0.18
    },
    {
      "fromStatusId": "status_002", 
      "fromStatusName": "Phone Screen",
      "toStatusId": "status_003",
      "toStatusName": "Technical Interview", 
      "conversionRate": 0.65
    }
  ],
  "pipelineHealth": {
    "byStatus": [
      {
        "statusId": "status_001",
        "statusName": "Cold Apply",
        "count": 15
      },
      {
        "statusId": "status_002", 
        "statusName": "Phone Screen",
        "count": 5
      }
    ],
    "daysSinceLastApplication": 3
  },
  "performanceInsights": {
    "topJobBoard": {
      "name": "LinkedIn",
      "responseRate": 0.18
    }
  }
}
```

## Filtering and Querying

### Application Filters

The `/api/applications` endpoint supports comprehensive filtering via query parameters:

```typescript
interface ApplicationFilters {
  // Date range filtering
  dateFrom?: string         // ISO 8601 date string
  dateTo?: string          // ISO 8601 date string
  
  // Status and type filtering
  status?: string[]        // Array of status values
  applicationType?: string[] // 'cold' | 'warm'
  roleType?: string[]      // 'manager' | 'engineer'
  locationType?: string[]  // 'on-site' | 'hybrid' | 'remote'
  
  // Related entity filtering
  jobBoardIds?: string[]   // Filter by specific job boards
  resumeIds?: string[]     // Filter by specific resume versions
  
  // Search functionality
  search?: string          // Full-text search on company name and role name
  
  // Sorting options
  sortBy?: 'applicationDate' | 'companyName' | 'roleName' | 'status'
  sortOrder?: 'asc' | 'desc'
  
  // Pagination
  page?: number           // Default: 1
  limit?: number          // Default: 20, max: 100
}
```

### Analytics Query Parameters

```typescript
interface AnalyticsParams {
  period: 'week' | 'month' | 'quarter' | 'year'
  groupBy?: 'jobBoard' | 'applicationType' | 'roleType' | 'resume'
  compareToHistory?: boolean  // Include historical comparison data
}
```

### Example Queries

```bash
# Get cold applications from last month with phone screen status
GET /api/applications?status=phone-screen&applicationType=cold&dateFrom=2024-12-01&dateTo=2024-12-31

# Get conversion rates by application type for current quarter
GET /api/analytics/conversion?period=quarter&groupBy=applicationType

# Get application trends with historical comparison
GET /api/analytics/trends?period=month&compareToHistory=true

# Search for applications at specific companies
GET /api/applications?search=google&sortBy=applicationDate&sortOrder=desc
```

## Homepage/Dashboard Requirements

### Key Metrics

The homepage should display the following metric cards based on `/api/analytics/dashboard`:

1. **Monthly Overview Card**
   - Applications submitted this month
   - Trend indicator (↑/↓) compared to previous month
   - Daily average applications

2. **Success Rate Card**
   - Cold application response rate
   - Overall conversion rate (applied → offer)
   - Comparison to personal historical average

3. **Pipeline Health Card**
   - Current applications by stage (applied, phone screen, etc.)
   - Days since last application
   - Expected timeline to next offer

4. **Performance Insights Card**
   - Best performing job board this month
   - Most successful resume version
   - Recommended optimization actions

### Data Visualization

Charts and graphs to implement:

- **Applications Timeline**: Line chart showing applications over last 3 months
- **Conversion Funnel**: Funnel visualization showing drop-off at each stage
- **Success Rate Comparison**: Bar chart comparing cold vs warm application success
- **Job Board Performance**: Horizontal bar chart of response rates by job board

## Implementation Notes

### Design Decisions

#### **Application Attributes Strategy**
The current implementation uses fixed enum fields for application categorization:

```typescript
applicationType: 'cold' | 'warm'
roleType: 'manager' | 'engineer' 
locationType: 'on-site' | 'hybrid' | 'remote'
```

**Rationale:**
- ✅ Type-safe and predictable
- ✅ Easy to implement filtering and analytics
- ✅ Good for MVP and initial development
- ❌ Less flexible for user customization

**Future Consideration:** The user has expressed interest in a more flexible label/attribute system that would allow:
- Arbitrary labels per application
- User-defined attribute categories
- More flexible categorization beyond current enums

#### **Event Structure: Embedded vs Separate Collections**
Current implementation uses **embedded events array** within job applications:

```typescript
// JobApplication document contains:
events: ApplicationEvent[]  // Embedded array
currentStatus: { id: string, name: string }  // Derived from latest event
```

**Rationale:**
- ✅ Better performance (single query gets full timeline)
- ✅ Atomic updates (events always consistent with application)
- ✅ Simpler data model for analytics
- ❌ Less flexible for complex event querying

#### **Reference Pattern: Embedded Objects**
Job boards, workflows, and statuses are referenced as lightweight embedded objects:

```typescript
jobBoard: { id: string, name: string }
workflow: { id: string, name: string }  
currentStatus: { id: string, name: string }
```

**Rationale:**
- ✅ Denormalized for read performance
- ✅ Most queries need both ID and display name
- ✅ Reduces joins for common operations
- ❌ Requires updates when names change

#### **Authentication Architecture**
Current implementation focuses on admin-only authentication:

```typescript
// Only admin routes implemented
/api/admin/login
/api/admin/users/*
```

**Rationale:**
- ✅ Simple initial implementation
- ✅ Good for administrative tasks
- ❌ No user self-service capabilities
- ❌ Single-tenant architecture

### Future Considerations

#### **Migration to Label-Based Attributes**
If moving to a flexible label system:

```typescript
// Potential future schema
JobApplication {
  labels: Array<{
    category: string  // 'application_type', 'location', 'role_type'
    value: string     // 'cold', 'remote', 'engineer'
  }>
  // OR
  attributes: Record<string, string[]>  // Multiple values per category
}
```

**Migration Strategy:**
1. Add new label fields alongside existing enums
2. Migrate existing data to labels
3. Update analytics to work with both systems
4. Remove enum fields once labels are stable

#### **Missing Core Endpoints**
Priority order for implementing missing API endpoints:

1. **Applications CRUD** - Service layer exists, just need route handlers
2. **Job Boards** - Most referenced, needed for application creation
3. **Workflows** - Needed for application flow management  
4. **Application Statuses** - Currently hardcoded, should be user-configurable

#### **User Authentication & Multi-tenancy**
Future considerations for user authentication:

- JWT-based authentication for API access
- User registration/login flows
- Multi-user support with proper data isolation
- Role-based permissions (user vs admin)

#### **Advanced Features**
Potential future enhancements identified in the codebase:

- **Resume tracking** - Referenced in API design but not implemented
- **Filtering & search** - Complex query capabilities
- **Bulk operations** - Import/export functionality
- **Real-time updates** - WebSocket support for live dashboards
- **Integrations** - Email parsing, job board scraping

### OpenAPI Specification

The current `docs/openapi.json` accurately reflects:
- ✅ All implemented admin endpoints
- ✅ All analytics endpoints with complete schemas
- ✅ Comprehensive entity definitions matching database schemas
- ✅ Proper error handling and security schemes
- ✅ Future-ready structure for missing endpoints

This provides a solid foundation for both current development and future API expansion.