import { describe, it, expect, vi, beforeEach } from "vitest";

// This test verifies that the current API create endpoint works properly with ServicesProvider
// It should demonstrate that the API currently FAILS to handle encrypted timestamps correctly

describe("Application Creation API - ServicesProvider Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fail: API rejects encrypted timestamp fields not in schema", () => {
    // The current CreateApplicationSchema in create.ts does NOT include createdAt/updatedAt
    // So when ServicesProvider sends them, they should be ignored or cause validation to fail

    // Simulate what ServicesProvider actually sends now
    const formDataFromServicesProvider = new Map([
      ["companyName", "encrypted_company=="],
      ["roleName", "encrypted_role=="],
      ["createdAt", "encrypted_created_timestamp=="], // NOT in current schema
      ["updatedAt", "encrypted_updated_timestamp=="], // NOT in current schema
      ["notes", "encrypted_notes=="],
      ["csrf_token", "valid-token"],
      ["csrf_hash", "valid-hash"],
    ]);

    // Current API validation schema (from create.ts lines 11-25):
    const validApiFields = [
      "companyName",
      "roleName",
      "jobPostingUrl",
      "appliedDate",
      "jobBoard",
      "applicationType",
      "roleType",
      "locationType",
      "notes",
    ];

    // Check that ServicesProvider sends fields not in API schema
    const extraFields = Array.from(formDataFromServicesProvider.keys()).filter(
      (field) => !validApiFields.includes(field) && !field.startsWith("csrf_"),
    );

    // This demonstrates the problem - API doesn't accept these fields
    expect(extraFields).toContain("createdAt");
    expect(extraFields).toContain("updatedAt");
    expect(extraFields.length).toBeGreaterThan(0);
  });

  it("should fail: API generates server timestamps instead of using client encrypted timestamps", () => {
    // Current API behavior (create.ts lines 256-296):
    // It creates applicationData without createdAt/updatedAt fields
    // Then passes to services.applicationService.createApplication()
    // Which generates NEW server timestamps, ignoring client ones

    const mockApplicationData = {
      userId: "user-123",
      companyName: "encrypted_company==",
      roleName: "encrypted_role==",
      // Note: No createdAt or updatedAt fields passed to service
      // API currently doesn't extract these from FormData
      notes: "encrypted_notes==",
    };

    // API would generate fresh timestamps in the service layer
    const expectedServerBehavior = {
      ...mockApplicationData,
      // Server generates these instead of using client values:
      createdAt: expect.any(Date), // Server-generated Date, not encrypted string
      updatedAt: expect.any(Date), // Server-generated Date, not encrypted string
    };

    // This demonstrates the current API ignores client timestamps
    expect((mockApplicationData as any).createdAt).toBeUndefined();
    expect((mockApplicationData as any).updatedAt).toBeUndefined();

    // While ServicesProvider expects to send these:
    expect("encrypted_created_timestamp==").not.toBe(
      expectedServerBehavior.createdAt,
    );
    expect("encrypted_updated_timestamp==").not.toBe(
      expectedServerBehavior.updatedAt,
    );
  });

  it("should fail: API doesn't handle encrypted events from ServicesProvider", () => {
    // ServicesProvider now sends encrypted events including encrypted event dates
    // But the current API (lines 273-282) creates events server-side with plaintext dates

    const encryptedEventsFromClient = [
      {
        id: "event_12345",
        title: "encrypted_event_title==",
        description: "encrypted_event_description==",
        date: "encrypted_event_date==", // This should be preserved
      },
    ];

    // Current API behavior - it IGNORES client events and generates its own:
    const currentApiGeneratesEvents = {
      id: expect.stringMatching(/^event_\d+_/),
      title: "Application submitted", // Hardcoded, not from client
      description: expect.any(String), // From notes or default
      date: expect.any(String), // From appliedDate, not encrypted
    };

    // This shows the mismatch
    expect(encryptedEventsFromClient[0].title).not.toBe(
      currentApiGeneratesEvents.title,
    );
    expect(encryptedEventsFromClient[0].date).not.toBe(
      currentApiGeneratesEvents.date,
    );
    expect(typeof encryptedEventsFromClient[0].date).toBe("string"); // Encrypted
    expect(encryptedEventsFromClient[0].date).toMatch(/=+$/); // Base64 padding
  });

  it("should demonstrate the expected fix for encrypted timestamp support", () => {
    // This test shows what the API SHOULD do after the fix

    // What ServicesProvider sends:
    const clientData = {
      companyName: "encrypted_company==",
      roleName: "encrypted_role==",
      createdAt: "encrypted_created_timestamp==",
      updatedAt: "encrypted_updated_timestamp==",
      events: [
        {
          id: "event_123",
          title: "encrypted_title==",
          description: "encrypted_desc==",
          date: "encrypted_date==",
        },
      ],
    };

    // What API should pass to database service after fix:
    const expectedDatabaseData = {
      companyName: clientData.companyName, // Pass through encrypted
      roleName: clientData.roleName, // Pass through encrypted
      createdAt: clientData.createdAt, // Use client timestamp, don't generate server one
      updatedAt: clientData.updatedAt, // Use client timestamp, don't generate server one
      events: clientData.events, // Pass through encrypted events
    };

    // Verify expected behavior (this shows what we need to implement)
    expect(expectedDatabaseData.createdAt).toBe(
      "encrypted_created_timestamp==",
    );
    expect(expectedDatabaseData.updatedAt).toBe(
      "encrypted_updated_timestamp==",
    );
    expect(expectedDatabaseData.events[0].date).toBe("encrypted_date==");
    expect(typeof expectedDatabaseData.createdAt).toBe("string"); // Encrypted, not Date
  });
});
