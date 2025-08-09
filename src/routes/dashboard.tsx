import { createFileRoute } from '@tanstack/react-router'
import './dashboard.css'

export const Route = createFileRoute('/dashboard')({
    component: Dashboard,
})

function Dashboard() {
    return (
        <div className="page">
            <header className="page-header">
                <h1>Dashboard</h1>
                <p>High-level overview of your job search progress</p>
            </header>

            <main className="page-content">
                <section className="metrics-grid">
                    <div className="metric-card">
                        <h3>Applications Submitted</h3>
                        <div className="metric-value">42</div>
                        <p className="metric-description">Total applications this month</p>
                    </div>

                    <div className="metric-card">
                        <h3>Cold Apply Conversion</h3>
                        <div className="metric-value">12%</div>
                        <p className="metric-description">Response rate for cold applications</p>
                    </div>

                    <div className="metric-card">
                        <h3>Phone Screen Conversion</h3>
                        <div className="metric-value">68%</div>
                        <p className="metric-description">Phone screens that advance</p>
                    </div>

                    <div className="metric-card">
                        <h3>Expected Timeline</h3>
                        <div className="metric-value">6-8 weeks</div>
                        <p className="metric-description">Projected time to job offer</p>
                    </div>
                </section>

                <section className="suggestions">
                    <h2>Focus Areas</h2>
                    <div className="suggestion-list">
                        <div className="suggestion-item">
                            <h4>Increase Application Volume</h4>
                            <p>Consider applying to 5-7 more positions this week to improve your pipeline.</p>
                        </div>
                        <div className="suggestion-item">
                            <h4>Optimize Resume Performance</h4>
                            <p>Your "Software Engineer" resume has a 15% higher response rate than others.</p>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    )
}