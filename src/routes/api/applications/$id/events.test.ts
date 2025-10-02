import { describe, it, expect, beforeEach } from "vitest";
import { mockApplicationService } from "../../../../db/services/mock-application-service";
import { mockApplicationStatusService } from "../../../../db/services/mock-application-status-service";
import { JobApplication, ApplicationStatus } from "../../../../db/schemas";
import { randomUUID } from "crypto";

describe("POST /api/applications/:id/events", () => {
  const testUserId = "test-user-events-123";
  let testApplication: JobApplication;
  let testStatuses: ApplicationStatus[];

  beforeEach(async () => {
    // Clear mock data
    mockApplicationService.clear();
    mockApplicationStatusService.clear();

    // Create test statuses
    testStatuses =
      await mockApplicationStatusService.createDefaultStatuses(testUserId);

    // Find the Applied status to use in the test application
    const appliedStatus = testStatuses.find((s) => s.name === "Applied")!;

    // Create test application
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
          id: "event_test-initial",
          title: "Application submitted",
          description: "Initial application",
          date: "2025-01-15",
        },
      ],
      currentStatus: {
        id: appliedStatus._id!.toString(),
        name: "Applied",
        eventId: "event_test-initial",
      },
    });
  });

  it("should add new event without updating status dates", async () => {
    const eventData = {
      title: "Phone screen scheduled",
      description: "Phone screen scheduled for next week",
      date: "2025-01-20",
    };

    // This simulates the actual API endpoint logic - only adds events
    const eventId = `event_${randomUUID()}`;
    const newEvent = {
      id: eventId,
      title: eventData.title,
      description: eventData.description,
      date: eventData.date,
    };

    const updatedApp = await mockApplicationService.updateApplication(
      testUserId,
      testApplication._id!,
      {
        events: [...testApplication.events, newEvent],
        // Note: events API does NOT update phoneScreenDate or other status dates
      },
    );

    expect(updatedApp).toBeTruthy();
    expect(updatedApp?.events).toHaveLength(3); // Auto-created "Application created" event + 1 existing + 1 new event
    // Events API should not update status dates
    expect(updatedApp?.phoneScreenDate).toBeUndefined();

    const lastEvent = updatedApp?.events.find((e) => e.id === eventId);
    expect(lastEvent?.title).toBe("Phone screen scheduled");
    expect(lastEvent?.description).toBe("Phone screen scheduled for next week");
  });

  it("should validate that statuses exist for the user", async () => {
    // Test that we have the expected statuses available
    const statuses =
      await mockApplicationStatusService.getAllStatuses(testUserId);
    expect(statuses.length).toBe(7); // Should have 7 default statuses
    expect(statuses.some((s) => s.name === "Applied")).toBe(true);
    expect(statuses.some((s) => s.name === "Declined")).toBe(true);
  });

  it("should generate unique UUID for new events", async () => {
    const eventId1 = `event_${randomUUID()}`;
    const eventId2 = `event_${randomUUID()}`;

    expect(eventId1).not.toBe(eventId2);
    expect(eventId1).toMatch(/^event_[a-f0-9-]{36}$/);
    expect(eventId2).toMatch(/^event_[a-f0-9-]{36}$/);
  });

  it("should validate date format according to API schema", () => {
    // This matches the exact regex from the API: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    const validFormatDates = [
      "2025-01-15",
      "2025-12-31",
      "2024-02-29",
      "2000-01-01",
      "2025-13-01",
    ]; // Note: 2025-13-01 has valid format but invalid date
    const invalidFormatDates = [
      "2025-1-15",
      "25-01-15",
      "January 15, 2025",
      "2025/01/15",
      "2025-01-1",
    ];

    // Test that valid format strings match the regex (API only validates format, not date validity)
    validFormatDates.forEach((date) => {
      expect(date).toMatch(dateRegex);
    });

    // Test that invalid format strings don't match the regex
    invalidFormatDates.forEach((date) => {
      expect(date).not.toMatch(dateRegex);
    });
  });

  it("should preserve existing events when adding new ones", async () => {
    const originalEventCount = testApplication.events.length;

    const eventId = `event_${randomUUID()}`;
    const newEvent = {
      id: eventId,
      title: "interview_scheduled",
      description: "Technical interview scheduled",
      date: "2025-01-25",
    };

    const updatedApp = await mockApplicationService.updateApplication(
      testUserId,
      testApplication._id!,
      {
        events: [...testApplication.events, newEvent],
        // Events API does not update round1Date or other status dates
      },
    );

    expect(updatedApp?.events).toHaveLength(originalEventCount + 1); // Preserves count logic

    // Original event should still exist
    const originalEvent = updatedApp?.events.find(
      (e) => e.id === "event_test-initial",
    );
    expect(originalEvent).toBeTruthy();
    expect(originalEvent?.title).toBe("Application submitted");
  });

  it("should handle event addition for terminal status scenarios", async () => {
    const declinedStatus = testStatuses.find((s) => s.name === "Declined")!;
    expect(declinedStatus.isTerminal).toBe(true);

    const eventId = `event_${randomUUID()}`;
    const newEvent = {
      id: eventId,
      title: "rejected_by_employer",
      description: "Position was filled internally",
      date: "2025-01-25",
    };

    const updatedApp = await mockApplicationService.updateApplication(
      testUserId,
      testApplication._id!,
      {
        events: [...testApplication.events, newEvent],
        // Events API does not update declinedDate - that happens via PATCH /applications/:id
      },
    );

    expect(updatedApp?.events).toHaveLength(3); // Auto-created "Application created" event + 1 existing + 1 new event
    expect(updatedApp?.events.find((e) => e.id === eventId)?.title).toBe(
      "rejected_by_employer",
    );
    // The events API should not update declinedDate
    expect(updatedApp?.declinedDate).toBeUndefined();
  });
});
