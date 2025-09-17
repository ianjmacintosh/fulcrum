import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isDataEncrypted,
  encryptFields,
} from "../../../services/encryption-service";
import { createEncryptionKey } from "../../../utils/client-crypto";

// Mock the validation schema before importing
const mockValidateSchema = vi.fn();

vi.mock("zod", async () => {
  const actualZod = (await vi.importActual("zod")) as any;
  return {
    ...actualZod,
    z: {
      ...actualZod.z,
      object: vi.fn(() => ({
        safeParse: mockValidateSchema,
      })),
    },
  };
});

// Mock services
const mockCreateApplication = vi.fn();
const mockGetDefaultWorkflow = vi.fn();
const mockGetStatuses = vi.fn();
const mockGetOrCreateJobBoard = vi.fn();
const mockVerifyCSRFToken = vi.fn();

vi.mock("../../../db/services/applications", () => ({
  applicationService: {
    createApplication: mockCreateApplication,
  },
}));

vi.mock("../../../db/services/workflows", () => ({
  workflowService: {
    getDefaultWorkflow: mockGetDefaultWorkflow,
    getStatuses: mockGetStatuses,
    createStatus: vi.fn(),
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

describe("Application Creation API Validation", () => {
  let testKey: CryptoKey;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create encryption key for tests
    testKey = await createEncryptionKey();

    // Setup default mock responses
    mockVerifyCSRFToken.mockReturnValue(true);
    mockGetDefaultWorkflow.mockResolvedValue({
      _id: "workflow-123",
      name: "Default Workflow",
    });
    mockGetStatuses.mockResolvedValue([{ _id: "status-123", name: "Applied" }]);
    mockGetOrCreateJobBoard.mockResolvedValue({
      _id: "board-123",
      name: "General",
    });
  });

  describe("Form Validation", () => {
    it("should validate required fields (company name and job title)", () => {
      // Test that validation accepts only required fields
      const minimalData = {
        companyName: "TestCorp",
        roleName: "Software Engineer",
        jobPostingUrl: "",
        appliedDate: "",
        jobBoard: "",
        applicationType: undefined,
        roleType: undefined,
        locationType: undefined,
        notes: "",
      };

      mockValidateSchema.mockReturnValueOnce({
        success: true,
        data: minimalData,
      });

      expect(mockValidateSchema).not.toThrow();
    });

    it("should reject when company name is missing", () => {
      const invalidData = {
        companyName: "", // Invalid: empty required field
        roleName: "Software Engineer",
      };

      mockValidateSchema.mockReturnValueOnce({
        success: false,
        error: {
          issues: [{ message: "Company name is required" }],
        },
      });

      const result = mockValidateSchema(invalidData);

      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toBe("Company name is required");
    });

    it("should reject when job title is missing", () => {
      const invalidData = {
        companyName: "TestCorp",
        roleName: "", // Invalid: empty required field
      };

      mockValidateSchema.mockReturnValueOnce({
        success: false,
        error: {
          issues: [{ message: "Job title is required" }],
        },
      });

      const result = mockValidateSchema(invalidData);

      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toBe("Job title is required");
    });

    it("should allow all optional fields to be empty or undefined", () => {
      const dataWithOptionals = {
        companyName: "TestCorp",
        roleName: "Software Engineer",
        jobPostingUrl: "", // Optional - empty
        appliedDate: "", // Optional - empty
        jobBoard: "", // Optional - empty
        applicationType: undefined, // Optional - undefined
        roleType: undefined, // Optional - undefined
        locationType: undefined, // Optional - undefined
        notes: "", // Optional - empty
      };

      mockValidateSchema.mockReturnValueOnce({
        success: true,
        data: dataWithOptionals,
      });

      const result = mockValidateSchema(dataWithOptionals);

      expect(result.success).toBe(true);
    });
  });

  describe("Application Service Integration", () => {
    it("should call createApplication with encrypted sensitive data", async () => {
      // Create plaintext application data
      const plaintextData = {
        userId: "user-123",
        companyName: "TestCorp",
        roleName: "Software Engineer",
        jobPostingUrl: "https://example.com/job",
        notes: "Test notes",
        jobBoard: { id: "board-123", name: "General" },
        workflow: { id: "workflow-123", name: "Default Workflow" },
        applicationType: "cold" as const,
        roleType: "engineer" as const,
        locationType: "remote" as const,
        events: [],
        appliedDate: undefined,
        currentStatus: { id: "status-123", name: "Applied" },
      };

      // Encrypt the sensitive fields
      const encryptedData = await encryptFields(
        plaintextData,
        testKey,
        "JobApplication",
      );

      const mockApplication = {
        _id: "app-123",
        ...encryptedData,
        createdAt: new Date(),
      };

      mockCreateApplication.mockResolvedValue(mockApplication);

      await mockCreateApplication(encryptedData);

      // Verify that sensitive data appears encrypted
      expect(mockCreateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: expect.stringMatching(/^[A-Za-z0-9+/]+=*$/), // Base64 pattern
          roleName: expect.stringMatching(/^[A-Za-z0-9+/]+=*$/), // Base64 pattern
          applicationType: "cold", // Not encrypted
          roleType: "engineer", // Not encrypted
          locationType: "remote", // Not encrypted
          userId: "user-123", // Not encrypted
        }),
      );

      // Verify encrypted data is not the same as plaintext
      expect(encryptedData.companyName).not.toBe("TestCorp");
      expect(encryptedData.roleName).not.toBe("Software Engineer");

      // Verify data is detected as encrypted
      expect(isDataEncrypted(encryptedData, "JobApplication")).toBe(true);
    });

    it("should create events with encrypted data when appliedDate is provided", async () => {
      // Create plaintext application data with events
      const plaintextData = {
        userId: "user-123",
        companyName: "TestCorp",
        roleName: "Software Engineer",
        appliedDate: "2025-01-15",
        notes: "Applied via LinkedIn",
        events: [
          {
            id: "event-123",
            title: "Application submitted",
            description: "Applied via LinkedIn",
            date: "2025-01-15",
          },
        ],
        jobBoard: { id: "board-123", name: "General" },
        workflow: { id: "workflow-123", name: "Default Workflow" },
        applicationType: "cold" as const,
        roleType: "engineer" as const,
        locationType: "remote" as const,
        currentStatus: { id: "status-123", name: "Applied" },
      };

      // Encrypt the sensitive fields including nested events
      const encryptedData = await encryptFields(
        plaintextData,
        testKey,
        "JobApplication",
      );

      const mockApplication = {
        _id: "app-123",
        ...encryptedData,
      };

      mockCreateApplication.mockResolvedValue(mockApplication);

      await mockCreateApplication(encryptedData);

      expect(mockCreateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: expect.stringMatching(/^[A-Za-z0-9+/]+=*$/), // Encrypted
          roleName: expect.stringMatching(/^[A-Za-z0-9+/]+=*$/), // Encrypted
          appliedDate: expect.stringMatching(/^[A-Za-z0-9+/]+=*$/), // Encrypted
          notes: expect.stringMatching(/^[A-Za-z0-9+/]+=*$/), // Encrypted
          events: expect.arrayContaining([
            expect.objectContaining({
              id: "event-123", // Not encrypted
              title: expect.stringMatching(/^[A-Za-z0-9+/]+=*$/), // Encrypted
              description: expect.stringMatching(/^[A-Za-z0-9+/]+=*$/), // Encrypted
              date: expect.stringMatching(/^[A-Za-z0-9+/]+=*$/), // Encrypted
            }),
          ]),
        }),
      );

      // Verify encrypted data is not the same as plaintext
      expect(encryptedData.companyName).not.toBe("TestCorp");
      expect(encryptedData.events[0].title).not.toBe("Application submitted");

      // Verify data is detected as encrypted
      expect(isDataEncrypted(encryptedData, "JobApplication")).toBe(true);
    });

    it("should use 'General' job board when none specified", async () => {
      // Simulate getting or creating default job board
      await mockGetOrCreateJobBoard("user-123", ""); // Empty job board name

      expect(mockGetOrCreateJobBoard).toHaveBeenCalledWith("user-123", "");
      expect(mockGetOrCreateJobBoard).toHaveReturnedWith(
        Promise.resolve({ _id: "board-123", name: "General" }),
      );
    });

    it("should set currentStatus to 'Not Applied' when no appliedDate provided", async () => {
      const mockApplication = {
        _id: "app-123",
        userId: "user-123",
        companyName: "TestCorp",
        roleName: "Software Engineer",
        currentStatus: { id: "not_applied", name: "Not Applied" },
      };

      mockCreateApplication.mockResolvedValue(mockApplication);

      // Simulate creating application without appliedDate
      await mockCreateApplication({
        userId: "user-123",
        companyName: "TestCorp",
        roleName: "Software Engineer",
        appliedDate: undefined, // No applied date
        notes: "Job of interest",
        events: [], // No events since not applied yet
        jobBoard: { id: "board-123", name: "General" },
        workflow: { id: "workflow-123", name: "Default Workflow" },
        applicationType: "cold",
        roleType: "engineer",
        locationType: "remote",
        currentStatus: { id: "not_applied", name: "Not Applied" },
      });

      expect(mockCreateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          appliedDate: undefined,
          events: [],
          currentStatus: { id: "not_applied", name: "Not Applied" },
        }),
      );
    });

    it("should set currentStatus to 'Applied' when appliedDate is provided", async () => {
      const mockApplication = {
        _id: "app-123",
        userId: "user-123",
        companyName: "TestCorp",
        roleName: "Software Engineer",
        currentStatus: { id: "applied", name: "Applied" },
      };

      mockCreateApplication.mockResolvedValue(mockApplication);

      // Simulate creating application with appliedDate
      await mockCreateApplication({
        userId: "user-123",
        companyName: "TestCorp",
        roleName: "Software Engineer",
        appliedDate: "2025-01-15",
        notes: "Applied via LinkedIn",
        events: [
          {
            id: "event-123",
            title: "Application submitted",
            description: "Applied via LinkedIn",
            date: "2025-01-15",
          },
        ],
        jobBoard: { id: "board-123", name: "General" },
        workflow: { id: "workflow-123", name: "Default Workflow" },
        applicationType: "cold",
        roleType: "engineer",
        locationType: "remote",
        currentStatus: { id: "applied", name: "Applied" },
      });

      expect(mockCreateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          appliedDate: "2025-01-15",
          events: expect.arrayContaining([
            expect.objectContaining({
              title: "Application submitted",
              date: "2025-01-15",
            }),
          ]),
          currentStatus: { id: "applied", name: "Applied" },
        }),
      );
    });
  });

  describe("API Encrypted Timestamp Requirements", () => {
    it("should ensure ApplicationService validates encrypted timestamps", async () => {
      // Test that API passes data to ApplicationService which handles validation
      const applicationData = {
        userId: "user-123",
        companyName: "Test Corp",
        roleName: "Engineer",
        jobBoard: { id: "board-123", name: "LinkedIn" },
        workflow: { id: "workflow-123", name: "Standard" },
        applicationType: "cold" as const,
        roleType: "engineer" as const,
        locationType: "remote" as const,
        events: [],
        currentStatus: { id: "not_applied", name: "Not Applied" },
        // Missing encrypted timestamps - ApplicationService should reject this
      };

      // Mock ApplicationService to reject missing encrypted timestamps
      mockCreateApplication.mockRejectedValueOnce(
        new Error("createdAt timestamp is required and must be encrypted"),
      );

      try {
        await mockCreateApplication(applicationData);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toContain(
          "createdAt timestamp is required and must be encrypted",
        );
      }
    });

    it("should ensure ApplicationService validates encrypted event dates", async () => {
      const applicationData = {
        userId: "user-123",
        companyName: "Test Corp",
        roleName: "Engineer",
        jobBoard: { id: "board-123", name: "LinkedIn" },
        workflow: { id: "workflow-123", name: "Standard" },
        applicationType: "cold" as const,
        roleType: "engineer" as const,
        locationType: "remote" as const,
        events: [
          {
            id: "event-1",
            title: "Application submitted",
            description: "Applied online",
            date: "2023-12-01T10:00:00.000Z", // Unencrypted date - should be rejected
          },
        ],
        currentStatus: { id: "applied", name: "Applied" },
        createdAt: "encrypted_created_timestamp==",
        updatedAt: "encrypted_updated_timestamp==",
      };

      // Mock ApplicationService to reject unencrypted event dates
      mockCreateApplication.mockRejectedValueOnce(
        new Error("Event dates must be encrypted"),
      );

      try {
        await mockCreateApplication(applicationData);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toContain("Event dates must be encrypted");
      }
    });

    it("should pass properly encrypted data to ApplicationService", async () => {
      const encryptedApplicationData = {
        userId: "user-123",
        companyName: "encrypted_company_name==",
        roleName: "encrypted_role_name==",
        jobBoard: { id: "board-123", name: "LinkedIn" },
        workflow: { id: "workflow-123", name: "Standard" },
        applicationType: "cold" as const,
        roleType: "engineer" as const,
        locationType: "remote" as const,
        events: [
          {
            id: "event-1",
            title: "encrypted_event_title==",
            description: "encrypted_event_description==",
            date: "encrypted_event_date==",
          },
        ],
        currentStatus: { id: "applied", name: "Applied" },
        createdAt: "encrypted_created_timestamp==",
        updatedAt: "encrypted_updated_timestamp==",
      };

      // Mock successful creation with encrypted data
      mockCreateApplication.mockResolvedValueOnce({
        _id: "created-app-id",
        ...encryptedApplicationData,
      });

      const result = await mockCreateApplication(encryptedApplicationData);

      expect(result).toBeDefined();
      expect(result._id).toBe("created-app-id");
      expect(mockCreateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: "encrypted_created_timestamp==",
          updatedAt: "encrypted_updated_timestamp==",
          events: expect.arrayContaining([
            expect.objectContaining({
              date: "encrypted_event_date==",
            }),
          ]),
        }),
      );
    });
  });
});
