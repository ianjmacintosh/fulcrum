import { describe, it, expect } from "vitest";
import { jobBoardService } from "./job-boards";

describe("JobBoardService Batch Operations", () => {
  describe("getOrCreateJobBoardsBatch", () => {
    it("should batch get or create multiple job boards", async () => {
      const jobBoardNames = ["LinkedIn", "Indeed", "Glassdoor", "LinkedIn"]; // With duplicate
      const userId = "user123";

      const result = await jobBoardService.getOrCreateJobBoardsBatch(
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

      const result = await jobBoardService.getOrCreateJobBoardsBatch(
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

    it("should handle empty job board names array", async () => {
      const jobBoardNames: string[] = [];
      const userId = "user123";

      const result = await jobBoardService.getOrCreateJobBoardsBatch(
        userId,
        jobBoardNames,
      );

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
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

      const result = await jobBoardService.getOrCreateJobBoardsBatch(
        userId,
        jobBoardNames,
      );

      expect(result.size).toBe(3); // Only unique names
      expect(result.has("LinkedIn")).toBe(true);
      expect(result.has("Indeed")).toBe(true);
      expect(result.has("Glassdoor")).toBe(true);
    });
  });
});
