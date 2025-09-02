import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ApplicationService } from "./applications";
import { ApplicationCreateData, JobApplication } from "../schemas";
import {
  createEncryptionKey,
  deriveKey,
  encryptString,
} from "../../utils/client-crypto";
import {
  initializeEncryption,
  clearEncryption,
  EncryptionMiddleware,
} from "../../utils/encryption-middleware";

describe("ApplicationService Encryption", () => {
  let applicationService: ApplicationService;
  let encryptionKey: CryptoKey;

  beforeEach(async () => {
    applicationService = new ApplicationService();
    applicationService.enableTestMode(); // Use in-memory storage for unit tests
    applicationService.clearTestStorage();

    encryptionKey = await createEncryptionKey();
    initializeEncryption(encryptionKey);
  });

  afterEach(() => {
    applicationService.disableTestMode();
    clearEncryption();
  });

  describe("Data encryption in database", () => {
    it("should encrypt sensitive fields before storing in database", async () => {
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

      // Create the application
      const createdApp =
        await applicationService.createApplication(applicationData);

      // Now check what was actually stored in the database by accessing the collection directly
      const db = await connectToDatabase();
      const collection = db.collection<JobApplication>("applications");
      const storedApp = await collection.findOne({ _id: createdApp._id });

      expect(storedApp).toBeTruthy();

      // Sensitive fields should be encrypted (not equal to original values)
      expect(storedApp!.companyName).not.toBe("Secret Corp");
      expect(storedApp!.roleName).not.toBe("Senior Engineer");
      expect(storedApp!.jobPostingUrl).not.toBe(
        "https://example.com/secret-job",
      );
      expect(storedApp!.notes).not.toBe("This is confidential information");
      expect(storedApp!.appliedDate).not.toBe("2023-12-01");

      // Encrypted fields should look like base64 strings
      expect(typeof storedApp!.companyName).toBe("string");
      expect(storedApp!.companyName.length).toBeGreaterThan(50); // Encrypted data is longer
      expect(storedApp!.companyName).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 pattern

      // Non-sensitive fields should remain unencrypted
      expect(storedApp!.userId).toBe("test-user-123");
      expect(storedApp!.jobBoard.name).toBe("LinkedIn");
      expect(storedApp!.workflow.name).toBe("Standard");

      // Nested events should also be encrypted
      expect(storedApp!.events[0].title).not.toBe("Applied online");
      expect(storedApp!.events[0].description).not.toBe(
        "Submitted application via company portal",
      );
      expect(storedApp!.events[0].date).not.toBe("2023-12-01T00:00:00.000Z");

      // But event IDs should remain unencrypted
      expect(storedApp!.events[0].id).toBe("event-1");

      // Should have encryption metadata
      expect((storedApp as any)._encrypted).toBe(true);

      // Clean up
      await collection.deleteOne({ _id: createdApp._id });
    });

    it("should encrypt date fields that reveal job-seeking activity", async () => {
      const applicationData: ApplicationCreateData = {
        userId: "test-user-123",
        companyName: "Test Corp",
        roleName: "Engineer",
        jobBoard: { id: "job-board-1", name: "LinkedIn" },
        workflow: { id: "workflow-1", name: "Standard" },
        applicationType: "cold",
        roleType: "engineer",
        locationType: "remote",
        events: [],
        appliedDate: "2023-12-01",
        phoneScreenDate: "2023-12-05",
        round1Date: "2023-12-10",
        currentStatus: { id: "round_1", name: "Round 1" },
      };

      const createdApp =
        await applicationService.createApplication(applicationData);

      // Check what was stored in database
      const db = await connectToDatabase();
      const collection = db.collection<JobApplication>("applications");
      const storedApp = await collection.findOne({ _id: createdApp._id });

      // All date fields should be encrypted (sensitive job-seeking timeline)
      expect(storedApp!.appliedDate).not.toBe("2023-12-01");
      expect(storedApp!.phoneScreenDate).not.toBe("2023-12-05");
      expect(storedApp!.round1Date).not.toBe("2023-12-10");

      // createdAt/updatedAt should also be encrypted
      expect(typeof (storedApp as any).createdAt).toBe("string"); // Should be encrypted string, not Date
      expect(typeof (storedApp as any).updatedAt).toBe("string");

      // Clean up
      await collection.deleteOne({ _id: createdApp._id });
    });

    it("should decrypt data when retrieving from database", async () => {
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

      const createdApp =
        await applicationService.createApplication(applicationData);

      // Retrieve the application using the service method
      const retrievedApp = await applicationService.getApplicationById(
        "test-user-123",
        createdApp._id!,
      );

      expect(retrievedApp).toBeTruthy();

      // Data should be decrypted back to original values
      expect(retrievedApp!.companyName).toBe("Test Corp");
      expect(retrievedApp!.roleName).toBe("Engineer");
      expect(retrievedApp!.appliedDate).toBe("2023-12-01");
      expect(retrievedApp!.events[0].title).toBe("Applied online");
      expect(retrievedApp!.events[0].date).toBe("2023-12-01T00:00:00.000Z");

      // Should not have encryption metadata in returned data
      expect((retrievedApp as any)._encrypted).toBeUndefined();

      // Clean up
      const db = await connectToDatabase();
      const collection = db.collection<JobApplication>("applications");
      await collection.deleteOne({ _id: createdApp._id });
    });

    it("should handle batch application creation with encryption", async () => {
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
          currentStatus: { id: "not_applied", name: "Not Applied" },
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
          currentStatus: { id: "not_applied", name: "Not Applied" },
        },
      ];

      const createdApps =
        await applicationService.createApplicationsBatch(applicationsData);
      expect(createdApps).toHaveLength(2);

      // Check that data was encrypted in database
      const db = await connectToDatabase();
      const collection = db.collection<JobApplication>("applications");

      for (let i = 0; i < createdApps.length; i++) {
        const storedApp = await collection.findOne({ _id: createdApps[i]._id });
        expect(storedApp!.companyName).not.toBe(`Secret Corp ${i + 1}`);
        expect(storedApp!.roleName).not.toBe(`Engineer ${i + 1}`);
        expect((storedApp as any)._encrypted).toBe(true);

        // Clean up
        await collection.deleteOne({ _id: createdApps[i]._id });
      }
    });

    it("should decrypt data when retrieving multiple applications", async () => {
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

      const createdApps =
        await applicationService.createApplicationsBatch(applicationsData);

      // Retrieve applications using service method
      const retrievedApps =
        await applicationService.getApplications("test-user-123");

      expect(retrievedApps.length).toBeGreaterThanOrEqual(2);

      // Find our created apps in the results
      const app1 = retrievedApps.find(
        (app) => app.companyName === "Secret Corp 1",
      );
      const app2 = retrievedApps.find(
        (app) => app.companyName === "Secret Corp 2",
      );

      expect(app1).toBeTruthy();
      expect(app2).toBeTruthy();

      // Data should be decrypted
      expect(app1!.companyName).toBe("Secret Corp 1");
      expect(app1!.roleName).toBe("Engineer 1");
      expect(app1!.appliedDate).toBe("2023-12-01");

      expect(app2!.companyName).toBe("Secret Corp 2");
      expect(app2!.roleName).toBe("Engineer 2");
      expect(app2!.appliedDate).toBe("2023-12-02");

      // Should not have encryption metadata in returned data
      expect((app1 as any)._encrypted).toBeUndefined();
      expect((app2 as any)._encrypted).toBeUndefined();

      // Clean up
      const db = await connectToDatabase();
      const collection = db.collection<JobApplication>("applications");
      await collection.deleteMany({
        _id: { $in: createdApps.map((app) => app._id).filter(Boolean) },
      });
    });
  });
});
