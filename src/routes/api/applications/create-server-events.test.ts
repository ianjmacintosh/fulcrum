import { describe, it, expect, beforeEach } from "vitest";
import { mockApplicationService } from "../../../db/services/mock-application-service";
import type { ApplicationCreateData } from "../../../db/schemas";

/**
 * Server-side unit test for application creation events
 *
 * Tests that the ApplicationService.createApplication method
 * always generates a "Application created" event using the
 * client-provided encrypted timestamp.
 */
describe("Application Creation - Server Event Generation", () => {
  const testUserId = "user-test-events-123";

  beforeEach(async () => {
    // Clear mock services
    mockApplicationService.clear();
  });

  it("should always create 'Application created' event for applications without appliedDate", async () => {
    // Test case: Application created without appliedDate (no client events)
    const applicationData: ApplicationCreateData = {
      userId: testUserId,
      companyName: "encrypted_company_name_abc123==",
      roleName: "encrypted_role_name_def456==",
      jobPostingUrl: "https://example.com/job",
      notes: "encrypted_notes_ghi789==",
      jobBoard: { id: "board-123", name: "General" },
      workflow: { id: "workflow-123", name: "Default Test Workflow" },
      applicationType: "cold",
      roleType: "engineer",
      locationType: "remote",
      events: [], // Client sends empty events - server creates all events
      currentStatus: { id: "not_applied", name: "Not Applied" },
      // Client provides encrypted timestamps
      createdAt: "encrypted_created_timestamp_jkl012==",
      updatedAt: "encrypted_updated_timestamp_mno345==",
    };

    // Call the actual service method (this is what the API route calls)
    const createdApplication =
      await mockApplicationService.createApplication(applicationData);

    // FAILING ASSERTION - This should fail with current implementation
    // Every application should have at least 1 event (the "Application created" event)
    expect(createdApplication.events).toHaveLength(1);

    // The single event should be the server-generated creation event
    expect(createdApplication.events[0]).toEqual(
      expect.objectContaining({
        title: "Application created",
        description: "Application tracking started",
        // Should use client-provided encrypted timestamp, not server-generated date
        date: applicationData.createdAt,
      }),
    );

    // Event should have a proper generated ID
    expect(createdApplication.events[0].id).toMatch(/^event_\d+_[a-z0-9]+$/);

    // Verify the encrypted timestamps were preserved from client
    expect(createdApplication.createdAt).toBe(
      "encrypted_created_timestamp_jkl012==",
    );
    expect(createdApplication.updatedAt).toBe(
      "encrypted_updated_timestamp_mno345==",
    );
  });

  it("should add 'Application created' event even when client provides other events", async () => {
    // Test case: Application with appliedDate (client provides events)
    const applicationData: ApplicationCreateData = {
      userId: testUserId,
      companyName: "encrypted_company_xyz==",
      roleName: "encrypted_role_xyz==",
      appliedDate: "2023-12-01",
      jobBoard: { id: "board-456", name: "LinkedIn" },
      workflow: { id: "workflow-456", name: "Default Test Workflow" },
      applicationType: "warm",
      roleType: "manager",
      locationType: "hybrid",
      // Client sends submitted event because appliedDate is provided (matches ServicesProvider behavior)
      events: [
        {
          id: "event_123456789_clienttest",
          title: "Application submitted",
          description: "Applied to position",
          date: "2023-12-01", // appliedDate
        },
      ],
      currentStatus: { id: "applied", name: "Applied" },
      createdAt: "encrypted_created_pqr678==",
      updatedAt: "encrypted_updated_stu901==",
    };

    const createdApplication =
      await mockApplicationService.createApplication(applicationData);

    // Should have 2 events: client submitted event + server creation event
    expect(createdApplication.events).toHaveLength(2);

    // First event should be the client-provided submitted event (preserved)
    expect(createdApplication.events[0]).toEqual(
      expect.objectContaining({
        id: "event_123456789_clienttest",
        title: "Application submitted",
        description: "Applied to position",
        date: "2023-12-01", // appliedDate from client
      }),
    );

    // Second event should be server-added creation event
    expect(createdApplication.events[1]).toEqual(
      expect.objectContaining({
        title: "Application created",
        description: "Application tracking started",
        date: applicationData.createdAt, // Uses client encrypted timestamp
      }),
    );

    // Creation event should have generated ID
    expect(createdApplication.events[1].id).toMatch(/^event_\d+_[a-z0-9]+$/);
  });

  it("should use encrypted timestamp from client for creation event date", async () => {
    // Verify that the creation event uses client timestamp, not server-generated date
    const specificEncryptedTimestamp = "specific_encrypted_timestamp_test==";

    const applicationData: ApplicationCreateData = {
      userId: testUserId,
      companyName: "test_company==",
      roleName: "test_role==",
      jobBoard: { id: "board-test", name: "General" },
      workflow: { id: "workflow-test", name: "Default Test Workflow" },
      applicationType: "cold",
      roleType: "engineer",
      locationType: "remote",
      events: [],
      currentStatus: { id: "not_applied", name: "Not Applied" },
      createdAt: specificEncryptedTimestamp,
      updatedAt: "updated_timestamp_test==",
    };

    const createdApplication =
      await mockApplicationService.createApplication(applicationData);

    // FAILING ASSERTION - Creation event should use client's encrypted timestamp
    expect(createdApplication.events).toHaveLength(1);
    expect(createdApplication.events[0].date).toBe(specificEncryptedTimestamp);

    // Should NOT be a server-generated date string like "2023-12-01"
    expect(createdApplication.events[0].date).not.toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
    expect(createdApplication.events[0].date).toMatch(/=+$/); // Should end with base64 padding
  });
});
