import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import "./logout.css";

export const Route = createFileRoute("/admin/logout")({
  component: AdminLogoutPage,
});

function AdminLogoutPage() {
  useEffect(() => {
    // Ensure logout API is called when this page loads
    const performLogout = async () => {
      try {
        await fetch("/api/admin/logout");
      } catch (error) {
        console.error("Logout error:", error);
      }
    };

    performLogout();
  }, []);

  return (
    <div className="admin-logout">
      <div className="logout-container">
        <div className="logout-icon">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9"
              stroke="#28a745"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16 17L21 12L16 7"
              stroke="#28a745"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M21 12H9"
              stroke="#28a745"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1>Successfully Logged Out</h1>
        <p>You have been successfully logged out of the admin panel.</p>

        <div className="logout-actions">
          <Link to="/login" className="login-again-button">
            Login Again
          </Link>
          <Link to="/" className="home-button">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
