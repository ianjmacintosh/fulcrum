import { JobApplication } from "../db/schemas";
import { JobApplicationCard } from "./JobApplicationCard";

interface JobApplicationCardsListProps {
  applications: JobApplication[];
}

export function JobApplicationCardsList({
  applications,
}: JobApplicationCardsListProps) {
  if (applications.length === 0) {
    return (
      <div className="no-applications">
        <p>No Job Applications</p>
      </div>
    );
  }

  return (
    <div className="applications-list">
      {applications.map((application) => (
        <JobApplicationCard
          key={
            application._id?.toString() ||
            `${application.companyName}-${application.roleName}`
          }
          application={application}
        />
      ))}
    </div>
  );
}
