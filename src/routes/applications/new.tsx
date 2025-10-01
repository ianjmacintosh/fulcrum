import React, { useState, useEffect } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { requireUserAuth } from "../../utils/route-guards";
import { useServices } from "../../contexts/ServicesContext";
import { useApplications } from "../../contexts/ApplicationsContext";
import "./new.css";

export const Route = createFileRoute("/applications/new")({
  beforeLoad: requireUserAuth,
  component: NewApplication,
});

/**
 * New Application form component
 * Uses ServicesProvider for automatic encryption, timestamp injection, and HTTP handling
 */
export function NewApplication() {
  const router = useRouter();
  const services = useServices();
  const { refreshApplications } = useApplications();
  const [formData, setFormData] = useState({
    companyName: "",
    roleName: "",
    jobPostingUrl: "",
    appliedDate: "", // No default date - user can add this later when they actually apply
    jobBoard: "",
    applicationType: "cold" as "cold" | "warm",
    roleType: "engineer" as "manager" | "engineer",
    locationType: "remote" as "on-site" | "hybrid" | "remote",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [jobBoards, setJobBoards] = useState<
    Array<{ id: string; name: string; url: string }>
  >([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Fetch job boards on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load job boards
        const response = await fetch("/api/job-boards/");
        const result = await response.json();

        if (result.success) {
          setJobBoards(result.jobBoards);
        } else {
          console.error("Failed to load job boards:", result.error);
          // If no job boards exist, provide default options
          setJobBoards([
            { id: "linkedin", name: "LinkedIn", url: "https://linkedin.com" },
            { id: "indeed", name: "Indeed", url: "https://indeed.com" },
            {
              id: "glassdoor",
              name: "Glassdoor",
              url: "https://glassdoor.com",
            },
            { id: "otta", name: "Otta", url: "https://otta.com" },
            { id: "company_site", name: "Company Site", url: "" },
          ]);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        setErrorMessage("Failed to load form data. Please refresh the page.");
        // Provide default job boards on error
        setJobBoards([
          { id: "linkedin", name: "LinkedIn", url: "https://linkedin.com" },
          { id: "indeed", name: "Indeed", url: "https://indeed.com" },
          { id: "glassdoor", name: "Glassdoor", url: "https://glassdoor.com" },
          { id: "otta", name: "Otta", url: "https://otta.com" },
          { id: "company_site", name: "Company Site", url: "" },
        ]);
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Handle form submission using ServicesProvider
   * ServicesProvider automatically handles:
   * - Field-level encryption of sensitive data
   * - Timestamp injection (createdAt, updatedAt)
   * - Event creation from applied date
   * - CSRF token management
   * - HTTP request formatting and submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      // Prepare application data - pass plain text, ServicesProvider handles encryption
      const applicationData = {
        companyName: formData.companyName,
        roleName: formData.roleName,
        jobPostingUrl: formData.jobPostingUrl || undefined,
        appliedDate: formData.appliedDate || undefined,
        jobBoard: formData.jobBoard || undefined,
        applicationType: formData.applicationType,
        roleType: formData.roleType,
        locationType: formData.locationType,
        notes: formData.notes || undefined,
      };

      // ServicesProvider handles all encryption, timestamps, and HTTP logic
      const result = await services.applications.create(applicationData);

      if (result.success) {
        setSuccessMessage("Job added successfully!");

        await refreshApplications();

        setTimeout(() => {
          router.navigate({ to: "/applications" });
        }, 1500);
      } else {
        setErrorMessage(result.error || "Failed to submit application");
      }
    } catch (error) {
      console.error("Error submitting application:", error);
      setErrorMessage("Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.navigate({ to: "/applications" });
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Add New Job</h1>
        <p>
          Add a job you&apos;re interested in or have applied to. Only company
          name and job title are required.
        </p>
      </header>

      <main className="page-content">
        <div className="form-container">
          <form onSubmit={handleSubmit} className="application-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="companyName">Company Name *</label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting || isLoadingData}
                  placeholder="e.g., TechCorp Inc."
                />
              </div>

              <div className="form-group">
                <label htmlFor="roleName">Job Title *</label>
                <input
                  type="text"
                  id="roleName"
                  name="roleName"
                  value={formData.roleName}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting || isLoadingData}
                  placeholder="e.g., Senior Software Engineer"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="jobPostingUrl">Job URL</label>
                <input
                  type="url"
                  id="jobPostingUrl"
                  name="jobPostingUrl"
                  value={formData.jobPostingUrl}
                  onChange={handleInputChange}
                  disabled={isSubmitting || isLoadingData}
                  placeholder="https://company.com/careers/job-id"
                />
              </div>

              <div className="form-group">
                <label htmlFor="appliedDate">Applied Date</label>
                <input
                  type="date"
                  id="appliedDate"
                  name="appliedDate"
                  value={formData.appliedDate}
                  onChange={handleInputChange}
                  disabled={isSubmitting || isLoadingData}
                  placeholder="Leave empty if not yet applied"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="jobBoard">Job Board</label>
                <select
                  id="jobBoard"
                  name="jobBoard"
                  value={formData.jobBoard}
                  onChange={handleInputChange}
                  disabled={isSubmitting || isLoadingData}
                >
                  <option value="">Select job board (optional)...</option>
                  {jobBoards.map((board) => (
                    <option key={board.id} value={board.name}>
                      {board.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="roleType">Role Type</label>
                <select
                  id="roleType"
                  name="roleType"
                  value={formData.roleType}
                  onChange={handleInputChange}
                  disabled={isSubmitting || isLoadingData}
                >
                  <option value="engineer">Engineer (default)</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Application Type</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="applicationType"
                      value="cold"
                      checked={formData.applicationType === "cold"}
                      onChange={handleInputChange}
                      disabled={isSubmitting || isLoadingData}
                    />
                    <span>Cold Apply</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="applicationType"
                      value="warm"
                      checked={formData.applicationType === "warm"}
                      onChange={handleInputChange}
                      disabled={isSubmitting || isLoadingData}
                    />
                    <span>Warm Apply</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Location Type</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="locationType"
                      value="on-site"
                      checked={formData.locationType === "on-site"}
                      onChange={handleInputChange}
                      disabled={isSubmitting || isLoadingData}
                    />
                    <span>On-site</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="locationType"
                      value="hybrid"
                      checked={formData.locationType === "hybrid"}
                      onChange={handleInputChange}
                      disabled={isSubmitting || isLoadingData}
                    />
                    <span>Hybrid</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="locationType"
                      value="remote"
                      checked={formData.locationType === "remote"}
                      onChange={handleInputChange}
                      disabled={isSubmitting || isLoadingData}
                    />
                    <span>Remote</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="notes">Additional Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                disabled={isSubmitting || isLoadingData}
                placeholder="Any additional notes about this application..."
                rows={4}
              />
            </div>

            {successMessage && (
              <div className="success-message">{successMessage}</div>
            )}

            {errorMessage && (
              <div className="error-message">{errorMessage}</div>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={handleCancel}
                className="cancel-button"
                disabled={isSubmitting || isLoadingData}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-button"
                disabled={isSubmitting || isLoadingData}
              >
                {isSubmitting
                  ? "Adding..."
                  : isLoadingData
                    ? "Loading..."
                    : "Add Job"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
