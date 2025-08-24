import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mockApplicationService } from "../../../../db/services/mock-application-service";
import { JobApplication } from "../../../../db/schemas";

describe("Application Details API Unit Tests", () => {
  const testUserId = "test-user-123";
  let testApplication: JobApplication;

  beforeEach(async () => {
    mockApplicationService.clear();

    testApplication = await mockApplicationService.createApplication({
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
          id: "event-1",
          title: "Application submitted",
          date: "2025-01-15",
          description: "Test application",
        },
        {
          id: "event-2",
          title: "Phone screen completed",
          date: "2025-01-25",
          description: "Phone screen completed",
        },
      ],
      currentStatus: {
        id: "in_progress",
        name: "In Progress",
        eventId: "event-2",
      },
    });
  });

  afterEach(() => {
    mockApplicationService.clear();
  });

  it("should fetch application details through the service", async () => {
    const application = await mockApplicationService.getApplicationById(
      testUserId,
      testApplication._id!.toString(),
    );

    expect(application).toBeTruthy();
    expect(application?.companyName).toBe("Test Company");
    expect(application?.events).toHaveLength(2);

    // Verify events can be sorted chronologically
    const sortedEvents = [...application!.events].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    expect(sortedEvents[0].title).toBe("Application submitted");
    expect(sortedEvents[1].title).toBe("Phone screen completed");
  });

  it("should handle invalid application IDs", async () => {
    const application = await mockApplicationService.getApplicationById(
      testUserId,
      "invalid-id",
    );

    expect(application).toBeNull();
  });
});
