import { render, screen, cleanup } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { JobApplicationCard } from "./JobApplicationCard";
import { JobApplication } from "../db/schemas";
import "@testing-library/jest-dom/vitest";

describe("<JobApplicationCard>", () => {
  afterEach(() => {
    cleanup();
  });
  const mockApplication: JobApplication = {
    userId: "user1",
    companyName: "TechCorp Inc.",
    roleName: "Senior Software Engineer",
    jobPostingUrl: "https://example.com/job",
    jobBoard: { id: "1", name: "LinkedIn" },
    workflow: { id: "1", name: "Standard" },
    applicationType: "cold",
    roleType: "engineer",
    locationType: "remote",
    events: [
      {
        statusId: "applied",
        statusName: "Applied",
        date: "2025-01-05T10:30:00.000Z",
      },
      {
        statusId: "phone_screen",
        statusName: "Phone Screen",
        date: "2025-01-08T14:00:00.000Z",
      },
    ],
    currentStatus: { id: "phone_screen", name: "Phone Screen" },
    createdAt: new Date("2025-01-05T00:00:00.000Z"),
    updatedAt: new Date("2025-01-08T00:00:00.000Z"),
  };

  test("displays company name", () => {
    render(<JobApplicationCard application={mockApplication} />);

    expect(screen.getByText("TechCorp Inc.")).toBeInTheDocument();
  });

  test("displays role title", () => {
    render(<JobApplicationCard application={mockApplication} />);

    expect(screen.getByText("Senior Software Engineer")).toBeInTheDocument();
  });

  test("displays current application status", () => {
    render(<JobApplicationCard application={mockApplication} />);

    expect(screen.getByText("Phone Screen")).toBeInTheDocument();
  });

  test("displays the most recent status date", () => {
    render(<JobApplicationCard application={mockApplication} />);

    expect(screen.getByText("2025-01-08")).toBeInTheDocument();
  });

  test("handles missing optional fields gracefully", () => {
    const applicationWithoutUrl: JobApplication = {
      ...mockApplication,
      jobPostingUrl: undefined,
    };

    render(<JobApplicationCard application={applicationWithoutUrl} />);

    expect(screen.getByText("TechCorp Inc.")).toBeInTheDocument();
    expect(screen.getByText("Senior Software Engineer")).toBeInTheDocument();
  });

  test("displays rejected status correctly", () => {
    const rejectedApplication: JobApplication = {
      ...mockApplication,
      currentStatus: { id: "rejected", name: "Rejected" },
      events: [
        {
          statusId: "rejected",
          statusName: "Rejected",
          date: "2025-01-10T09:00:00.000Z",
        },
      ],
    };

    render(<JobApplicationCard application={rejectedApplication} />);

    expect(screen.getByText("Rejected")).toBeInTheDocument();
    expect(screen.getByText("2025-01-10")).toBeInTheDocument();
  });
});
