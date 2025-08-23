import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { requireAdminAuth } from "../../utils/route-guards";

export const Route = createFileRoute("/admin/change-password")({
  beforeLoad: requireAdminAuth,
  component: AdminChangePasswordPage,
});

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function AdminChangePasswordPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<PasswordFormData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Client-side validation
    if (formData.newPassword !== formData.confirmPassword) {
      setError("New password and confirmation don't match");
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess("Password changed successfully!");
        setFormData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        // Handle rate limiting specially
        if (response.status === 429) {
          const retryAfter = result?.retryAfter;
          if (retryAfter) {
            const minutes = Math.ceil(retryAfter / 60);
            setError(
              `Too many failed attempts. Please wait ${minutes} minute${minutes > 1 ? "s" : ""} before trying again.`,
            );
          } else {
            setError(
              result?.error ||
                "Too many failed attempts. Please try again later.",
            );
          }
        } else {
          setError(result?.error || "Failed to change password");
        }
      }
    } catch (err) {
      console.error("Password change error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear messages when user starts typing
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleBackToUsers = () => {
    router.navigate({ to: "/admin/users" });
  };

  return (
    <div className="admin-change-password">
      <div className="admin-change-password-container">
        <div className="admin-change-password-header">
          <button
            type="button"
            onClick={handleBackToUsers}
            className="back-button"
          >
            ← Back to Users
          </button>
          <h1>Change Admin Password</h1>
          <p>Update your admin password for security</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-change-password-form">
          <div className="form-group">
            <label htmlFor="currentPassword">Current Password</label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleInputChange}
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              required
              disabled={loading}
              autoComplete="new-password"
              minLength={8}
            />
            <div className="password-hint">
              Must be at least 8 characters long
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button
            type="submit"
            className="change-password-button"
            disabled={loading}
          >
            {loading ? "Changing Password..." : "Change Password"}
          </button>
        </form>
      </div>

      <style>{`
        .admin-change-password {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f5f5f5;
          padding: 20px;
        }

        .admin-change-password-container {
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 450px;
        }

        .admin-change-password-header {
          margin-bottom: 30px;
        }

        .back-button {
          background: none;
          border: none;
          color: #007bff;
          text-decoration: none;
          cursor: pointer;
          font-size: 14px;
          padding: 4px 0;
          margin-bottom: 15px;
          display: block;
          transition: color 0.2s ease;
        }

        .back-button:hover {
          color: #0056b3;
        }

        .admin-change-password-header h1 {
          margin: 0 0 8px 0;
          color: #333;
          font-size: 28px;
          text-align: center;
        }

        .admin-change-password-header p {
          margin: 0;
          color: #666;
          font-size: 16px;
          text-align: center;
        }

        .admin-change-password-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }

        .form-group input {
          padding: 12px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          font-size: 16px;
          transition: border-color 0.2s ease;
        }

        .form-group input:focus {
          outline: none;
          border-color: #007bff;
        }

        .form-group input:disabled {
          background-color: #f8f9fa;
          opacity: 0.6;
        }

        .password-hint {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }

        .error-message {
          background-color: #fee;
          color: #c33;
          padding: 12px 16px;
          border-radius: 6px;
          border: 1px solid #fcc;
          font-size: 14px;
          text-align: center;
        }

        .success-message {
          background-color: #f0fff4;
          color: #2d5a3d;
          padding: 12px 16px;
          border-radius: 6px;
          border: 1px solid #c3e6cb;
          font-size: 14px;
          text-align: center;
        }

        .change-password-button {
          background-color: #007bff;
          color: white;
          border: none;
          padding: 14px 24px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .change-password-button:hover:not(:disabled) {
          background-color: #0056b3;
        }

        .change-password-button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        @media (max-width: 480px) {
          .admin-change-password-container {
            padding: 30px 20px;
          }
          
          .admin-change-password-header h1 {
            font-size: 24px;
          }

          .back-button {
            margin-bottom: 20px;
          }
        }
      `}</style>
    </div>
  );
}
