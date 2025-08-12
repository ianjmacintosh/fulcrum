import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { adminLogin } from '../../server/admin-auth'

export const Route = createFileRoute('/admin/')({
  component: AdminLoginPage,
})


function AdminLoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  // CSRF tokens temporarily disabled for testing
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // TODO: Re-implement CSRF tokens after fixing browser compatibility

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('Attempting login with:', { username: formData.username, password: '[REDACTED]' })
      
      // Call the imported server function directly
      const result = await adminLogin({
        data: {
          username: formData.username,
          password: formData.password
        }
      })
      
      console.log('Login result:', { ...result, sessionCookie: result.sessionCookie ? '[REDACTED]' : undefined })

      if (result && result.success) {
        // Store session info and redirect
        if (result.sessionCookie) {
          document.cookie = result.sessionCookie
        }
        router.navigate({ to: '/admin/users' })
      } else {
        setError(result?.error || 'Login failed')
      }
    } catch (err) {
      console.error('Login error details:', err)
      setError(`Debug: ${err.message || 'An error occurred. Please try again.'}`)
    }

    setLoading(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="admin-login">
      <div className="admin-login-container">
        <div className="admin-login-header">
          <h1>Admin Login</h1>
          <p>Sign in to access the admin panel</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .admin-login {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f5f5f5;
          padding: 20px;
        }

        .admin-login-container {
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 400px;
        }

        .admin-login-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .admin-login-header h1 {
          margin: 0 0 8px 0;
          color: #333;
          font-size: 28px;
        }

        .admin-login-header p {
          margin: 0;
          color: #666;
          font-size: 16px;
        }

        .admin-login-form {
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

        .error-message {
          background-color: #fee;
          color: #c33;
          padding: 12px 16px;
          border-radius: 6px;
          border: 1px solid #fcc;
          font-size: 14px;
          text-align: center;
        }

        .login-button {
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

        .login-button:hover:not(:disabled) {
          background-color: #0056b3;
        }

        .login-button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        @media (max-width: 480px) {
          .admin-login-container {
            padding: 30px 20px;
          }
          
          .admin-login-header h1 {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  )
}