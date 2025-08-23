import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";

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
          <Link to="/admin" className="login-again-button">
            Login Again
          </Link>
          <Link to="/" className="home-button">
            Back to Home
          </Link>
        </div>
      </div>

      <style jsx>{`
        .admin-logout {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f5f5f5;
          padding: 20px;
        }

        .logout-container {
          background: white;
          padding: 60px 40px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          text-align: center;
          max-width: 500px;
          width: 100%;
        }

        .logout-icon {
          margin-bottom: 30px;
          display: flex;
          justify-content: center;
        }

        .logout-container h1 {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 28px;
          font-weight: 600;
        }

        .logout-container p {
          margin: 0 0 40px 0;
          color: #666;
          font-size: 16px;
          line-height: 1.5;
        }

        .logout-actions {
          display: flex;
          gap: 15px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .login-again-button,
        .home-button {
          display: inline-block;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.2s ease;
        }

        .login-again-button {
          background-color: #007bff;
          color: white;
        }

        .login-again-button:hover {
          background-color: #0056b3;
          transform: translateY(-1px);
        }

        .home-button {
          background-color: #6c757d;
          color: white;
        }

        .home-button:hover {
          background-color: #5a6268;
          transform: translateY(-1px);
        }

        @media (max-width: 480px) {
          .logout-container {
            padding: 40px 20px;
          }

          .logout-container h1 {
            font-size: 24px;
          }

          .logout-actions {
            flex-direction: column;
          }

          .login-again-button,
          .home-button {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
