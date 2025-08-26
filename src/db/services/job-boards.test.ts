import { describe, it, expect, beforeEach } from "vitest";

// In-memory mock storage
let jobBoards: Array<{
  _id: string;
  name: string;
  userId: string;
  url: string;
  description: string;
  createdAt: Date;
}> = [];
let nextId = 1;

// Mock job board service
const mockJobBoardService = {
  clear() {
    jobBoards = [];
    nextId = 1;
  },

  async getOrCreateJobBoardsBatch(
    userId: string,
    names: string[],
  ): Promise<Map<string, any>> {
    const result = new Map();

    if (names.length === 0) {
      return result;
    }

    // Deduplicate names
    const uniqueNames = [...new Set(names)];

    // Find existing job boards
    for (const name of uniqueNames) {
      const existing = jobBoards.find(
        (jb) => jb.name === name && jb.userId === userId,
      );
      if (existing) {
        result.set(name, existing);
      }
    }

    // Create missing job boards
    for (const name of uniqueNames) {
      if (!result.has(name)) {
        const newJobBoard = {
          _id: `job-board-${nextId++}`,
          name,
          userId,
          url: `https://${name.toLowerCase().replace(/\s+/g, "")}.com`,
          description: `Job board: ${name}`,
          createdAt: new Date(),
        };
        jobBoards.push(newJobBoard);
        result.set(name, newJobBoard);
      }
    }

    return result;
  },
};

describe("JobBoardService Batch Operations", () => {
  beforeEach(() => {
    mockJobBoardService.clear();
  });

  describe("getOrCreateJobBoardsBatch", () => {
    it("should batch get or create multiple job boards", async () => {
      const jobBoardNames = ["LinkedIn", "Indeed", "Glassdoor", "LinkedIn"]; // With duplicate
      const userId = "user123";

      const result = await mockJobBoardService.getOrCreateJobBoardsBatch(
        userId,
        jobBoardNames,
      );

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(3); // Duplicates removed
      expect(result.has("LinkedIn")).toBe(true);
      expect(result.has("Indeed")).toBe(true);
      expect(result.has("Glassdoor")).toBe(true);

      const linkedinBoard = result.get("LinkedIn");
      expect(linkedinBoard).toBeDefined();
      expect(linkedinBoard!.name).toBe("LinkedIn");
      expect(linkedinBoard!.userId).toBe(userId);
      expect(linkedinBoard!._id).toBeDefined();
    });

    it("should return job boards mapped by name for efficient lookup", async () => {
      const jobBoardNames = ["LinkedIn", "Indeed"];
      const userId = "user123";

      const result = await mockJobBoardService.getOrCreateJobBoardsBatch(
        userId,
        jobBoardNames,
      );

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);

      const linkedinBoard = result.get("LinkedIn");
      const indeedBoard = result.get("Indeed");

      expect(linkedinBoard).toBeDefined();
      expect(indeedBoard).toBeDefined();
      expect(linkedinBoard!.name).toBe("LinkedIn");
      expect(indeedBoard!.name).toBe("Indeed");
    });

    it("should return existing job boards without creating duplicates", async () => {
      const userId = "user123";

      // Create job boards first
      await mockJobBoardService.getOrCreateJobBoardsBatch(userId, [
        "LinkedIn",
        "Indeed",
      ]);

      // Request same job boards again
      const result = await mockJobBoardService.getOrCreateJobBoardsBatch(
        userId,
        ["LinkedIn", "Indeed"],
      );

      expect(result.size).toBe(2);
      expect(jobBoards).toHaveLength(2); // Should not create duplicates

      const linkedinBoard = result.get("LinkedIn");
      expect(linkedinBoard!._id).toBe("job-board-1"); // Same ID as first creation
    });

    it("should handle mixed scenario - some exist, some need creation", async () => {
      const userId = "user123";

      // Create LinkedIn first
      await mockJobBoardService.getOrCreateJobBoardsBatch(userId, ["LinkedIn"]);

      // Request LinkedIn (exists) + Indeed (new)
      const result = await mockJobBoardService.getOrCreateJobBoardsBatch(
        userId,
        ["LinkedIn", "Indeed"],
      );

      expect(result.size).toBe(2);
      expect(jobBoards).toHaveLength(2);

      const linkedinBoard = result.get("LinkedIn");
      const indeedBoard = result.get("Indeed");

      expect(linkedinBoard!._id).toBe("job-board-1"); // Existing
      expect(indeedBoard!._id).toBe("job-board-2"); // New
    });

    it("should handle empty job board names array", async () => {
      const jobBoardNames: string[] = [];
      const userId = "user123";

      const result = await mockJobBoardService.getOrCreateJobBoardsBatch(
        userId,
        jobBoardNames,
      );

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      expect(jobBoards).toHaveLength(0);
    });

    it("should deduplicate job board names automatically", async () => {
      const jobBoardNames = [
        "LinkedIn",
        "Indeed",
        "LinkedIn",
        "Glassdoor",
        "Indeed",
      ];
      const userId = "user123";

      const result = await mockJobBoardService.getOrCreateJobBoardsBatch(
        userId,
        jobBoardNames,
      );

      expect(result.size).toBe(3); // Only unique names
      expect(result.has("LinkedIn")).toBe(true);
      expect(result.has("Indeed")).toBe(true);
      expect(result.has("Glassdoor")).toBe(true);
      expect(jobBoards).toHaveLength(3); // Only 3 created in storage
    });
  });
});
