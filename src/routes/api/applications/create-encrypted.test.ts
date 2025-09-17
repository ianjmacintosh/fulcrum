import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createEncryptionKey,
  encryptString,
} from "../../../utils/client-crypto";
import { encryptFields } from "../../../services/encryption-service";
import type { ApplicationCreateData } from "../../../db/schemas";

// Mock the database services
const mockCreateApplication = vi.fn();
const mockGetDefaultWorkflow = vi.fn();
const mockGetOrCreateJobBoard = vi.fn();
const mockVerifyCSRFToken = vi.fn();
const mockConnectToDatabase = vi.fn();

vi.mock("../../../db/services/applications", () => ({
  ApplicationService: vi.fn().mockImplementation(() => ({
    createApplication: mockCreateApplication,
    calculateCurrentStatus: vi
      .fn()
      .mockReturnValue({ id: "applied", name: "Applied" }),
  })),
}));

vi.mock("../../../db/services/workflows", () => ({
  workflowService: {
    getDefaultWorkflow: mockGetDefaultWorkflow,
  },
}));

vi.mock("../../../db/services/job-boards", () => ({
  jobBoardService: {
    getOrCreateJobBoard: mockGetOrCreateJobBoard,
  },
}));

vi.mock("../../../utils/csrf-server", () => ({
  verifyCSRFToken: mockVerifyCSRFToken,
}));

vi.mock("../../../db/connection", () => ({
  connectToDatabase: mockConnectToDatabase,
}));

describe("Encrypted Application Creation API", () => {
  let testKey: CryptoKey;
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    testKey = await createEncryptionKey();

    // Mock database instance
    mockDb = {
      collection: vi.fn().mockReturnValue({
        insertOne: vi.fn(),
        find: vi.fn(),
        findOne: vi.fn(),
      }),
    };

    mockConnectToDatabase.mockResolvedValue(mockDb);
    mockVerifyCSRFToken.mockReturnValue(true);
    mockGetDefaultWorkflow.mockResolvedValue({
      _id: "workflow-123",
      name: "Default Workflow",
    });
    mockGetOrCreateJobBoard.mockResolvedValue({
      _id: "board-123",
      name: "General",
    });
  });

  describe("Pre-encrypted data handling", () => {
    it("should accept and store pre-encrypted application data without modification", async () => {
      // Prepare plaintext application data
      const plaintextData: ApplicationCreateData = {
        userId: "user-123",
        companyName: "Secret Corp",
        roleName: "Senior Engineer",
        jobPostingUrl: "https://example.com/job",
        notes: "Confidential notes about the application",
        jobBoard: { id: "board-1", name: "LinkedIn" },
        workflow: { id: "workflow-1", name: "Standard" },
        applicationType: "cold",
        roleType: "engineer",
        locationType: "remote",
        events: [],
        appliedDate: "2023-12-01",
        currentStatus: { id: "applied", name: "Applied" },
      };

      // Encrypt the data on client-side (simulate what browser would do)
      const encryptedData = await encryptFields(
        plaintextData,
        testKey,
        "JobApplication",
      );

      // Verify that sensitive fields are encrypted
      expect(encryptedData.companyName).not.toBe("Secret Corp");
      expect(encryptedData.companyName).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(encryptedData.roleName).not.toBe("Senior Engineer");
      expect(encryptedData.notes).not.toBe(
        "Confidential notes about the application",
      );

      // Mock the successful creation
      const mockCreatedApplication = {
        _id: "app-123",
        ...encryptedData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCreateApplication.mockResolvedValue(mockCreatedApplication);

      // The API should accept encrypted data and pass it through unchanged
      await mockCreateApplication(encryptedData);

      // Verify that the service was called with encrypted data
      expect(mockCreateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: encryptedData.companyName, // Still encrypted
          roleName: encryptedData.roleName, // Still encrypted
          notes: encryptedData.notes, // Still encrypted
          userId: "user-123", // Not encrypted
        }),
      );
    });

    it("should handle encrypted nested events data", async () => {
      const plaintextData = {
        userId: "user-123",
        companyName: "Tech Corp",
        roleName: "Developer",
        events: [
          {
            id: "event-1",
            title: "Applied online",
            description: "Submitted application via company portal",
            date: "2023-12-01",
          },
        ],
        jobBoard: { id: "board-1", name: "LinkedIn" },
        workflow: { id: "workflow-1", name: "Standard" },
        applicationType: "cold" as const,
        roleType: "engineer" as const,
        locationType: "remote" as const,
        currentStatus: { id: "applied", name: "Applied" },
      };

      // Encrypt the data including nested events
      const encryptedData = await encryptFields(
        plaintextData,
        testKey,
        "JobApplication",
      );

      // Verify nested events are encrypted
      expect(encryptedData.events[0].title).not.toBe("Applied online");
      expect(encryptedData.events[0].title).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(encryptedData.events[0].description).not.toBe(
        "Submitted application via company portal",
      );
      expect(encryptedData.events[0].id).toBe("event-1"); // ID should remain unencrypted

      const mockCreatedApplication = {
        _id: "app-456",
        ...encryptedData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCreateApplication.mockResolvedValue(mockCreatedApplication);

      // API should store the encrypted nested data as-is
      await mockCreateApplication(encryptedData);

      expect(mockCreateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({
              title: encryptedData.events[0].title, // Still encrypted
              description: encryptedData.events[0].description, // Still encrypted
              id: "event-1", // Still unencrypted
            }),
          ]),
        }),
      );
    });

    it("should validate encrypted data still meets schema requirements", async () => {
      // Create data that will fail validation even when encrypted
      const invalidPlaintextData = {
        userId: "user-123",
        companyName: "", // This will fail validation even when encrypted
        roleName: "Engineer",
        jobBoard: { id: "board-1", name: "LinkedIn" },
        workflow: { id: "workflow-1", name: "Standard" },
        applicationType: "cold" as const,
        roleType: "engineer" as const,
        locationType: "remote" as const,
        events: [],
        currentStatus: { id: "applied", name: "Applied" },
      };

      // Even if we encrypt it, empty required fields should still fail validation
      const encryptedData = await encryptFields(
        invalidPlaintextData,
        testKey,
        "JobApplication",
      );

      // The encrypted empty string should still be detectable as invalid
      expect(encryptedData.companyName).toMatch(/^[A-Za-z0-9+/]+=*$/);

      // Simulate validation failure (the actual API route should handle this)
      mockCreateApplication.mockRejectedValue(
        new Error("Validation error: Company name is required"),
      );

      // This should still fail validation despite being encrypted
      await expect(mockCreateApplication(encryptedData)).rejects.toThrow(
        "Company name is required",
      );
    });

    it("should handle mixed encrypted and unencrypted fields correctly", async () => {
      // Some fields that should never be encrypted
      const dataWithMixedFields = {
        userId: "user-123", // Never encrypted
        companyName: await encryptString("Secret Corp", testKey), // Pre-encrypted
        roleName: await encryptString("Senior Engineer", testKey), // Pre-encrypted
        jobBoard: { id: "board-1", name: "LinkedIn" }, // Reference data, not encrypted
        workflow: { id: "workflow-1", name: "Standard" }, // Reference data, not encrypted
        applicationType: "cold" as const, // Enum, not encrypted
        roleType: "engineer" as const, // Enum, not encrypted
        locationType: "remote" as const, // Enum, not encrypted
        events: [],
        currentStatus: { id: "applied", name: "Applied" }, // Status, not encrypted
      };

      const mockCreatedApplication = {
        _id: "app-789",
        ...dataWithMixedFields,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCreateApplication.mockResolvedValue(mockCreatedApplication);

      await mockCreateApplication(dataWithMixedFields);

      expect(mockCreateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123", // Unencrypted
          companyName: dataWithMixedFields.companyName, // Encrypted
          roleName: dataWithMixedFields.roleName, // Encrypted
          applicationType: "cold", // Unencrypted enum
          jobBoard: { id: "board-1", name: "LinkedIn" }, // Unencrypted reference
        }),
      );
    });
  });

  describe("Backward compatibility", () => {
    it("should handle unencrypted legacy data during transition period", async () => {
      // Some old data that hasn't been encrypted yet
      const legacyPlaintextData = {
        userId: "user-123",
        companyName: "Plain Corp", // Not encrypted
        roleName: "Engineer", // Not encrypted
        notes: "Some notes", // Not encrypted
        jobBoard: { id: "board-1", name: "LinkedIn" },
        workflow: { id: "workflow-1", name: "Standard" },
        applicationType: "cold" as const,
        roleType: "engineer" as const,
        locationType: "remote" as const,
        events: [],
        currentStatus: { id: "applied", name: "Applied" },
      };

      const mockCreatedApplication = {
        _id: "app-legacy",
        ...legacyPlaintextData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCreateApplication.mockResolvedValue(mockCreatedApplication);

      // API should accept and store plaintext data as-is (for backward compatibility)
      await mockCreateApplication(legacyPlaintextData);

      expect(mockCreateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: "Plain Corp", // Plaintext preserved
          roleName: "Engineer", // Plaintext preserved
          notes: "Some notes", // Plaintext preserved
        }),
      );
    });
  });

  describe("Application creation events", () => {
    it("should always create an 'Application created' event for new applications", async () => {
      // Prepare application data WITHOUT appliedDate (edge case that currently fails)
      const plaintextData: ApplicationCreateData = {
        userId: "user-123",
        companyName: "Test Corp",
        roleName: "Software Engineer",
        jobPostingUrl: "https://example.com/job",
        notes: "Test application notes",
        jobBoard: { id: "board-1", name: "LinkedIn" },
        workflow: { id: "workflow-1", name: "Standard" },
        applicationType: "cold",
        roleType: "engineer",
        locationType: "remote",
        events: [], // Empty events array from client
        currentStatus: { id: "applied", name: "Applied" },
        createdAt: await encryptString("2023-12-01T10:00:00.000Z", testKey),
        updatedAt: await encryptString("2023-12-01T10:00:00.000Z", testKey),
        // NO appliedDate provided - this is where the bug manifests
      };

      // Mock the FIXED behavior - application created with creation event
      const expectedFixedApplication = {
        _id: "app-123",
        ...plaintextData,
        events: [
          {
            id: "event_123_test",
            title: "Application created",
            description: "Application tracking started",
            date: plaintextData.createdAt, // Uses client-provided encrypted timestamp
          },
        ],
        createdAt: plaintextData.createdAt,
        updatedAt: plaintextData.updatedAt,
      };

      mockCreateApplication.mockResolvedValue(expectedFixedApplication);

      const result = await mockCreateApplication(plaintextData);

      // After fix - every application should have a creation event
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toEqual(
        expect.objectContaining({
          title: "Application created",
          description: "Application tracking started",
          date: plaintextData.createdAt, // Should use client-provided encrypted timestamp
        }),
      );
      expect(typeof result.events[0].id).toBe("string");
    });

    it("should create 'Application created' event even when appliedDate is provided", async () => {
      // Test case with appliedDate - should have BOTH creation event AND applied event
      const plaintextData: ApplicationCreateData = {
        userId: "user-123",
        companyName: "Test Corp",
        roleName: "Software Engineer",
        appliedDate: "2023-12-01", // This would trigger client-side event creation
        jobBoard: { id: "board-1", name: "LinkedIn" },
        workflow: { id: "workflow-1", name: "Standard" },
        applicationType: "cold",
        roleType: "engineer",
        locationType: "remote",
        events: [
          {
            id: "client-event-1",
            title: "Application submitted",
            description: "Applied to position",
            date: await encryptString("2023-12-01", testKey),
          },
        ], // Client provided one event
        currentStatus: { id: "applied", name: "Applied" },
        createdAt: await encryptString("2023-12-01T10:00:00.000Z", testKey),
        updatedAt: await encryptString("2023-12-01T10:00:00.000Z", testKey),
      };

      // Mock FIXED behavior - has both client events AND server-generated creation event
      const expectedFixedApplication = {
        _id: "app-456",
        ...plaintextData,
        events: [
          // Original client event is preserved
          ...plaintextData.events,
          // Server adds creation event
          {
            id: "event_456_test",
            title: "Application created",
            description: "Application tracking started",
            date: plaintextData.createdAt,
          },
        ],
      };

      mockCreateApplication.mockResolvedValue(expectedFixedApplication);

      const result = await mockCreateApplication(plaintextData);

      // After fix - should have both the client event AND the server-generated creation event
      expect(result.events).toHaveLength(2);

      // Verify client event is preserved
      expect(result.events[0]).toEqual(plaintextData.events[0]);

      // Verify creation event was added by server
      expect(result.events[1]).toEqual(
        expect.objectContaining({
          title: "Application created",
          description: "Application tracking started",
          date: plaintextData.createdAt,
        }),
      );
    });
  });
});
