import React, { useState, useEffect } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { requireUserAuth } from "../../utils/route-guards";
import { fetchCSRFTokens } from "../../utils/csrf-client";
import "./new.css";

export const Route = createFileRoute("/applications/new")({
  beforeLoad: requireUserAuth,
  component: NewApplication,
});

function NewApplication() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    companyName: "",
    roleName: "",
    jobPostingUrl: "",
    appliedDate: new Date().toISOString().split("T")[0], // Today's date in YYYY-MM-DD format
    jobBoard: "",
    applicationType: "cold" as "cold" | "warm",
    roleType: "",
    locationType: "on-site" as "on-site" | "hybrid" | "remote",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [csrfTokens, setCsrfTokens] = useState<{
    csrfToken: string;
    csrfHash: string;
  } | null>(null);
  const [jobBoards, setJobBoards] = useState<
    Array<{ id: string; name: string; url: string }>
  >([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Fetch CSRF tokens and job boards on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load CSRF tokens
        const tokens = await fetchCSRFTokens();
        setCsrfTokens(tokens);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    if (!csrfTokens) {
      setErrorMessage("Security tokens not loaded. Please refresh the page.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Create form data for submission
      const submitFormData = new FormData();
      submitFormData.append("companyName", formData.companyName);
      submitFormData.append("roleName", formData.roleName);
      submitFormData.append("jobPostingUrl", formData.jobPostingUrl);
      submitFormData.append("appliedDate", formData.appliedDate);
      submitFormData.append("jobBoard", formData.jobBoard);
      submitFormData.append("applicationType", formData.applicationType);
      submitFormData.append("roleType", formData.roleType);
      submitFormData.append("locationType", formData.locationType);
      submitFormData.append("notes", formData.notes);
      submitFormData.append("csrf_token", csrfTokens.csrfToken);
      submitFormData.append("csrf_hash", csrfTokens.csrfHash);

      // Submit to API
      const response = await fetch("/api/applications/create", {
        method: "POST",
        body: submitFormData,
      });

      const result = await response.json();

      if (result.success) {
        setSuccessMessage("Application submitted successfully!");

        // Redirect to applications list after a brief delay
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
        <h1>Add New Application</h1>
        <p>Record a new job application to track your progress</p>
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
                  disabled={isSubmitting || !csrfTokens || isLoadingData}
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
                  disabled={isSubmitting || !csrfTokens || isLoadingData}
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
                  disabled={isSubmitting || !csrfTokens || isLoadingData}
                  placeholder="https://company.com/careers/job-id"
                />
              </div>

              <div className="form-group">
                <label htmlFor="appliedDate">Applied Date *</label>
                <input
                  type="date"
                  id="appliedDate"
                  name="appliedDate"
                  value={formData.appliedDate}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting || !csrfTokens || isLoadingData}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="jobBoard">Job Board *</label>
                <select
                  id="jobBoard"
                  name="jobBoard"
                  value={formData.jobBoard}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting || !csrfTokens || isLoadingData}
                >
                  <option value="">Select job board...</option>
                  {jobBoards.map((board) => (
                    <option key={board.id} value={board.name}>
                      {board.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="roleType">Role Type *</label>
                <select
                  id="roleType"
                  name="roleType"
                  value={formData.roleType}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting || !csrfTokens || isLoadingData}
                >
                  <option value="">Select role type...</option>
                  <option value="manager">Manager</option>
                  <option value="engineer">Engineer</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Application Type *</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="applicationType"
                      value="cold"
                      checked={formData.applicationType === "cold"}
                      onChange={handleInputChange}
                      disabled={isSubmitting || !csrfTokens || isLoadingData}
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
                      disabled={isSubmitting || !csrfTokens || isLoadingData}
                    />
                    <span>Warm Apply</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Location Type *</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="locationType"
                      value="on-site"
                      checked={formData.locationType === "on-site"}
                      onChange={handleInputChange}
                      disabled={isSubmitting || !csrfTokens || isLoadingData}
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
                      disabled={isSubmitting || !csrfTokens || isLoadingData}
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
                      disabled={isSubmitting || !csrfTokens || isLoadingData}
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
                disabled={isSubmitting || !csrfTokens || isLoadingData}
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
                disabled={isSubmitting || !csrfTokens || isLoadingData}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-button"
                disabled={isSubmitting || !csrfTokens || isLoadingData}
              >
                {isSubmitting
                  ? "Submitting..."
                  : !csrfTokens || isLoadingData
                    ? "Loading..."
                    : "Add Application"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
