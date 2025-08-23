import { describe, it, expect } from "vitest";
import applicationsData from "./applications.json";
import { JobApplication } from "../../db/schemas";

describe("Applications Mock Data", () => {
  it('should have applications starting with "applied" events instead of cold/warm apply', () => {
    const applications = applicationsData.data as JobApplication[];

    for (const app of applications) {
      expect(app.events.length).toBeGreaterThan(0);

      // Find the first (earliest) event by date
      const sortedEvents = [...app.events].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      const firstEvent = sortedEvents[0];
      expect(firstEvent.title).toBe("Applied");
    }
  });

  it("should have events with title and description fields", () => {
    const applications = applicationsData.data as JobApplication[];

    for (const app of applications) {
      for (const event of app.events) {
        expect(event.title).toBeDefined();
        expect(typeof event.title).toBe("string");
        expect(event.title.length).toBeGreaterThan(0);

        // description is optional but if present should be a string
        if (event.description) {
          expect(typeof event.description).toBe("string");
        }
      }
    }
  });

  it("should preserve applicationType as cold/warm attribute on applications", () => {
    const applications = applicationsData.data as JobApplication[];

    for (const app of applications) {
      expect(["cold", "warm"]).toContain(app.applicationType);
    }
  });

  it("should have events with unique IDs", () => {
    const applications = applicationsData.data as JobApplication[];

    for (const app of applications) {
      const eventIds = app.events.map((e) => e.id);
      const uniqueIds = new Set(eventIds);

      expect(eventIds).toHaveLength(uniqueIds.size); // No duplicate IDs

      for (const eventId of eventIds) {
        expect(eventId).toMatch(/^event_[a-f0-9-]{36}$/); // UUID format
      }
    }
  });

  it("should have status dates that match application timeline", () => {
    const applications = applicationsData.data as JobApplication[];

    for (const app of applications) {
      // Check that appliedDate is present for all applications that have applied
      const hasAppliedEvent = app.events.some((e) => e.title === "Applied");
      if (hasAppliedEvent) {
        expect(app.appliedDate).toBeDefined();
        expect(app.appliedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
      }

      // Check that status dates are in valid format if present
      const statusDateFields = [
        "appliedDate",
        "phoneScreenDate",
        "round1Date",
        "round2Date",
        "acceptedDate",
        "declinedDate",
      ];
      for (const field of statusDateFields) {
        const value = (app as any)[field];
        if (value) {
          expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
        }
      }
    }
  });
});
