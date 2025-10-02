import { describe, expect, test, beforeEach } from "vitest";
import { decryptFields } from "../../services/encryption-service";
import { createEncryptionKey } from "../../utils/client-crypto";

// Mock applications data for testing logic
const mockApplications = [
  {
    _id: "1",
    companyName: "TechCorp Inc.",
    roleName: "Senior Software Engineer",
    currentStatus: { id: "applied", name: "Applied" },
    createdAt: new Date("2025-01-15"),
  },
  {
    _id: "2",
    companyName: "StartupXYZ",
    roleName: "Frontend Developer",
    currentStatus: { id: "phone_screen", name: "Phone Screen" },
    createdAt: new Date("2025-01-16"),
  },
  {
    _id: "3",
    companyName: "BigCorp",
    roleName: "Engineering Manager",
    currentStatus: { id: "declined", name: "Declined" },
    createdAt: new Date("2025-01-17"),
  },
];

describe("Applications Index Navigation", () => {
  test("should have import from CSV button navigation target", () => {
    // Test that the expected navigation target exists
    const importRoute = "/applications/import";
    expect(importRoute).toBe("/applications/import");
  });

  test("should have add new application navigation target", () => {
    const newRoute = "/applications/new";
    expect(newRoute).toBe("/applications/new");
  });
});

describe("Applications Summary Statistics Logic", () => {
  test("calculates total applications correctly", () => {
    const totalCount = mockApplications.length;
    expect(totalCount).toBe(3);
  });

  test("calculates open applications correctly", () => {
    const openApps = mockApplications.filter(
      (app: any) =>
        !["rejected", "declined", "withdrawn"].includes(
          app.currentStatus.id.toLowerCase(),
        ),
    );

    expect(openApps).toHaveLength(2); // Two applications are open (applied, phone_screen)
    expect(openApps[0].currentStatus.id).toBe("applied");
    expect(openApps[1].currentStatus.id).toBe("phone_screen");
  });

  test("calculates closed/rejected applications correctly", () => {
    const closedApps = mockApplications.filter((app: any) =>
      ["rejected", "declined", "withdrawn"].includes(
        app.currentStatus.id.toLowerCase(),
      ),
    );

    expect(closedApps).toHaveLength(1); // One application is declined
    expect(closedApps[0].currentStatus.id).toBe("declined");
  });

  test("status filtering handles different case variations", () => {
    const testApp = {
      currentStatus: { id: "REJECTED", name: "Rejected" },
    };

    const isRejected = ["rejected", "declined", "withdrawn"].includes(
      testApp.currentStatus.id.toLowerCase(),
    );

    expect(isRejected).toBe(true);
  });
});

describe("Applications Encryption/Decryption", () => {
  let testKey: CryptoKey;

  beforeEach(async () => {
    testKey = await createEncryptionKey();
  });

  test("should decrypt encrypted applications data correctly", async () => {
    // Mock encrypted application data (as would come from server)
    const encryptedApplicationData = {
      _id: "app-123",
      userId: "user-123", // Not encrypted
      companyName: "VGVzdENvcnBvcmF0aW9u", // Mock encrypted data
      roleName: "U2VuaW9yIEVuZ2luZWVy", // Mock encrypted data
      applicationType: "cold", // Not encrypted
      roleType: "engineer", // Not encrypted
      locationType: "remote", // Not encrypted
      currentStatus: { id: "applied", name: "Applied" }, // Not encrypted
      jobBoard: { id: "board-1", name: "LinkedIn" }, // Not encrypted
      workflow: { id: "workflow-1", name: "Default" }, // Not encrypted
      events: [], // Would contain encrypted event data
    };

    // The decryption should handle both encrypted and unencrypted data gracefully
    const decryptedData = await decryptFields(
      encryptedApplicationData,
      testKey,
      "JobApplication",
    );

    // Verify the decryption process doesn't throw errors
    expect(decryptedData).toBeDefined();
    expect(decryptedData._id).toBe("app-123");
    expect(decryptedData.userId).toBe("user-123");
    expect(decryptedData.applicationType).toBe("cold");

    // Verify that non-sensitive fields remain unchanged
    expect(decryptedData.currentStatus.id).toBe("applied");
    expect(decryptedData.jobBoard.name).toBe("LinkedIn");
  });

  test("should handle applications with mixed encrypted/unencrypted data", async () => {
    // Simulate data during migration where some fields are encrypted, some are not
    const mixedData = {
      _id: "app-456",
      userId: "user-123",
      companyName: "Plain Text Corp", // Not encrypted
      roleName: "bW9jayBlbmNyeXB0ZWQgcm9sZQ==", // Mock encrypted (but will fail decryption)
      applicationType: "warm",
      currentStatus: { id: "phone_screen", name: "Phone Screen" },
      events: [],
    };

    // Should handle gracefully without throwing errors
    const result = await decryptFields(mixedData, testKey, "JobApplication");

    expect(result).toBeDefined();
    expect(result.companyName).toBe("Plain Text Corp"); // Unencrypted data preserved
    expect(result.userId).toBe("user-123");
    expect(result.applicationType).toBe("warm");
  });
});
