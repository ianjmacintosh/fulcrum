import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { JobApplicationCardsList } from "./JobApplicationCardsList";
import { JobApplication } from "../db/schemas";
import "@testing-library/jest-dom/vitest";

describe("<JobApplicationCardsList>", () => {
  afterEach(() => {
    cleanup();
  });
  const mockApplications: JobApplication[] = [
    {
      userId: "user1",
      companyName: "TechCorp Inc.",
      roleName: "Senior Software Engineer",
      jobBoard: { id: "1", name: "LinkedIn" },
      workflow: { id: "1", name: "Standard" },
      applicationType: "cold",
      roleType: "engineer",
      locationType: "remote",
      events: [
        {
          statusId: "applied",
          statusName: "Applied",
          date: "2025-01-05T00:00:00.000Z",
        },
      ],
      currentStatus: { id: "applied", name: "Applied" },
      createdAt: new Date("2025-01-05T00:00:00.000Z"),
      updatedAt: new Date("2025-01-05T00:00:00.000Z"),
    },
    {
      userId: "user1",
      companyName: "StartupXYZ",
      roleName: "Full Stack Developer",
      jobBoard: { id: "2", name: "AngelList" },
      workflow: { id: "1", name: "Standard" },
      applicationType: "warm",
      roleType: "engineer",
      locationType: "hybrid",
      events: [
        {
          statusId: "rejected",
          statusName: "Rejected",
          date: "2025-01-03T00:00:00.000Z",
        },
      ],
      currentStatus: { id: "rejected", name: "Rejected" },
      createdAt: new Date("2025-01-03T00:00:00.000Z"),
      updatedAt: new Date("2025-01-03T00:00:00.000Z"),
    },
  ];

  test("renders the correct number of job applications", () => {
    render(<JobApplicationCardsList applications={mockApplications} />);

    expect(screen.getByText("TechCorp Inc.")).toBeInTheDocument();
    expect(screen.getByText("StartupXYZ")).toBeInTheDocument();
  });

  test("shows 'No Job Applications' message when applications array is empty", () => {
    render(<JobApplicationCardsList applications={[]} />);

    expect(screen.getByText("No Job Applications")).toBeInTheDocument();
  });

  test("includes declined/rejected applications", () => {
    render(<JobApplicationCardsList applications={mockApplications} />);

    expect(screen.getByText("StartupXYZ")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });
});
