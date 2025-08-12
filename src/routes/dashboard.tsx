import { createFileRoute } from '@tanstack/react-router'
import { getDashboardAnalytics, getJobProjection } from '../server/analytics'
import './dashboard.css'

export const Route = createFileRoute('/dashboard')({
    loader: async () => {
        const [dashboardData, projectionData] = await Promise.all([
            getDashboardAnalytics(),
            getJobProjection()
        ])
        return { dashboardData, projectionData }
    },
    component: Dashboard,
})

function Dashboard() {
    const { dashboardData, projectionData } = Route.useLoaderData()

    // Find cold apply conversion rate
    const coldApplyConversion = dashboardData.conversionRates.find(
        (rate: any) => rate.fromStatusName === "Cold Apply"
    )

    // Find phone screen conversion rate
    const phoneScreenConversion = dashboardData.conversionRates.find(
        (rate: any) => rate.fromStatusName === "Phone Screen"
    )

    return (
        <div className="page">
            <header className="page-header">
                <h1>Dashboard</h1>
                <p>High-level overview of your job search progress</p>
            </header>

            <main className="page-content">
                <section className="metrics-grid">
                    <div className="metric-card">
                        <h3>Total Applications</h3>
                        <div className="metric-value">{dashboardData.totalApplications}</div>
                        <p className="metric-description">Applications submitted all time</p>
                    </div>

                    <div className="metric-card">
                        <h3>Cold Apply Conversion</h3>
                        <div className="metric-value">
                            {coldApplyConversion ? parseFloat((coldApplyConversion.conversionRate * 100).toFixed(2)) : 0}%
                        </div>
                        <p className="metric-description">Response rate for cold applications</p>
                    </div>

                    <div className="metric-card">
                        <h3>Phone Screen Conversion</h3>
                        <div className="metric-value">
                            {phoneScreenConversion ? parseFloat((phoneScreenConversion.conversionRate * 100).toFixed(2)) : 0}%
                        </div>
                        <p className="metric-description">Phone screens that advance</p>
                    </div>

                    <div className="metric-card">
                        <h3>90% Job Offer By</h3>
                        <div className="metric-value">
                            {new Date(projectionData.projectedTimeToOffer.targetDate).toLocaleDateString()}
                        </div>
                        <p className="metric-description">Projected date with 90% confidence</p>
                    </div>
                </section>

                <section className="suggestions">
                    <h2>Recommendations</h2>
                    <div className="suggestion-list">
                        {projectionData.recommendedActions.map((action: string, index: number) => (
                            <div key={index} className="suggestion-item">
                                <p>{action}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    )
}