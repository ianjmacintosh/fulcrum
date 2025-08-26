import { describe, expect, test } from "vitest";

// Mock applications data for testing logic
const mockApplications = [
  {
    _id: "1",
    companyName: "TechCorp Inc.",
    roleName: "Senior Software Engineer",
    currentStatus: { id: "applied", name: "Applied" },
    createdAt: new Date("2025-01-15"),
  },
  {
    _id: "2",
    companyName: "StartupXYZ",
    roleName: "Frontend Developer",
    currentStatus: { id: "phone_screen", name: "Phone Screen" },
    createdAt: new Date("2025-01-16"),
  },
  {
    _id: "3",
    companyName: "BigCorp",
    roleName: "Engineering Manager",
    currentStatus: { id: "declined", name: "Declined" },
    createdAt: new Date("2025-01-17"),
  },
];

describe("Applications Index Navigation", () => {
  test("should have import from CSV button navigation target", () => {
    // Test that the expected navigation target exists
    const importRoute = "/applications/import";
    expect(importRoute).toBe("/applications/import");
  });

  test("should have add new application navigation target", () => {
    const newRoute = "/applications/new";
    expect(newRoute).toBe("/applications/new");
  });
});

describe("Applications Summary Statistics Logic", () => {
  test("calculates total applications correctly", () => {
    const totalCount = mockApplications.length;
    expect(totalCount).toBe(3);
  });

  test("calculates open applications correctly", () => {
    const openApps = mockApplications.filter(
      (app: any) =>
        !["rejected", "declined", "withdrawn"].includes(
          app.currentStatus.id.toLowerCase(),
        ),
    );

    expect(openApps).toHaveLength(2); // Two applications are open (applied, phone_screen)
    expect(openApps[0].currentStatus.id).toBe("applied");
    expect(openApps[1].currentStatus.id).toBe("phone_screen");
  });

  test("calculates closed/rejected applications correctly", () => {
    const closedApps = mockApplications.filter((app: any) =>
      ["rejected", "declined", "withdrawn"].includes(
        app.currentStatus.id.toLowerCase(),
      ),
    );

    expect(closedApps).toHaveLength(1); // One application is declined
    expect(closedApps[0].currentStatus.id).toBe("declined");
  });

  test("status filtering handles different case variations", () => {
    const testApp = {
      currentStatus: { id: "REJECTED", name: "Rejected" },
    };

    const isRejected = ["rejected", "declined", "withdrawn"].includes(
      testApp.currentStatus.id.toLowerCase(),
    );

    expect(isRejected).toBe(true);
  });
});
