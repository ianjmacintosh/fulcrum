import { createFileRoute, Link } from '@tanstack/react-router'
import './index.css'

export const Route = createFileRoute('/')({
    component: Home,
})

function Home() {
    return (
        <div className="page">
            <header className="home-header">
                <h1>Welcome to Fulcrum</h1>
                <p className="home-subtitle">Find your next job like a pro</p>
                <p className="home-description">
                    Track applications, job boards, resumes, and conversion rates throughout your job search journey.
                </p>
            </header>

            <main className="home-content">
                <section className="quick-links">
                    <h2>Get Started</h2>
                    <div className="links-grid">
                        <Link to="/dashboard" className="quick-link">
                            <h3>Dashboard</h3>
                            <p>View your job search metrics and progress</p>
                        </Link>
                        <Link to="/applications" className="quick-link">
                            <h3>Applications</h3>
                            <p>Track and manage your job applications</p>
                        </Link>
                        <Link to="/job-boards" className="quick-link">
                            <h3>Job Boards</h3>
                            <p>Monitor job boards and saved searches</p>
                        </Link>
                        <Link to="/resumes" className="quick-link">
                            <h3>Resumes</h3>
                            <p>Manage resume versions and performance</p>
                        </Link>
                    </div>
                </section>

                <section className="features">
                    <h2>Key Features</h2>
                    <div className="features-list">
                        <div className="feature-item">
                            <h4>Application Tracking</h4>
                            <p>Keep track of where you've applied and follow up appropriately</p>
                        </div>
                        <div className="feature-item">
                            <h4>Conversion Analytics</h4>
                            <p>Understand your success rates at each stage of the process</p>
                        </div>
                        <div className="feature-item">
                            <h4>Job Board Optimization</h4>
                            <p>Identify which job boards yield the best results for you</p>
                        </div>
                        <div className="feature-item">
                            <h4>Resume Performance</h4>
                            <p>Track which resume versions perform best for different roles</p>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    )
}