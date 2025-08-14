import { createFileRoute } from '@tanstack/react-router'
import { requireUserAuth } from '../utils/route-guards'
import './job-boards.css'

export const Route = createFileRoute('/job-boards')({
    beforeLoad: requireUserAuth,
    component: JobBoards,
})

function JobBoards() {
    return (
        <div className="page">
            <header className="page-header">
                <h1>Job Boards</h1>
                <p>Track job boards and saved searches to find roles to apply for</p>
            </header>

            <main className="page-content">
                <section className="job-boards-list">
                    <div className="job-board-card">
                        <div className="job-board-header">
                            <h3>LinkedIn</h3>
                            <div className="job-board-status">Active</div>
                        </div>
                        <div className="job-board-stats">
                            <div className="stat">
                                <span className="stat-label">Time Spent:</span>
                                <span className="stat-value">12.5 hours</span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">Roles Found:</span>
                                <span className="stat-value">28</span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">Response Rate:</span>
                                <span className="stat-value">15%</span>
                            </div>
                        </div>
                        <div className="saved-searches">
                            <h4>Saved Searches</h4>
                            <ul>
                                <li>"Software Engineer" in San Francisco</li>
                                <li>"Full Stack Developer" Remote</li>
                            </ul>
                        </div>
                    </div>

                    <div className="job-board-card">
                        <div className="job-board-header">
                            <h3>Indeed</h3>
                            <div className="job-board-status">Active</div>
                        </div>
                        <div className="job-board-stats">
                            <div className="stat">
                                <span className="stat-label">Time Spent:</span>
                                <span className="stat-value">8.2 hours</span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">Roles Found:</span>
                                <span className="stat-value">15</span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">Response Rate:</span>
                                <span className="stat-value">8%</span>
                            </div>
                        </div>
                        <div className="saved-searches">
                            <h4>Saved Searches</h4>
                            <ul>
                                <li>"React Developer" Remote</li>
                            </ul>
                        </div>
                    </div>

                    <div className="job-board-card">
                        <div className="job-board-header">
                            <h3>AngelList</h3>
                            <div className="job-board-status inactive">Inactive</div>
                        </div>
                        <div className="job-board-stats">
                            <div className="stat">
                                <span className="stat-label">Time Spent:</span>
                                <span className="stat-value">3.1 hours</span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">Roles Found:</span>
                                <span className="stat-value">7</span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">Response Rate:</span>
                                <span className="stat-value">4%</span>
                            </div>
                        </div>
                        <div className="saved-searches">
                            <h4>Saved Searches</h4>
                            <ul>
                                <li>"Startup Engineer" in Bay Area</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section className="add-job-board">
                    <button className="add-button" type="button">
                        + Add New Job Board
                    </button>
                </section>
            </main>
        </div>
    )
}