# Fulcrum API Design Specification

## Table of Contents
1. [Overview](#overview)
2. [Data Model](#data-model)
   - [Core Entities](#core-entities)
   - [Entity Relationships](#entity-relationships)
3. [API Endpoints](#api-endpoints)
   - [Applications Collection](#applications-collection)
   - [Job Boards Collection](#job-boards-collection)
   - [Resumes Collection](#resumes-collection)
   - [Analytics Endpoints](#analytics-endpoints)
4. [Filtering and Querying](#filtering-and-querying)
   - [Application Filters](#application-filters)
   - [Analytics Query Parameters](#analytics-query-parameters)
   - [Example Queries](#example-queries)
5. [Homepage/Dashboard Requirements](#homepagedashboard-requirements)
   - [Key Metrics](#key-metrics)
   - [Data Visualization](#data-visualization)
6. [Implementation Notes](#implementation-notes)
   - [OpenAPI/Swagger Preparation](#openapiswagger-preparation)
   - [MSW Mock Data Strategy](#msw-mock-data-strategy)

## Overview

Fulcrum is a job search tracking application that replaces spreadsheet-based job application tracking with a comprehensive web application. The API is designed to support detailed analytics and insights based on job application data, conversion rates, and success metrics.

### Core Use Cases
- Track job applications through multiple stages (applied → phone screen → interviews → offer/decline)
- Analyze conversion rates for different application types (cold vs warm applications)
- Monitor performance of different job boards and resume versions
- Generate monthly trends and success rate analytics

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
Individual statuses/phases that can be used in workflows.

```typescript
interface ApplicationStatus {
  id: string
  name: string              // e.g., "Cold Apply", "Phone Screen", "Technical Interview", "Background Check"
  description?: string      // Optional description of this phase
  isTerminal: boolean       // Whether this status ends the application (offer/declined)
  createdAt: string
}
```

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
Tracks timeline events for job applications. Events reference user-defined statuses.

```typescript
interface ApplicationEvent {
  id: string
  applicationId: string     // Foreign key to JobApplication
  statusId: string          // Foreign key to ApplicationStatus
  eventDate: string         // ISO 8601 date string
  notes?: string            // Optional notes about the event
  
  // Audit fields
  createdAt: string
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

### Applications Collection

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/applications` | List applications with optional filtering |
| `POST` | `/api/applications` | Create a new job application |
| `GET` | `/api/applications/:id` | Get specific application by ID |
| `PATCH` | `/api/applications/:id` | Update existing application |
| `DELETE` | `/api/applications/:id` | Delete application |

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

### Application Statuses Collection

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/application-statuses` | List all user-defined statuses |
| `POST` | `/api/application-statuses` | Create new status |
| `GET` | `/api/application-statuses/:id` | Get status by ID |
| `PATCH` | `/api/application-statuses/:id` | Update status |
| `DELETE` | `/api/application-statuses/:id` | Delete status |

### Workflows Collection

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/workflows` | List all workflows (default + custom) |
| `POST` | `/api/workflows` | Create new custom workflow |
| `GET` | `/api/workflows/:id` | Get workflow by ID |
| `PATCH` | `/api/workflows/:id` | Update custom workflow |
| `DELETE` | `/api/workflows/:id` | Delete custom workflow (only non-default) |

### Job Boards Collection

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/job-boards` | List all job boards |
| `POST` | `/api/job-boards` | Create new job board |
| `GET` | `/api/job-boards/:id` | Get job board by ID |
| `PATCH` | `/api/job-boards/:id` | Update job board |
| `DELETE` | `/api/job-boards/:id` | Delete job board |

### Analytics Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/analytics/dashboard` | Homepage dashboard metrics |
| `GET` | `/api/analytics/conversion` | Conversion rates by stage |
| `GET` | `/api/analytics/trends` | Application trends over time |
| `GET` | `/api/analytics/performance` | Job board & resume performance |

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

### OpenAPI/Swagger Preparation

When creating the OpenAPI specification:

1. **Base Configuration**:
   - Set `openapi: 3.0.0`
   - Define base URL and common response schemas
   - Include authentication schemes if needed

2. **Schema Definitions**:
   - Define all entity schemas in `components/schemas`
   - Include validation rules (required fields, string patterns, etc.)
   - Add examples for each schema

3. **Error Responses**:
   - Define standard error response format
   - Include common HTTP status codes (400, 401, 404, 500)

4. **Query Parameters**:
   - Document all filtering parameters with descriptions
   - Include parameter constraints (min/max values, enum options)

### MSW Mock Data Strategy

For Mock Service Worker implementation:

1. **Sample Data Sets**:
   - Create ~50 sample job applications across different stages
   - Include 8-10 job boards (LinkedIn, Indeed, company pages, etc.)
   - Create 3-4 resume versions

2. **Realistic Data Patterns**:
   - Applications should show realistic conversion funnel (high applied, lower phone screens, etc.)
   - Include seasonal trends in application dates
   - Vary success rates by job board and resume type

3. **Dynamic Calculations**:
   - Analytics endpoints should calculate metrics from mock application data
   - Ensure dashboard metrics reflect the underlying application data
   - Include edge cases (no applications, 100% conversion, etc.)

4. **Mock Response Delays**:
   - Add realistic delays (200-500ms) to simulate network requests
   - Consider occasional failures for error state testing

This specification provides a foundation for building a comprehensive job tracking system that replaces spreadsheet-based workflows with rich analytics and insights.