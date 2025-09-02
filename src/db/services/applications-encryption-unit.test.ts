import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ApplicationService } from "./applications";
import { ApplicationCreateData } from "../schemas";
import { createEncryptionKey } from "../../utils/client-crypto";
import {
  initializeEncryption,
  clearEncryption,
  getEncryptionMiddleware,
} from "../../utils/encryption-middleware";

describe("ApplicationService Encryption Integration", () => {
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
    vi.restoreAllMocks(); // Restore all mocks after each test
  });

  describe("Data encryption on write operations", () => {
    it("should encrypt data when creating an application with encryption enabled", async () => {
      const encryptionMiddleware = getEncryptionMiddleware();
      const encryptSpy = vi.spyOn(encryptionMiddleware, "encryptForStorage");

      const applicationData: ApplicationCreateData = {
        userId: "test-user-123",
        companyName: "Secret Corp",
        roleName: "Senior Engineer",
        jobBoard: { id: "job-board-1", name: "LinkedIn" },
        workflow: { id: "workflow-1", name: "Standard" },
        applicationType: "cold",
        roleType: "engineer",
        locationType: "remote",
        events: [],
        currentStatus: { id: "not_applied", name: "Not Applied" },
      };

      // This should call encryptForStorage when encryption is enabled
      await applicationService.createApplication(applicationData);

      // Verify encryption middleware was called
      expect(encryptSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: "Secret Corp",
          roleName: "Senior Engineer",
        }),
        "JobApplication",
      );

      encryptSpy.mockRestore();
    });

    it("should NOT encrypt data when encryption is not initialized", async () => {
      // Clear encryption to simulate no user logged in
      clearEncryption();

      const applicationData: ApplicationCreateData = {
        userId: "test-user-123",
        companyName: "Public Corp",
        roleName: "Engineer",
        jobBoard: { id: "job-board-1", name: "LinkedIn" },
        workflow: { id: "workflow-1", name: "Standard" },
        applicationType: "cold",
        roleType: "engineer",
        locationType: "remote",
        events: [],
        currentStatus: { id: "not_applied", name: "Not Applied" },
      };

      // This should succeed without encryption
      const result =
        await applicationService.createApplication(applicationData);

      // Data should be stored as-is without encryption
      expect(result.companyName).toBe("Public Corp");
      expect(result.roleName).toBe("Engineer");
    });

    it("should encrypt data in batch operations with encryption enabled", async () => {
      const encryptionMiddleware = getEncryptionMiddleware();
      const encryptSpy = vi.spyOn(encryptionMiddleware, "encryptForStorage");

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

      await applicationService.createApplicationsBatch(applicationsData);

      // Verify encryption middleware was called for each application
      const applicationCalls = encryptSpy.mock.calls.filter(
        (call) => call[1] === "JobApplication",
      );
      const eventCalls = encryptSpy.mock.calls.filter(
        (call) => call[1] === "ApplicationEvent",
      );

      // Should encrypt 2 applications
      expect(applicationCalls).toHaveLength(2);
      expect(applicationCalls[0][0]).toEqual(
        expect.objectContaining({
          companyName: "Secret Corp 1",
          roleName: "Engineer 1",
        }),
      );
      expect(applicationCalls[1][0]).toEqual(
        expect.objectContaining({
          companyName: "Secret Corp 2",
          roleName: "Engineer 2",
        }),
      );

      // Should encrypt 2 "Application created" events (one for each app)
      expect(eventCalls).toHaveLength(2);
      expect(eventCalls[0][0]).toEqual(
        expect.objectContaining({
          title: "Application created",
          description: "Application tracking started",
        }),
      );
      expect(eventCalls[1][0]).toEqual(
        expect.objectContaining({
          title: "Application created",
          description: "Application tracking started",
        }),
      );

      encryptSpy.mockRestore();
    });
  });

  describe("Backward compatibility", () => {
    it("should handle mixed encrypted/unencrypted data gracefully", async () => {
      // Create a fresh ApplicationService instance to ensure clean state
      const freshApplicationService = new ApplicationService();
      freshApplicationService.enableTestMode();
      freshApplicationService.clearTestStorage();
      // Create one application with encryption
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
        await freshApplicationService.createApplication(encryptedAppData);

      // Clear encryption and create another application
      clearEncryption();

      const unencryptedAppData: ApplicationCreateData = {
        userId: "test-user-123",
        companyName: "Unencrypted Corp",
        roleName: "Unencrypted Engineer",
        jobBoard: { id: "job-board-1", name: "LinkedIn" },
        workflow: { id: "workflow-1", name: "Standard" },
        applicationType: "warm",
        roleType: "manager",
        locationType: "hybrid",
        events: [],
        currentStatus: { id: "not_applied", name: "Not Applied" },
      };

      const unencryptedApp =
        await freshApplicationService.createApplication(unencryptedAppData);

      // Both operations should succeed
      expect(encryptedApp._id).toBeDefined();
      expect(unencryptedApp._id).toBeDefined();

      // The service should be able to retrieve both
      const apps =
        await freshApplicationService.getApplications("test-user-123");

      // Debug: log what we actually found
      console.log("Found apps:", apps.length);
      console.log(
        "App companies:",
        apps.map((app) => app.companyName),
      );

      expect(apps).toHaveLength(2);
    });
  });
});
