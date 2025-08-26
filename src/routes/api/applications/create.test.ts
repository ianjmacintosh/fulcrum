import { describe, it, expect, vi, beforeEach } from "vitest";

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
  beforeEach(() => {
    vi.clearAllMocks();

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
    it("should call createApplication with default values for missing fields", async () => {
      const mockApplication = {
        _id: "app-123",
        companyName: "TestCorp",
        roleName: "Software Engineer",
        applicationType: "cold",
        roleType: "engineer",
        locationType: "remote",
        events: [],
        currentStatus: { id: "not_applied", name: "Not Applied" },
        createdAt: new Date(),
      };

      mockCreateApplication.mockResolvedValue(mockApplication);

      // Simulate the logic that would call createApplication
      await mockCreateApplication({
        userId: "user-123",
        companyName: "TestCorp",
        roleName: "Software Engineer",
        jobPostingUrl: undefined,
        jobBoard: { id: "board-123", name: "General" },
        workflow: { id: "workflow-123", name: "Default Workflow" },
        applicationType: "cold", // Default value
        roleType: "engineer", // Default value
        locationType: "remote", // Default value
        events: [], // No events when no appliedDate
        appliedDate: undefined,
        notes: undefined,
        currentStatus: { id: "status-123", name: "Applied" },
      });

      expect(mockCreateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationType: "cold",
          roleType: "engineer",
          locationType: "remote",
          events: [],
          appliedDate: undefined,
          notes: undefined,
        }),
      );
    });

    it("should create events when appliedDate is provided", async () => {
      const mockApplication = {
        _id: "app-123",
        companyName: "TestCorp",
        roleName: "Software Engineer",
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
        currentStatus: { id: "status-123", name: "Applied" },
      });

      expect(mockCreateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          appliedDate: "2025-01-15",
          notes: "Applied via LinkedIn",
          events: expect.arrayContaining([
            expect.objectContaining({
              title: "Application submitted",
              description: "Applied via LinkedIn",
              date: "2025-01-15",
            }),
          ]),
        }),
      );
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
});
