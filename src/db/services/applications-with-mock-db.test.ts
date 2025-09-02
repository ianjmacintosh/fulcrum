import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ApplicationService } from "./applications";
import { ApplicationCreateData } from "../schemas";
import {
  encryptString,
  decryptString,
  createEncryptionKey,
} from "../../utils/client-crypto";
import { createMockDb, MockDb } from "../__mocks__/mock-db-client";

describe("ApplicationService with Mock Database - Client-side Encryption", () => {
  let applicationService: ApplicationService;
  let mockDb: MockDb;
  let clientEncryptionKey: CryptoKey;

  beforeEach(async () => {
    mockDb = createMockDb();
    applicationService = new ApplicationService(mockDb as any);

    // Client-side encryption key (would be derived from user password in real app)
    clientEncryptionKey = await createEncryptionKey();
  });

  afterEach(() => {
    mockDb.clearAll();
  });

  describe("Data encryption with mock database", () => {
    it("should encrypt data before storing and return encrypted data from database", async () => {
      const applicationData: ApplicationCreateData = {
        userId: "test-user-123",
        companyName: "Secret Corp",
        roleName: "Senior Engineer",
        jobPostingUrl: "https://example.com/secret-job",
        notes: "This is confidential information",
        jobBoard: { id: "job-board-1", name: "LinkedIn" },
        workflow: { id: "workflow-1", name: "Standard" },
        applicationType: "cold",
        roleType: "engineer",
        locationType: "remote",
        events: [
          {
            id: "event-1",
            title: "Applied online",
            description: "Submitted application via company portal",
            date: "2023-12-01T00:00:00.000Z",
          },
        ],
        appliedDate: "2023-12-01",
        currentStatus: { id: "applied", name: "Applied" },
      };

      // Create the application (should encrypt before storing)
      const createdApp =
        await applicationService.createApplication(applicationData);

      // Verify the returned application has unencrypted data (what user expects)
      expect(createdApp.companyName).toBe("Secret Corp");
      expect(createdApp.roleName).toBe("Senior Engineer");
      expect(createdApp.jobPostingUrl).toBe("https://example.com/secret-job");

      // Now check what was actually stored in the mock database
      const collection = mockDb.collection("applications");
      const storedApp = await collection.findOne({ _id: createdApp._id });

      expect(storedApp).toBeTruthy();

      // Sensitive fields should be encrypted in storage (not equal to original values)
      expect(storedApp!.companyName).not.toBe("Secret Corp");
      expect(storedApp!.roleName).not.toBe("Senior Engineer");
      expect(storedApp!.jobPostingUrl).not.toBe(
        "https://example.com/secret-job",
      );
      expect(storedApp!.notes).not.toBe("This is confidential information");
      expect(storedApp!.appliedDate).not.toBe("2023-12-01");

      // Encrypted fields should look like base64 strings
      expect(typeof storedApp!.companyName).toBe("string");
      expect(storedApp!.companyName.length).toBeGreaterThan(50);
      expect(storedApp!.companyName).toMatch(/^[A-Za-z0-9+/]+=*$/);

      // Non-sensitive fields should remain unencrypted
      expect(storedApp!.userId).toBe("test-user-123");
      expect(storedApp!.jobBoard.name).toBe("LinkedIn");

      // Should have encryption metadata
      expect((storedApp as any)._encrypted).toBe(true);
    });

    it("should return decrypted data when retrieving applications", async () => {
      const applicationData: ApplicationCreateData = {
        userId: "test-user-123",
        companyName: "Test Corp",
        roleName: "Engineer",
        jobBoard: { id: "job-board-1", name: "LinkedIn" },
        workflow: { id: "workflow-1", name: "Standard" },
        applicationType: "cold",
        roleType: "engineer",
        locationType: "remote",
        events: [
          {
            id: "event-1",
            title: "Applied online",
            date: "2023-12-01T00:00:00.000Z",
          },
        ],
        appliedDate: "2023-12-01",
        currentStatus: { id: "applied", name: "Applied" },
      };

      // Create and store encrypted application
      const createdApp =
        await applicationService.createApplication(applicationData);

      // Retrieve by ID - should return decrypted data
      const retrievedApp = await applicationService.getApplicationById(
        "test-user-123",
        createdApp._id!,
      );

      expect(retrievedApp).toBeTruthy();
      expect(retrievedApp!.companyName).toBe("Test Corp");
      expect(retrievedApp!.roleName).toBe("Engineer");
      expect(retrievedApp!.appliedDate).toBe("2023-12-01");
      expect(retrievedApp!.events[0].title).toBe("Applied online");

      // Should not have encryption metadata in returned data
      expect((retrievedApp as any)._encrypted).toBeUndefined();
    });

    it("should return decrypted data when retrieving multiple applications", async () => {
      const applicationsData: ApplicationCreateData[] = [
        {
          userId: "test-user-123",
          companyName: "Secret Corp 1",
          roleName: "Engineer 1",
          jobBoard: { id: "job-board-1", name: "LinkedIn" },
          workflow: { id: "workflow-1", name: "Standard" },
          applicationType: "cold",
          roleType: "engineer",
          locationType: "remote",
          events: [],
          appliedDate: "2023-12-01",
          currentStatus: { id: "applied", name: "Applied" },
        },
        {
          userId: "test-user-123",
          companyName: "Secret Corp 2",
          roleName: "Engineer 2",
          jobBoard: { id: "job-board-1", name: "LinkedIn" },
          workflow: { id: "workflow-1", name: "Standard" },
          applicationType: "warm",
          roleType: "manager",
          locationType: "hybrid",
          events: [],
          appliedDate: "2023-12-02",
          currentStatus: { id: "applied", name: "Applied" },
        },
      ];

      // Create batch of applications
      await applicationService.createApplicationsBatch(applicationsData);

      // Retrieve all applications - should return decrypted data
      const retrievedApps =
        await applicationService.getApplications("test-user-123");

      expect(retrievedApps).toHaveLength(2);

      const app1 = retrievedApps.find(
        (app) => app.companyName === "Secret Corp 1",
      );
      const app2 = retrievedApps.find(
        (app) => app.companyName === "Secret Corp 2",
      );

      expect(app1).toBeTruthy();
      expect(app2).toBeTruthy();

      expect(app1!.roleName).toBe("Engineer 1");
      expect(app1!.appliedDate).toBe("2023-12-01");

      expect(app2!.roleName).toBe("Engineer 2");
      expect(app2!.appliedDate).toBe("2023-12-02");

      // Should not have encryption metadata in returned data
      expect((app1 as any)._encrypted).toBeUndefined();
      expect((app2 as any)._encrypted).toBeUndefined();
    });

    it("should verify encryption middleware is called during operations", async () => {
      const encryptionMiddleware = getEncryptionMiddleware();
      const encryptSpy = vi.spyOn(encryptionMiddleware, "encryptForStorage");
      const decryptSpy = vi.spyOn(encryptionMiddleware, "decryptFromStorage");

      const applicationData: ApplicationCreateData = {
        userId: "test-user-123",
        companyName: "Spy Test Corp",
        roleName: "Test Engineer",
        jobBoard: { id: "job-board-1", name: "LinkedIn" },
        workflow: { id: "workflow-1", name: "Standard" },
        applicationType: "cold",
        roleType: "engineer",
        locationType: "remote",
        events: [],
        currentStatus: { id: "not_applied", name: "Not Applied" },
      };

      // Create application - should encrypt
      const createdApp =
        await applicationService.createApplication(applicationData);

      // Verify encryption was called
      expect(encryptSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: "Spy Test Corp",
          roleName: "Test Engineer",
        }),
        "JobApplication",
      );

      // Retrieve application - should decrypt
      await applicationService.getApplicationById(
        "test-user-123",
        createdApp._id!,
      );

      // Verify decryption was called
      expect(decryptSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: expect.not.stringMatching("Spy Test Corp"), // Should be encrypted
        }),
        "JobApplication",
      );

      encryptSpy.mockRestore();
      decryptSpy.mockRestore();
    });

    it("should handle mixed encrypted/unencrypted data from database", async () => {
      // First create an application with encryption enabled
      const encryptedAppData: ApplicationCreateData = {
        userId: "test-user-123",
        companyName: "Encrypted Corp",
        roleName: "Encrypted Engineer",
        jobBoard: { id: "job-board-1", name: "LinkedIn" },
        workflow: { id: "workflow-1", name: "Standard" },
        applicationType: "cold",
        roleType: "engineer",
        locationType: "remote",
        events: [],
        currentStatus: { id: "not_applied", name: "Not Applied" },
      };

      const encryptedApp =
        await applicationService.createApplication(encryptedAppData);

      // Clear encryption and manually insert unencrypted data to simulate legacy data
      clearEncryption();

      const collection = mockDb.collection("applications");
      const unencryptedAppData = {
        userId: "test-user-123",
        companyName: "Unencrypted Corp", // Not encrypted
        roleName: "Unencrypted Engineer",
        jobBoard: { id: "job-board-1", name: "LinkedIn" },
        workflow: { id: "workflow-1", name: "Standard" },
        applicationType: "warm" as const,
        roleType: "manager" as const,
        locationType: "hybrid" as const,
        events: [],
        currentStatus: { id: "not_applied", name: "Not Applied" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await collection.insertOne(unencryptedAppData);

      // Re-enable encryption for reading
      initializeEncryption(encryptionKey);

      // Retrieve all applications - should handle mixed data correctly
      const apps = await applicationService.getApplications("test-user-123");
      expect(apps).toHaveLength(2);

      const encryptedResult = apps.find(
        (app) => app.companyName === "Encrypted Corp",
      );
      const unencryptedResult = apps.find(
        (app) => app.companyName === "Unencrypted Corp",
      );

      expect(encryptedResult).toBeTruthy();
      expect(unencryptedResult).toBeTruthy();

      expect(encryptedResult!.roleName).toBe("Encrypted Engineer");
      expect(unencryptedResult!.roleName).toBe("Unencrypted Engineer");
    });
  });
});
