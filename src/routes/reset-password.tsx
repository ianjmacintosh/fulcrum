import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  return (
    <div className="reset-password">
      <div className="reset-password-container">
        <div className="reset-password-header">
          <h1>Reset Password</h1>
          <p>Need help with your password?</p>
        </div>

        <div className="reset-password-content">
          <div className="message-box">
            <div className="icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="#667eea" strokeWidth="2"/>
                <path d="m9 12 2 2 4-4" stroke="#667eea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2>Contact Your Admin</h2>
            <p>To reset your password, please contact your system administrator. They will be able to help you regain access to your account.</p>
          </div>
        </div>

        <div className="reset-password-footer">
          <Link to="/login" className="back-to-login-link">
            ← Back to Sign In
          </Link>
        </div>
      </div>

      <style>{`
        .reset-password {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .reset-password-container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 460px;
          text-align: center;
        }

        .reset-password-header {
          margin-bottom: 30px;
        }

        .reset-password-header h1 {
          margin: 0 0 8px 0;
          color: #333;
          font-size: 28px;
          font-weight: 700;
        }

        .reset-password-header p {
          margin: 0;
          color: #666;
          font-size: 16px;
        }

        .reset-password-content {
          margin-bottom: 30px;
        }

        .message-box {
          background: #f8f9ff;
          border: 2px solid #e6e8ff;
          border-radius: 12px;
          padding: 30px;
        }

        .icon {
          margin-bottom: 20px;
        }

        .icon svg {
          display: block;
          margin: 0 auto;
        }

        .message-box h2 {
          margin: 0 0 16px 0;
          color: #333;
          font-size: 22px;
          font-weight: 600;
        }

        .message-box p {
          margin: 0;
          color: #555;
          font-size: 16px;
          line-height: 1.5;
        }

        .reset-password-footer {
          border-top: 1px solid #e0e0e0;
          padding-top: 20px;
        }

        .back-to-login-link {
          color: #667eea;
          text-decoration: none;
          font-size: 16px;
          font-weight: 500;
          transition: color 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .back-to-login-link:hover {
          color: #764ba2;
        }

        @media (max-width: 480px) {
          .reset-password-container {
            padding: 30px 20px;
          }
          
          .reset-password-header h1 {
            font-size: 24px;
          }

          .message-box {
            padding: 20px;
          }

          .message-box h2 {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  )
}