import { createFileRoute } from "@tanstack/react-router";
import { requireUserAuth } from "../utils/route-guards";
import "./resumes.css";

export const Route = createFileRoute("/resumes")({
  beforeLoad: requireUserAuth,
  component: Resumes,
});

function Resumes() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Resumes</h1>
        <p>
          Track different resume versions, time spent, and their performance
        </p>
      </header>

      <main className="page-content">
        <section className="resumes-list">
          <div className="resume-card featured">
            <div className="resume-header">
              <h3>Software Engineer - Tech Focus</h3>
              <div className="resume-status">Best Performing</div>
            </div>
            <div className="resume-stats">
              <div className="stat">
                <span className="stat-label">Time Spent:</span>
                <span className="stat-value">8.5 hours</span>
              </div>
              <div className="stat">
                <span className="stat-label">Applications:</span>
                <span className="stat-value">28</span>
              </div>
              <div className="stat">
                <span className="stat-label">Response Rate:</span>
                <span className="stat-value">18%</span>
              </div>
              <div className="stat">
                <span className="stat-label">Tools Used:</span>
                <span className="stat-value">LaTeX, Grammarly</span>
              </div>
            </div>
            <div className="resume-actions">
              <button type="button" className="action-button">
                View
              </button>
              <button type="button" className="action-button">
                Edit
              </button>
              <button type="button" className="action-button">
                Download
              </button>
            </div>
          </div>

          <div className="resume-card">
            <div className="resume-header">
              <h3>Full Stack Developer - Startup Focus</h3>
              <div className="resume-status">Active</div>
            </div>
            <div className="resume-stats">
              <div className="stat">
                <span className="stat-label">Time Spent:</span>
                <span className="stat-value">4.2 hours</span>
              </div>
              <div className="stat">
                <span className="stat-label">Applications:</span>
                <span className="stat-value">12</span>
              </div>
              <div className="stat">
                <span className="stat-label">Response Rate:</span>
                <span className="stat-value">12%</span>
              </div>
              <div className="stat">
                <span className="stat-label">Tools Used:</span>
                <span className="stat-value">Google Docs</span>
              </div>
            </div>
            <div className="resume-actions">
              <button type="button" className="action-button">
                View
              </button>
              <button type="button" className="action-button">
                Edit
              </button>
              <button type="button" className="action-button">
                Download
              </button>
            </div>
          </div>

          <div className="resume-card">
            <div className="resume-header">
              <h3>React Developer - Frontend Specialist</h3>
              <div className="resume-status inactive">Inactive</div>
            </div>
            <div className="resume-stats">
              <div className="stat">
                <span className="stat-label">Time Spent:</span>
                <span className="stat-value">6.1 hours</span>
              </div>
              <div className="stat">
                <span className="stat-label">Applications:</span>
                <span className="stat-value">8</span>
              </div>
              <div className="stat">
                <span className="stat-label">Response Rate:</span>
                <span className="stat-value">8%</span>
              </div>
              <div className="stat">
                <span className="stat-label">Tools Used:</span>
                <span className="stat-value">Canva, Notion</span>
              </div>
            </div>
            <div className="resume-actions">
              <button type="button" className="action-button">
                View
              </button>
              <button type="button" className="action-button">
                Edit
              </button>
              <button type="button" className="action-button">
                Download
              </button>
            </div>
          </div>
        </section>

        <section className="resume-insights">
          <h2>Performance Insights</h2>
          <div className="insight-card">
            <h4>Best Performing Keywords</h4>
            <p>
              Resumes mentioning &quot;React&quot;, &quot;TypeScript&quot;, and
              &quot;AWS&quot; have 23% higher response rates.
            </p>
          </div>
          <div className="insight-card">
            <h4>Time Investment Analysis</h4>
            <p>
              Spending more than 6 hours on resume optimization correlates with
              better performance.
            </p>
          </div>
        </section>

        <section className="add-resume">
          <button className="add-button" type="button">
            + Upload New Resume
          </button>
        </section>
      </main>
    </div>
  );
}
