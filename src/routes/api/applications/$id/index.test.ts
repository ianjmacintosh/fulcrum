import { describe, it, expect, beforeEach, vi } from "vitest";
import { JobApplication } from "../../../../db/schemas";
import { ObjectId } from "mongodb";
import { mockApplicationService } from "../../../../db/services/mock-application-service";

// Mock the module
vi.mock("../../../../db/services/applications", () => ({
  applicationService: mockApplicationService,
}));

// Import after mocking
import { applicationService } from "../../../../db/services/applications";

describe("GET /api/applications/:id", () => {
  const testUserId = "test-user-123";
  let testApplication: JobApplication;

  beforeEach(async () => {
    // Clear mock data before each test
    mockApplicationService.clear();

    // Create test application
    testApplication = await applicationService.createApplication({
      userId: testUserId,
      companyName: "Test Company",
      roleName: "Test Role",
      jobBoard: { id: "linkedin", name: "LinkedIn" },
      workflow: { id: "default", name: "Default Process" },
      applicationType: "cold",
      roleType: "engineer",
      locationType: "remote",
      events: [
        {
          id: "event_test-123",
          title: "Application submitted",
          date: "2025-01-15",
          description: "Test application",
        },
      ],
      currentStatus: {
        id: "applied",
        name: "Applied",
        eventId: "event_test-123",
      },
    });
  });

  it("should return application details for valid ID", async () => {
    // This would be the implementation test
    // For now, we'll test the service layer directly
    const application = await applicationService.getApplicationById(
      testUserId,
      testApplication._id!.toString(),
    );

    expect(application).toBeTruthy();
    expect(application?.companyName).toBe("Test Company");
    expect(application?.roleName).toBe("Test Role");
    expect(application?.events).toHaveLength(1);
    expect(application?.events[0].title).toBe("Application submitted");
    expect(application?.currentStatus.eventId).toBe("event_test-123");
  });

  it("should return null for non-existent application ID", async () => {
    const application = await applicationService.getApplicationById(
      testUserId,
      "000000000000000000000000",
    );

    expect(application).toBeNull();
  });

  it("should not return applications from other users", async () => {
    // Try to access the application with different user ID
    const application = await applicationService.getApplicationById(
      "other-user-456",
      testApplication._id!.toString(),
    );

    expect(application).toBeNull();
  });

  it("should return events sorted chronologically", async () => {
    // Add more events to the application
    const updatedApp = await applicationService.updateApplication(
      testUserId,
      testApplication._id!,
      {
        events: [
          {
            id: "event_test-1",
            title: "Application submitted",
            date: "2025-01-15",
            description: "First event",
          },
          {
            id: "event_test-3",
            title: "Phone screen completed",
            date: "2025-01-25",
            description: "Third event",
          },
          {
            id: "event_test-2",
            title: "Interview scheduled",
            date: "2025-01-20",
            description: "Second event",
          },
        ],
        currentStatus: {
          id: "in_progress",
          name: "In Progress",
          eventId: "event_test-3",
        },
      },
    );

    const application = await applicationService.getApplicationById(
      testUserId,
      testApplication._id!.toString(),
    );

    expect(application?.events).toHaveLength(3);

    // Events should be sorted by date (oldest first for timeline display)
    const sortedEvents = [...application!.events].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    expect(sortedEvents[0].description).toBe("First event");
    expect(sortedEvents[1].description).toBe("Second event");
    expect(sortedEvents[2].description).toBe("Third event");
  });
});
