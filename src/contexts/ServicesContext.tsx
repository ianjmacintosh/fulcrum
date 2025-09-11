import { createContext, useContext } from "react";

// Client-side type definitions (no server imports to avoid bundle bloat)
export interface JobApplication {
  _id?: string;
  userId: string;
  companyName: string;
  roleName: string;
  jobPostingUrl?: string;
  jobBoard: {
    id: string;
    name: string;
  };
  workflow: {
    id: string;
    name: string;
  };
  applicationType: "cold" | "warm";
  roleType: "manager" | "engineer";
  locationType: "on-site" | "hybrid" | "remote";
  events: ApplicationEvent[];
  appliedDate?: string;
  phoneScreenDate?: string;
  round1Date?: string;
  round2Date?: string;
  acceptedDate?: string;
  declinedDate?: string;
  notes?: string;
  currentStatus: {
    id: string;
    name: string;
    eventId?: string;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ApplicationEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApplicationsListResponse extends ApiResponse {
  applications: JobApplication[];
}

export interface ApplicationResponse extends ApiResponse {
  application: JobApplication;
}

export interface EventResponse extends ApiResponse {
  event: ApplicationEvent;
}

export interface DashboardMetrics {
  totalApplications: number;
  activeApplications: number;
  conversionRate: number;
  avgResponseTime: number;
  // ... other metrics
}

export interface DashboardResponse extends ApiResponse {
  metrics: DashboardMetrics;
}

export interface ProjectionParams {
  startDate: string;
  endDate: string;
  targetRole?: string;
}

export interface ProjectionData {
  projectedApplications: number;
  expectedInterviews: number;
  estimatedOffers: number;
  // ... other projection data
}

export interface ProjectionResponse extends ApiResponse {
  projection: ProjectionData;
}

export interface JobBoard {
  _id?: string;
  name: string;
  url?: string;
  userId: string;
}

export interface JobBoardsResponse extends ApiResponse {
  jobBoards: JobBoard[];
}

export interface CreateApplicationData {
  companyName: string;
  roleName: string;
  jobPostingUrl?: string;
  appliedDate?: string;
  jobBoard?: string;
  applicationType?: "cold" | "warm";
  roleType?: "manager" | "engineer";
  locationType?: "on-site" | "hybrid" | "remote";
  notes?: string;
}

// Client Services Interface
export interface ClientServices {
  applications: {
    list(): Promise<ApplicationsListResponse>;
    create(data: CreateApplicationData): Promise<ApplicationResponse>;
    createBulk(
      applications: CreateApplicationData[],
    ): Promise<{ applications: JobApplication[]; count: number }>;
    get(id: string): Promise<ApplicationResponse>;
    update(
      id: string,
      data: Partial<JobApplication>,
    ): Promise<ApplicationResponse>;
    delete(id: string): Promise<ApiResponse>;
    createEvent(
      id: string,
      event: Omit<ApplicationEvent, "id">,
    ): Promise<EventResponse>;
  };
  analytics: {
    dashboard(): Promise<DashboardResponse>;
    projection(params: ProjectionParams): Promise<ProjectionResponse>;
  };
  jobBoards: {
    list(): Promise<JobBoardsResponse>;
    create(data: {
      name: string;
      url?: string;
    }): Promise<{ jobBoard: JobBoard }>;
  };
}

// Context
const ServicesContext = createContext<ClientServices | null>(null);

export function useServices(): ClientServices {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error("useServices must be used within ServicesProvider");
  }
  return services;
}

export { ServicesContext };
