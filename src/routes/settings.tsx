import { createFileRoute } from '@tanstack/react-router'
import './settings.css'

export const Route = createFileRoute('/settings')({
    component: Settings,
})

function Settings() {
    return (
        <div className="page">
            <header className="page-header">
                <h1>Settings</h1>
                <p>User preferences and extended functionality configuration</p>
            </header>

            <main className="page-content">
                <section className="settings-section">
                    <h2>Account Settings</h2>
                    <div className="settings-grid">
                        <div className="setting-item">
                            <label className="setting-label">Email Address</label>
                            <input 
                                type="email" 
                                className="setting-input" 
                                defaultValue="user@example.com"
                                disabled
                            />
                        </div>
                        <div className="setting-item">
                            <label className="setting-label">Password</label>
                            <button type="button" className="setting-button">
                                Change Password
                            </button>
                        </div>
                        <div className="setting-item">
                            <label className="setting-label">Time Zone</label>
                            <select className="setting-select" defaultValue="America/Los_Angeles">
                                <option value="America/New_York">Eastern Time</option>
                                <option value="America/Chicago">Central Time</option>
                                <option value="America/Denver">Mountain Time</option>
                                <option value="America/Los_Angeles">Pacific Time</option>
                            </select>
                        </div>
                    </div>
                </section>

                <section className="settings-section">
                    <h2>Auto-Complete Configuration</h2>
                    <div className="settings-grid">
                        <div className="setting-item">
                            <label className="setting-label">Full Name</label>
                            <input 
                                type="text" 
                                className="setting-input" 
                                defaultValue="John Doe"
                                placeholder="Enter your full name"
                            />
                        </div>
                        <div className="setting-item">
                            <label className="setting-label">Phone Number</label>
                            <input 
                                type="tel" 
                                className="setting-input" 
                                defaultValue="+1 (555) 123-4567"
                                placeholder="Enter your phone number"
                            />
                        </div>
                        <div className="setting-item">
                            <label className="setting-label">LinkedIn Profile</label>
                            <input 
                                type="url" 
                                className="setting-input" 
                                defaultValue="https://linkedin.com/in/johndoe"
                                placeholder="LinkedIn profile URL"
                            />
                        </div>
                        <div className="setting-item">
                            <label className="setting-label">Portfolio Website</label>
                            <input 
                                type="url" 
                                className="setting-input" 
                                defaultValue="https://johndoe.dev"
                                placeholder="Portfolio website URL"
                            />
                        </div>
                    </div>
                    <div className="setting-description">
                        <p>This information will be used by the browser extension to automatically fill job application forms.</p>
                    </div>
                </section>

                <section className="settings-section">
                    <h2>Email Integration</h2>
                    <div className="email-integration">
                        <div className="setting-item">
                            <label className="setting-label">Custom Email Address</label>
                            <div className="email-display">
                                <code>johndoe-jobs@fulcrum.app</code>
                                <button type="button" className="copy-button">Copy</button>
                            </div>
                        </div>
                        <div className="setting-description">
                            <p>Forward job-related emails to this address to automatically update application status instead of manual entry.</p>
                        </div>
                        <div className="setting-item">
                            <label className="setting-checkbox">
                                <input type="checkbox" defaultChecked />
                                <span className="checkmark"></span>
                                Enable email parsing for status updates
                            </label>
                        </div>
                    </div>
                </section>

                <section className="settings-section">
                    <h2>Preferences</h2>
                    <div className="settings-grid">
                        <div className="setting-item">
                            <label className="setting-checkbox">
                                <input type="checkbox" defaultChecked />
                                <span className="checkmark"></span>
                                Send weekly progress reports
                            </label>
                        </div>
                        <div className="setting-item">
                            <label className="setting-checkbox">
                                <input type="checkbox" defaultChecked />
                                <span className="checkmark"></span>
                                Remind me to update application status
                            </label>
                        </div>
                        <div className="setting-item">
                            <label className="setting-checkbox">
                                <input type="checkbox" />
                                <span className="checkmark"></span>
                                Share anonymous analytics to improve Fulcrum
                            </label>
                        </div>
                    </div>
                </section>

                <section className="settings-actions">
                    <button type="button" className="save-button">
                        Save Changes
                    </button>
                    <button type="button" className="cancel-button">
                        Cancel
                    </button>
                </section>
            </main>
        </div>
    )
}