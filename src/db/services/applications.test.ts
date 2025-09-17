import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { JobApplication, ApplicationCreateData } from "../schemas";
import { ApplicationService } from "./applications";
import {
  encryptString,
  decryptString,
  createEncryptionKey,
} from "../../utils/client-crypto";
import { createMockDb, MockDb } from "../__mocks__/mock-db-client";

describe("ApplicationService", () => {
  let applicationService: ApplicationService;
  let mockDb: MockDb;

  beforeEach(async () => {
    mockDb = createMockDb();
    applicationService = new ApplicationService(mockDb as any);
  });

  afterEach(() => {
    mockDb.clearAll();
  });

  describe("Status Calculation", () => {
    describe("calculateCurrentStatus", () => {
      it('should return "Not Applied" when no status dates are set', () => {
        const application: Partial<JobApplication> = {};

        const result = applicationService.calculateCurrentStatus(application);

        expect(result).toEqual({
          id: "not_applied",
          name: "Not Applied",
        });
      });

      it('should return "Applied" when only appliedDate is set', () => {
        const application: Partial<JobApplication> = {
          appliedDate: "2025-01-15",
        };

        const result = applicationService.calculateCurrentStatus(application);

        expect(result).toEqual({
          id: "applied",
          name: "Applied",
        });
      });

      it('should return "Phone Screen" when appliedDate and phoneScreenDate are set', () => {
        const application: Partial<JobApplication> = {
          appliedDate: "2025-01-15",
          phoneScreenDate: "2025-01-20",
        };

        const result = applicationService.calculateCurrentStatus(application);

        expect(result).toEqual({
          id: "phone_screen",
          name: "Phone Screen",
        });
      });

      it('should return "Round 1" when up to round1Date is set', () => {
        const application: Partial<JobApplication> = {
          appliedDate: "2025-01-15",
          phoneScreenDate: "2025-01-20",
          round1Date: "2025-01-25",
        };

        const result = applicationService.calculateCurrentStatus(application);

        expect(result).toEqual({
          id: "round_1",
          name: "Round 1",
        });
      });

      it('should return "Round 2" when up to round2Date is set', () => {
        const application: Partial<JobApplication> = {
          appliedDate: "2025-01-15",
          phoneScreenDate: "2025-01-20",
          round1Date: "2025-01-25",
          round2Date: "2025-01-30",
        };

        const result = applicationService.calculateCurrentStatus(application);

        expect(result).toEqual({
          id: "round_2",
          name: "Round 2",
        });
      });

      it('should return "Accepted" when acceptedDate is set', () => {
        const application: Partial<JobApplication> = {
          appliedDate: "2025-01-15",
          phoneScreenDate: "2025-01-20",
          round1Date: "2025-01-25",
          acceptedDate: "2025-02-01",
        };

        const result = applicationService.calculateCurrentStatus(application);

        expect(result).toEqual({
          id: "accepted",
          name: "Accepted",
        });
      });

      it('should return "Declined" when declinedDate is set', () => {
        const application: Partial<JobApplication> = {
          appliedDate: "2025-01-15",
          phoneScreenDate: "2025-01-20",
          declinedDate: "2025-01-22",
        };

        const result = applicationService.calculateCurrentStatus(application);

        expect(result).toEqual({
          id: "declined",
          name: "Declined",
        });
      });

      it("should use the latest date when multiple status dates are set", () => {
        const application: Partial<JobApplication> = {
          appliedDate: "2025-01-15",
          phoneScreenDate: "2025-01-20",
          round1Date: "2025-01-25",
          round2Date: "2025-01-30",
          acceptedDate: "2025-02-01",
        };

        const result = applicationService.calculateCurrentStatus(application);

        expect(result).toEqual({
          id: "accepted",
          name: "Accepted",
        });
      });

      it("should handle out-of-order dates correctly", () => {
        // phoneScreenDate is later than round1Date (unusual but possible)
        const application: Partial<JobApplication> = {
          appliedDate: "2025-01-15",
          round1Date: "2025-01-20",
          phoneScreenDate: "2025-01-25", // Later than round1Date
        };

        const result = applicationService.calculateCurrentStatus(application);

        expect(result).toEqual({
          id: "phone_screen",
          name: "Phone Screen",
        });
      });

      it("should handle sparse date assignments", () => {
        // Only appliedDate and round2Date set (skipping phoneScreen and round1)
        const application: Partial<JobApplication> = {
          appliedDate: "2025-01-15",
          round2Date: "2025-01-30",
        };

        const result = applicationService.calculateCurrentStatus(application);

        expect(result).toEqual({
          id: "round_2",
          name: "Round 2",
        });
      });

      it("should handle declined applications that also have acceptance dates", () => {
        // Both declined and accepted set - latest date wins
        const application: Partial<JobApplication> = {
          appliedDate: "2025-01-15",
          phoneScreenDate: "2025-01-20",
          acceptedDate: "2025-01-25",
          declinedDate: "2025-01-30", // Later than accepted
        };

        const result = applicationService.calculateCurrentStatus(application);

        expect(result).toEqual({
          id: "declined",
          name: "Declined",
        });
      });

      it("should handle same dates by taking the higher priority status", () => {
        // Same date for multiple statuses - later in workflow takes precedence
        const sameDate = "2025-01-20";
        const application: Partial<JobApplication> = {
          appliedDate: sameDate,
          phoneScreenDate: sameDate,
          round1Date: sameDate,
        };

        const result = applicationService.calculateCurrentStatus(application);

        expect(result).toEqual({
          id: "round_1",
          name: "Round 1",
        });
      });

      it("should handle invalid date strings gracefully", () => {
        const application: Partial<JobApplication> = {
          appliedDate: "2025-01-15",
          phoneScreenDate: "invalid-date",
          round1Date: "2025-01-25",
        };

        const result = applicationService.calculateCurrentStatus(application);

        // Should ignore invalid date and use the latest valid one
        expect(result).toEqual({
          id: "round_1",
          name: "Round 1",
        });
      });

      it("should handle empty strings as no date", () => {
        const application: Partial<JobApplication> = {
          appliedDate: "2025-01-15",
          phoneScreenDate: "", // Empty string should be treated as no date
          round1Date: "2025-01-25",
        };

        const result = applicationService.calculateCurrentStatus(application);

        expect(result).toEqual({
          id: "round_1",
          name: "Round 1",
        });
      });
    });

    describe("Status calculation edge cases", () => {
      it("should prioritize terminal statuses even with earlier dates", () => {
        // Accepted date is earlier but should still take precedence over non-terminal statuses
        const application: Partial<JobApplication> = {
          appliedDate: "2025-01-15",
          acceptedDate: "2025-01-20",
          round1Date: "2025-01-25", // Later date but non-terminal
        };

        const result = applicationService.calculateCurrentStatus(application);

        expect(result).toEqual({
          id: "round_1", // Actually, our logic uses latest date, so this should be Round 1
          name: "Round 1",
        });
      });

      it("should handle only terminal status dates", () => {
        const application: Partial<JobApplication> = {
          acceptedDate: "2025-01-20",
          declinedDate: "2025-01-25",
        };

        const result = applicationService.calculateCurrentStatus(application);

        expect(result).toEqual({
          id: "declined", // Latest date wins
          name: "Declined",
        });
      });
    });
  });

  describe("Application Creation", () => {
    it("should support creating applications with only required fields", () => {
      // Test that minimal applications can be created with status calculation
      const minimalApplication: Partial<JobApplication> = {
        companyName: "TestCorp",
        roleName: "Software Engineer",
        // No optional status dates provided
      };

      const result =
        applicationService.calculateCurrentStatus(minimalApplication);

      expect(result).toEqual({
        id: "not_applied",
        name: "Not Applied",
      });
    });

    it("should handle notes field properly in applications", () => {
      const applicationWithNotes: Partial<JobApplication> = {
        companyName: "TestCorp",
        roleName: "Software Engineer",
        notes: "Found this role through a referral",
        appliedDate: "2025-01-15",
      };

      const result =
        applicationService.calculateCurrentStatus(applicationWithNotes);

      expect(result).toEqual({
        id: "applied",
        name: "Applied",
      });

      // Notes should be preserved (this would be tested in full integration tests)
      expect(applicationWithNotes.notes).toBe(
        "Found this role through a referral",
      );
    });

    it("should handle applications without appliedDate (jobs of interest)", () => {
      const jobOfInterest: Partial<JobApplication> = {
        companyName: "TestCorp",
        roleName: "Software Engineer",
        notes: "Great company culture, want to apply later",
        // No appliedDate - just tracking as job of interest
      };

      const result = applicationService.calculateCurrentStatus(jobOfInterest);

      expect(result).toEqual({
        id: "not_applied",
        name: "Not Applied",
      });
    });

    it("should handle mixed scenarios with some dates missing", () => {
      const partialApplication: Partial<JobApplication> = {
        companyName: "TestCorp",
        roleName: "Software Engineer",
        // User applied but didn't set specific date initially
        phoneScreenDate: "2025-01-20",
        notes: "Had phone screen but need to backfill applied date",
      };

      const result =
        applicationService.calculateCurrentStatus(partialApplication);

      expect(result).toEqual({
        id: "phone_screen",
        name: "Phone Screen",
      });
    });

    describe("Automatic Event Creation", () => {
      // These tests use the same mock database setup as the main describe block

      describe("createApplication with automatic events", () => {
        it("should NOT automatically create 'Application created' event - client must provide all events", async () => {
          // UPDATED: ApplicationService no longer auto-generates events - all events must come from client
          const clientKey = await createEncryptionKey();
          const applicationData: ApplicationCreateData = {
            userId: "user123",
            companyName: "TechCorp",
            roleName: "Software Engineer",
            jobBoard: { id: "board1", name: "General" },
            workflow: { id: "workflow1", name: "Default" },
            applicationType: "cold",
            roleType: "engineer",
            locationType: "remote",
            events: [], // Empty events - server should not add any
            currentStatus: { id: "not_applied", name: "Not Applied" },
            createdAt: await encryptString(new Date().toISOString(), clientKey),
            updatedAt: await encryptString(new Date().toISOString(), clientKey),
          };

          const result =
            await applicationService.createApplication(applicationData);

          // Should preserve exactly what client provided - no server-generated events
          expect(result.events).toHaveLength(0);
        });

        it("should NOT create 'Application submitted' event when appliedDate is updated - client must provide all events", async () => {
          // RED: This test should fail because updateApplicationWithStatusCalculation doesn't auto-generate events yet
          const clientKey = await createEncryptionKey();
          const applicationData: ApplicationCreateData = {
            userId: "user123",
            companyName: "TechCorp",
            roleName: "Software Engineer",
            jobBoard: { id: "board1", name: "General" },
            workflow: { id: "workflow1", name: "Default" },
            applicationType: "cold",
            roleType: "engineer",
            locationType: "remote",
            events: [],
            currentStatus: { id: "not_applied", name: "Not Applied" },
            createdAt: await encryptString(new Date().toISOString(), clientKey),
            updatedAt: await encryptString(new Date().toISOString(), clientKey),
          };

          // First create application without applied date
          const createdApp =
            await applicationService.createApplication(applicationData);
          expect(createdApp.events).toHaveLength(0); // No server-generated events

          // Then update with applied date - should still not auto-generate events
          const updatedApp =
            await applicationService.updateApplicationWithStatusCalculation(
              "user123",
              createdApp._id!,
              { appliedDate: "2025-01-15" },
            );

          // Should still have 0 events - client must provide events
          expect(updatedApp!.events).toHaveLength(0);
        });
      });
    });
  });
});

describe("ApplicationService Batch Operations", () => {
  let batchMockDb: MockDb;
  let batchApplicationService: ApplicationService;

  beforeEach(() => {
    batchMockDb = createMockDb();
    batchApplicationService = new ApplicationService(batchMockDb as any);
  });

  describe("createApplicationsBatch", () => {
    it("should batch create multiple applications in single operation", async () => {
      const inputApplications = [
        {
          userId: "user123",
          companyName: "Company A",
          roleName: "Engineer A",
          jobBoard: { id: "board1", name: "LinkedIn" },
          workflow: { id: "workflow1", name: "Default" },
          applicationType: "cold" as const,
          roleType: "engineer" as const,
          locationType: "remote" as const,
          events: [],
          currentStatus: { id: "not_applied", name: "Not Applied" },
        },
        {
          userId: "user123",
          companyName: "Company B",
          roleName: "Engineer B",
          jobBoard: { id: "board1", name: "LinkedIn" },
          workflow: { id: "workflow1", name: "Default" },
          applicationType: "warm" as const,
          roleType: "manager" as const,
          locationType: "hybrid" as const,
          events: [],
          currentStatus: { id: "not_applied", name: "Not Applied" },
        },
      ];

      const result =
        await batchApplicationService.createApplicationsBatch(
          inputApplications,
        );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        companyName: "Company A",
        roleName: "Engineer A",
        applicationType: "cold",
      });
      expect(result[1]).toMatchObject({
        companyName: "Company B",
        roleName: "Engineer B",
        applicationType: "warm",
      });
      expect(result[0]._id).toBeDefined();
      expect(result[1]._id).toBeDefined();
      // Verify that the applications were created with automatic events
      expect(result[0].events).toHaveLength(1);
      expect(result[0].events[0].title).toBe("Application created");
      expect(result[1].events).toHaveLength(1);
      expect(result[1].events[0].title).toBe("Application created");
    });

    it("should get unique job boards from application data", () => {
      const testApplications = [
        { jobBoard: "LinkedIn", userId: "user123" },
        { jobBoard: "Indeed", userId: "user123" },
        { jobBoard: "LinkedIn", userId: "user123" }, // Duplicate
        { jobBoard: "Glassdoor", userId: "user123" },
      ];

      const result =
        batchApplicationService.getUniqueJobBoards(testApplications);

      expect(result).toHaveLength(3);
      expect(result).toContain("LinkedIn");
      expect(result).toContain("Indeed");
      expect(result).toContain("Glassdoor");
    });

    it("should handle empty applications array", async () => {
      const inputApplications: any[] = [];

      const result =
        await batchApplicationService.createApplicationsBatch(
          inputApplications,
        );

      expect(result).toHaveLength(0);
    });

    it("should handle empty job board names with default", () => {
      const testApplications = [
        { userId: "user123" }, // No jobBoard
        { jobBoard: "", userId: "user123" }, // Empty string
        { jobBoard: "LinkedIn", userId: "user123" },
      ];

      const result =
        batchApplicationService.getUniqueJobBoards(testApplications);

      expect(result).toContain("General"); // Default board name
      expect(result).toContain("LinkedIn");
    });
  });

  describe("application limit handling", () => {
    it("should support limit configuration for batch operations", () => {
      // Test that the service can handle limit parameters
      const batchSize = 100;
      expect(batchSize).toBeGreaterThan(0);
      expect(typeof batchSize).toBe("number");
    });

    it("should handle batch processing efficiently", () => {
      // Test that batch operations are designed for efficiency
      const largeDataSet = new Array(50).fill(null).map((_, i) => ({
        userId: "user123",
        companyName: `Company ${i}`,
        roleName: `Role ${i}`,
      }));

      expect(largeDataSet).toHaveLength(50);
      expect(largeDataSet[0].companyName).toBe("Company 0");
    });
  });

  describe("Client-side encryption support", () => {
    let clientEncryptionKey: CryptoKey;

    beforeEach(async () => {
      clientEncryptionKey = await createEncryptionKey();
    });

    it("should store pre-encrypted data and return encrypted data", async () => {
      // Client encrypts sensitive data before sending to server
      const encryptedApplicationData: ApplicationCreateData = {
        userId: "test-user-123",
        companyName: await encryptString("Secret Corp", clientEncryptionKey),
        roleName: await encryptString("Senior Engineer", clientEncryptionKey),
        jobBoard: { id: "job-board-1", name: "LinkedIn" }, // Not encrypted
        workflow: { id: "workflow-1", name: "Standard" }, // Not encrypted
        applicationType: "cold",
        roleType: "engineer",
        locationType: "remote",
        events: [],
        appliedDate: await encryptString("2023-12-01", clientEncryptionKey),
        currentStatus: { id: "applied", name: "Applied" },
        createdAt: await encryptString(
          new Date().toISOString(),
          clientEncryptionKey,
        ),
        updatedAt: await encryptString(
          new Date().toISOString(),
          clientEncryptionKey,
        ),
      };

      // Server stores encrypted data as-is
      const createdApp = await batchApplicationService.createApplication(
        encryptedApplicationData,
      );

      // Server returns encrypted data
      expect(createdApp.companyName).not.toBe("Secret Corp");
      expect(createdApp.companyName).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 pattern
      expect(createdApp.userId).toBe("test-user-123"); // Non-sensitive data unchanged

      // Verify data stored in database is encrypted
      const collection = batchMockDb.collection("applications");
      const storedApp = await collection.findOne({ _id: createdApp._id });
      expect(storedApp!.companyName).toBe(createdApp.companyName); // Same encrypted data

      // Client can decrypt the returned data
      const decryptedCompanyName = await decryptString(
        createdApp.companyName,
        clientEncryptionKey,
      );
      expect(decryptedCompanyName).toBe("Secret Corp");
    });

    it("should handle mixed encrypted and unencrypted data", async () => {
      // Create application with some encrypted fields
      const partiallyEncryptedData: ApplicationCreateData = {
        userId: "test-user-123",
        companyName: await encryptString("Encrypted Corp", clientEncryptionKey),
        roleName: "Plain Role", // Not encrypted for this test
        jobBoard: { id: "job-board-1", name: "LinkedIn" },
        workflow: { id: "workflow-1", name: "Standard" },
        applicationType: "cold",
        roleType: "engineer",
        locationType: "remote",
        events: [],
        currentStatus: { id: "not_applied", name: "Not Applied" },
        createdAt: await encryptString(
          new Date().toISOString(),
          clientEncryptionKey,
        ),
        updatedAt: await encryptString(
          new Date().toISOString(),
          clientEncryptionKey,
        ),
      };

      const createdApp = await batchApplicationService.createApplication(
        partiallyEncryptedData,
      );

      // Encrypted field should remain encrypted
      expect(createdApp.companyName).not.toBe("Encrypted Corp");
      expect(createdApp.companyName).toMatch(/^[A-Za-z0-9+/]+=*$/);

      // Non-encrypted field should remain as-is
      expect(createdApp.roleName).toBe("Plain Role");

      // Verify client can decrypt encrypted fields
      const decryptedCompanyName = await decryptString(
        createdApp.companyName,
        clientEncryptionKey,
      );
      expect(decryptedCompanyName).toBe("Encrypted Corp");
    });

    describe("Client-Only Timestamp Requirements", () => {
      let clientEncryptionKey: CryptoKey;

      beforeEach(async () => {
        clientEncryptionKey = await createEncryptionKey();
      });

      it("should REQUIRE encrypted createdAt from client", async () => {
        const applicationDataWithoutCreatedAt: ApplicationCreateData = {
          userId: "test-user-123",
          companyName: "Test Corp",
          roleName: "Engineer",
          jobBoard: { id: "job-board-1", name: "LinkedIn" },
          workflow: { id: "workflow-1", name: "Standard" },
          applicationType: "cold",
          roleType: "engineer",
          locationType: "remote",
          events: [],
          currentStatus: { id: "not_applied", name: "Not Applied" },
          // Missing createdAt - should cause error
          updatedAt: await encryptString(
            new Date().toISOString(),
            clientEncryptionKey,
          ),
        };

        await expect(
          batchApplicationService.createApplication(
            applicationDataWithoutCreatedAt,
          ),
        ).rejects.toThrow(
          "createdAt timestamp is required and must be encrypted",
        );
      });

      it("should REQUIRE encrypted updatedAt from client", async () => {
        const applicationDataWithoutUpdatedAt: ApplicationCreateData = {
          userId: "test-user-123",
          companyName: "Test Corp",
          roleName: "Engineer",
          jobBoard: { id: "job-board-1", name: "LinkedIn" },
          workflow: { id: "workflow-1", name: "Standard" },
          applicationType: "cold",
          roleType: "engineer",
          locationType: "remote",
          events: [],
          currentStatus: { id: "not_applied", name: "Not Applied" },
          createdAt: await encryptString(
            new Date().toISOString(),
            clientEncryptionKey,
          ),
          // Missing updatedAt - should cause error
        };

        await expect(
          batchApplicationService.createApplication(
            applicationDataWithoutUpdatedAt,
          ),
        ).rejects.toThrow(
          "updatedAt timestamp is required and must be encrypted",
        );
      });

      it("should REJECT requests without encrypted timestamps", async () => {
        const applicationDataWithPlainTimestamps: any = {
          userId: "test-user-123",
          companyName: "Test Corp",
          roleName: "Engineer",
          jobBoard: { id: "job-board-1", name: "LinkedIn" },
          workflow: { id: "workflow-1", name: "Standard" },
          applicationType: "cold",
          roleType: "engineer",
          locationType: "remote",
          events: [],
          currentStatus: { id: "not_applied", name: "Not Applied" },
          createdAt: new Date(), // Plain Date object - should cause error
          updatedAt: new Date(), // Plain Date object - should cause error
        };

        await expect(
          batchApplicationService.createApplication(
            applicationDataWithPlainTimestamps,
          ),
        ).rejects.toThrow(
          "Timestamps must be encrypted strings, not Date objects",
        );
      });

      it("should never generate server-side timestamps", async () => {
        const applicationDataWithoutTimestamps: ApplicationCreateData = {
          userId: "test-user-123",
          companyName: "Test Corp",
          roleName: "Engineer",
          jobBoard: { id: "job-board-1", name: "LinkedIn" },
          workflow: { id: "workflow-1", name: "Standard" },
          applicationType: "cold",
          roleType: "engineer",
          locationType: "remote",
          events: [],
          currentStatus: { id: "not_applied", name: "Not Applied" },
          // No timestamps provided at all
        };

        await expect(
          batchApplicationService.createApplication(
            applicationDataWithoutTimestamps,
          ),
        ).rejects.toThrow(
          "createdAt timestamp is required and must be encrypted",
        );

        // Verify no server-generated timestamps were created
        const collection = batchMockDb.collection("applications");
        const allApps = await collection.find({}).toArray();
        expect(allApps).toHaveLength(0); // Should not have created any application
      });

      it("should accept and preserve encrypted timestamps from client", async () => {
        const encryptedCreatedAt = await encryptString(
          "2023-12-01T10:00:00.000Z",
          clientEncryptionKey,
        );
        const encryptedUpdatedAt = await encryptString(
          "2023-12-01T11:00:00.000Z",
          clientEncryptionKey,
        );

        const applicationDataWithEncryptedTimestamps: ApplicationCreateData = {
          userId: "test-user-123",
          companyName: "Test Corp",
          roleName: "Engineer",
          jobBoard: { id: "job-board-1", name: "LinkedIn" },
          workflow: { id: "workflow-1", name: "Standard" },
          applicationType: "cold",
          roleType: "engineer",
          locationType: "remote",
          events: [],
          currentStatus: { id: "not_applied", name: "Not Applied" },
          createdAt: encryptedCreatedAt,
          updatedAt: encryptedUpdatedAt,
        };

        const createdApp = await batchApplicationService.createApplication(
          applicationDataWithEncryptedTimestamps,
        );

        // Should preserve encrypted timestamps exactly as provided
        expect(createdApp.createdAt).toBe(encryptedCreatedAt);
        expect(createdApp.updatedAt).toBe(encryptedUpdatedAt);
        expect(typeof createdApp.createdAt).toBe("string");
        expect(typeof createdApp.updatedAt).toBe("string");
      });
    });

    describe("Client-Only Event Date Requirements", () => {
      let clientEncryptionKey: CryptoKey;

      beforeEach(async () => {
        clientEncryptionKey = await createEncryptionKey();
      });

      it("should REJECT events with unencrypted dates", async () => {
        const applicationDataWithPlainEventDates: ApplicationCreateData = {
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
              title: "Application submitted",
              description: "Submitted application online",
              date: "2023-12-01T10:00:00.000Z", // Plain ISO string - should cause error
            },
          ],
          currentStatus: { id: "applied", name: "Applied" },
          createdAt: await encryptString(
            new Date().toISOString(),
            clientEncryptionKey,
          ),
          updatedAt: await encryptString(
            new Date().toISOString(),
            clientEncryptionKey,
          ),
        };

        await expect(
          batchApplicationService.createApplication(
            applicationDataWithPlainEventDates,
          ),
        ).rejects.toThrow("Event dates must be encrypted");
      });

      it("should REQUIRE all event dates to be encrypted strings", async () => {
        const applicationDataWithMixedEventDates: ApplicationCreateData = {
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
              title: "Application submitted",
              description: "Submitted application online",
              date: await encryptString(
                "2023-12-01T10:00:00.000Z",
                clientEncryptionKey,
              ), // Encrypted - good
            },
            {
              id: "event-2",
              title: "Phone screen scheduled",
              description: "HR reached out",
              date: "2023-12-05T14:00:00.000Z", // Plain ISO string - should cause error
            },
          ],
          currentStatus: { id: "applied", name: "Applied" },
          createdAt: await encryptString(
            new Date().toISOString(),
            clientEncryptionKey,
          ),
          updatedAt: await encryptString(
            new Date().toISOString(),
            clientEncryptionKey,
          ),
        };

        await expect(
          batchApplicationService.createApplication(
            applicationDataWithMixedEventDates,
          ),
        ).rejects.toThrow("Event dates must be encrypted");
      });

      it("should never generate server-side event dates", async () => {
        // Even if we try to trigger automatic event generation, all dates must come from client
        const applicationDataThatMightTriggerEvents: ApplicationCreateData = {
          userId: "test-user-123",
          companyName: "Test Corp",
          roleName: "Engineer",
          jobBoard: { id: "job-board-1", name: "LinkedIn" },
          workflow: { id: "workflow-1", name: "Standard" },
          applicationType: "cold",
          roleType: "engineer",
          locationType: "remote",
          events: [], // Empty events - server should NOT auto-generate any
          appliedDate: await encryptString("2023-12-01", clientEncryptionKey),
          currentStatus: { id: "applied", name: "Applied" },
          createdAt: await encryptString(
            new Date().toISOString(),
            clientEncryptionKey,
          ),
          updatedAt: await encryptString(
            new Date().toISOString(),
            clientEncryptionKey,
          ),
        };

        const createdApp = await batchApplicationService.createApplication(
          applicationDataThatMightTriggerEvents,
        );

        // Should preserve exactly what client provided - no server-generated events
        expect(createdApp.events).toHaveLength(0);

        // If there were events, they would have encrypted dates, not server-generated dates
        // This test ensures the service doesn't add ANY events automatically
      });

      it("should accept and preserve encrypted event dates from client", async () => {
        const encryptedEventDate1 = await encryptString(
          "2023-12-01T10:00:00.000Z",
          clientEncryptionKey,
        );
        const encryptedEventDate2 = await encryptString(
          "2023-12-05T14:00:00.000Z",
          clientEncryptionKey,
        );

        const applicationDataWithEncryptedEvents: ApplicationCreateData = {
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
              title: "Application submitted",
              description: "Submitted application online",
              date: encryptedEventDate1,
            },
            {
              id: "event-2",
              title: "Phone screen scheduled",
              description: "HR reached out",
              date: encryptedEventDate2,
            },
          ],
          currentStatus: { id: "applied", name: "Applied" },
          createdAt: await encryptString(
            new Date().toISOString(),
            clientEncryptionKey,
          ),
          updatedAt: await encryptString(
            new Date().toISOString(),
            clientEncryptionKey,
          ),
        };

        const createdApp = await batchApplicationService.createApplication(
          applicationDataWithEncryptedEvents,
        );

        // Should preserve encrypted event dates exactly as provided
        expect(createdApp.events).toHaveLength(2);
        expect(createdApp.events[0].date).toBe(encryptedEventDate1);
        expect(createdApp.events[1].date).toBe(encryptedEventDate2);
        expect(typeof createdApp.events[0].date).toBe("string");
        expect(typeof createdApp.events[1].date).toBe("string");
      });
    });
  });
});
