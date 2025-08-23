import { createFileRoute } from "@tanstack/react-router";
import { requireUserAuth } from "../utils/route-guards";
import "./dashboard.css";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: requireUserAuth,
  loader: async () => {
    // On server-side, skip loading data if user is not authenticated
    // Client will reload once auth context is available
    if (typeof window === "undefined") {
      return {
        dashboardData: {
          totalApplications: 0,
          conversionRates: [],
          monthlyOverview: {
            applicationsThisMonth: 0,
            trendVsPreviousMonth: 0,
            dailyAverage: 0,
          },
          pipelineHealth: { byStatus: [], daysSinceLastApplication: 0 },
          performanceInsights: { topJobBoard: { name: "", responseRate: 0 } },
        },
        projectionData: {
          projectedTimeToOffer: { targetDate: new Date().toISOString() },
        },
      };
    }

    // Fetch analytics data from API endpoints
    try {
      const [dashboardResponse, projectionResponse] = await Promise.all([
        fetch("/api/analytics/dashboard", {
          credentials: "include",
        }),
        fetch("/api/analytics/projection", {
          credentials: "include",
        }),
      ]);

      if (!dashboardResponse.ok || !projectionResponse.ok) {
        throw new Error("Failed to fetch analytics data");
      }

      const dashboardResult = await dashboardResponse.json();
      const projectionResult = await projectionResponse.json();

      if (!dashboardResult.success || !projectionResult.success) {
        throw new Error("Analytics API returned error");
      }

      // Extract data from response (createSuccessResponse spreads the data)
      const { success: dashSuccess, ...dashboardData } = dashboardResult;
      const { success: projSuccess, ...projectionData } = projectionResult;

      return {
        dashboardData,
        projectionData,
      };
    } catch (error) {
      console.error("Dashboard loader error:", error);
      throw error;
    }
  },
  component: Dashboard,
});

function Dashboard() {
  const { dashboardData, projectionData } = Route.useLoaderData();

  // Find cold apply conversion rate
  const coldApplyConversion = dashboardData.conversionRates.find(
    (rate: any) => rate.fromStatusName === "Cold Apply",
  );

  // Find phone screen conversion rate
  const phoneScreenConversion = dashboardData.conversionRates.find(
    (rate: any) => rate.fromStatusName === "Phone Screen",
  );

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
            <div className="metric-value">
              {dashboardData.totalApplications}
            </div>
            <p className="metric-description">
              Applications submitted all time
            </p>
          </div>

          <div className="metric-card">
            <h3>Cold Apply Conversion</h3>
            <div className="metric-value">
              {coldApplyConversion
                ? parseFloat(
                    (coldApplyConversion.conversionRate * 100).toFixed(2),
                  )
                : 0}
              %
            </div>
            <p className="metric-description">
              Response rate for cold applications
            </p>
          </div>

          <div className="metric-card">
            <h3>Phone Screen Conversion</h3>
            <div className="metric-value">
              {phoneScreenConversion
                ? parseFloat(
                    (phoneScreenConversion.conversionRate * 100).toFixed(2),
                  )
                : 0}
              %
            </div>
            <p className="metric-description">Phone screens that advance</p>
          </div>

          <div className="metric-card">
            <h3>90% Job Offer By</h3>
            <div className="metric-value">
              {new Date(
                projectionData.projectedTimeToOffer.targetDate,
              ).toLocaleDateString()}
            </div>
            <p className="metric-description">
              Projected date with 90% confidence
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
