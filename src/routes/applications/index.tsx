import { createFileRoute, Link } from '@tanstack/react-router'
import { requireUserAuth } from '../../utils/route-guards'
import { JobApplicationCardsList } from '../../components/JobApplicationCardsList'
import './index.css'

export const Route = createFileRoute('/applications/')({
    beforeLoad: requireUserAuth,
    loader: async () => {
        // On server-side, skip loading data if user is not authenticated
        // Client will reload once auth context is available
        if (typeof window === 'undefined') {
            return { applications: [] }
        }
        
        try {
            const response = await fetch('/api/applications/', { 
                credentials: 'include' 
            })
            
            if (!response.ok) {
                throw new Error('Failed to fetch applications')
            }
            
            const result = await response.json()
            
            if (!result.success) {
                throw new Error('Applications API returned error')
            }
            
            return { applications: result.applications }
        } catch (error) {
            console.error('Applications loader error:', error)
            throw error
        }
    },
    component: Applications,
})

function Applications() {
    const { applications } = Route.useLoaderData()

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
                            <span className="summary-label">Total Applications</span>
                            <span className="summary-value">{applications.length}</span>
                        </div>
                        <div className="summary-stat">
                            <span className="summary-label">Open Applications</span>
                            <span className="summary-value">
                                {applications.filter((app: any) => 
                                    !['rejected', 'declined', 'withdrawn'].includes(app.currentStatus.id.toLowerCase())
                                ).length}
                            </span>
                        </div>
                        <div className="summary-stat">
                            <span className="summary-label">Closed/Rejected</span>
                            <span className="summary-value">
                                {applications.filter((app: any) => 
                                    ['rejected', 'declined', 'withdrawn'].includes(app.currentStatus.id.toLowerCase())
                                ).length}
                            </span>
                        </div>
                    </div>
                </section>

                <JobApplicationCardsList applications={applications} />

                <section className="add-application">
                    <Link to="/applications/new" className="add-button">
                        + Add New Application
                    </Link>
                </section>
            </main>
        </div>
    )
}