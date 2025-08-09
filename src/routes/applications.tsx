import { createFileRoute } from '@tanstack/react-router'
import './applications.css'

export const Route = createFileRoute('/applications')({
    component: Applications,
})

function Applications() {
    return (
        <div className="page">
            <header className="page-header">
                <h1>Applications</h1>
                <p>Track all applications and update job status throughout the process</p>
            </header>

            <main className="page-content">
                <section className="applications-summary">
                    <div className="summary-stats">
                        <div className="summary-stat">
                            <span className="summary-label">Open Applications</span>
                            <span className="summary-value">18</span>
                        </div>
                        <div className="summary-stat">
                            <span className="summary-label">Awaiting Response</span>
                            <span className="summary-value">12</span>
                        </div>
                        <div className="summary-stat">
                            <span className="summary-label">Closed/Rejected</span>
                            <span className="summary-value">24</span>
                        </div>
                    </div>
                </section>

                <section className="applications-table">
                    <div className="table-header">
                        <div className="header-cell">Company</div>
                        <div className="header-cell">Position</div>
                        <div className="header-cell">Applied Date</div>
                        <div className="header-cell">Status</div>
                        <div className="header-cell">Last Activity</div>
                    </div>

                    <div className="application-row">
                        <div className="cell">TechCorp Inc.</div>
                        <div className="cell">Senior Software Engineer</div>
                        <div className="cell">2025-01-05</div>
                        <div className="cell">
                            <span className="status-badge phone-screen">Phone Screen</span>
                        </div>
                        <div className="cell">2025-01-08</div>
                    </div>

                    <div className="application-row">
                        <div className="cell">StartupXYZ</div>
                        <div className="cell">Full Stack Developer</div>
                        <div className="cell">2025-01-03</div>
                        <div className="cell">
                            <span className="status-badge applied">Applied</span>
                        </div>
                        <div className="cell">2025-01-03</div>
                    </div>

                    <div className="application-row">
                        <div className="cell">MegaCorp</div>
                        <div className="cell">React Developer</div>
                        <div className="cell">2024-12-28</div>
                        <div className="cell">
                            <span className="status-badge interview">On-site Interview</span>
                        </div>
                        <div className="cell">2025-01-07</div>
                    </div>

                    <div className="application-row">
                        <div className="cell">DevCompany</div>
                        <div className="cell">Frontend Engineer</div>
                        <div className="cell">2024-12-20</div>
                        <div className="cell">
                            <span className="status-badge rejected">Rejected</span>
                        </div>
                        <div className="cell">2025-01-02</div>
                    </div>

                    <div className="application-row">
                        <div className="cell">CloudTech</div>
                        <div className="cell">Software Engineer</div>
                        <div className="cell">2024-12-15</div>
                        <div className="cell">
                            <span className="status-badge applied">Applied</span>
                        </div>
                        <div className="cell">2024-12-15</div>
                    </div>
                </section>

                <section className="add-application">
                    <button className="add-button" type="button">
                        + Add New Application
                    </button>
                </section>
            </main>
        </div>
    )
}