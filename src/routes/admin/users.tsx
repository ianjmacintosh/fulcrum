import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { fetchCSRFTokens, CSRFTokens } from '../../utils/csrf-client'

// Server functions will be called via fetch, no direct imports needed

export const Route = createFileRoute('/admin/users')({
  loader: async () => {
    // Load CSRF tokens in the route loader
    try {
      const { getCSRFTokens } = await import('../../server/admin-auth')
      const csrfResult = await getCSRFTokens()
      
      return {
        csrfTokens: csrfResult.success ? {
          csrfToken: csrfResult.csrfToken!,
          csrfHash: csrfResult.csrfHash!
        } : null
      }
    } catch (error) {
      console.error('Failed to load CSRF tokens in loader:', error)
      return { csrfTokens: null }
    }
  },
  component: AdminUsersPage,
})

interface User {
  id: string
  email: string
  name: string
  createdAt: string
}


interface NewUser {
  email: string
  name: string
  password: string
}

function AdminUsersPage() {
  const router = useRouter()
  const loaderData = Route.useLoaderData()
  const [users, setUsers] = useState<User[]>([])
  const [csrfTokens, setCsrfTokens] = useState<CSRFTokens | null>(loaderData.csrfTokens)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [newUser, setNewUser] = useState<NewUser>({
    email: '',
    name: '',
    password: ''
  })
  const [creatingUser, setCreatingUser] = useState(false)
  const [deletingUser, setDeletingUser] = useState<string | null>(null)

  // Initialize component
  useEffect(() => {
    // Check if CSRF tokens were loaded successfully
    if (!loaderData.csrfTokens) {
      setError('Failed to load security tokens. Please refresh the page.')
    }
    
    fetchUsers()
  }, [loaderData.csrfTokens])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        credentials: 'include'  // This ensures cookies are sent with the request
      })
      const result = await response.json()

      if (response.status === 401) {
        router.navigate({ to: '/admin' })
        return
      }

      if (result.success) {
        setUsers(result.users)
      } else {
        setError(result.error || 'Failed to fetch users')
      }
    } catch (err) {
      setError('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', {
        credentials: 'include'
      })
      router.navigate({ to: '/admin/logout' })
    } catch (err) {
      console.error('Logout error:', err)
      router.navigate({ to: '/admin' })
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!csrfTokens) {
      setError('Security token not ready. Please refresh the page.')
      return
    }

    setCreatingUser(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('email', newUser.email)
      formData.append('name', newUser.name)
      formData.append('password', newUser.password)
      formData.append('csrf_token', csrfTokens.csrfToken)
      formData.append('csrf_hash', csrfTokens.csrfHash)

      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })

      const result = await response.json()

      if (response.status === 401) {
        router.navigate({ to: '/admin' })
        return
      }

      if (result.success) {
        setSuccess('User created successfully')
        setNewUser({ email: '', name: '', password: '' })
        // Fetch new CSRF tokens
        try {
          const newTokens = await fetchCSRFTokens()
          setCsrfTokens(newTokens)
        } catch (tokenError) {
          console.error('Failed to refresh CSRF tokens:', tokenError)
        }
        fetchUsers() // Refresh user list
      } else {
        setError(result.error || 'Failed to create user')
        // Fetch new CSRF tokens on error
        try {
          const newTokens = await fetchCSRFTokens()
          setCsrfTokens(newTokens)
        } catch (tokenError) {
          console.error('Failed to refresh CSRF tokens:', tokenError)
        }
      }
    } catch (err) {
      setError('Failed to create user')
      // Fetch new CSRF tokens on error
      try {
        const newTokens = await fetchCSRFTokens()
        setCsrfTokens(newTokens)
      } catch (tokenError) {
        console.error('Failed to refresh CSRF tokens:', tokenError)
      }
    } finally {
      setCreatingUser(false)
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This will also delete all their job applications and cannot be undone.`)) {
      return
    }

    if (!csrfTokens) {
      setError('Security token not ready. Please refresh the page.')
      return
    }

    setDeletingUser(userId)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token': csrfTokens.csrfToken,
          'x-csrf-hash': csrfTokens.csrfHash,
        },
        credentials: 'include'
      })

      const result = await response.json()

      if (response.status === 401) {
        router.navigate({ to: '/admin' })
        return
      }

      if (result.success) {
        setSuccess(result.message)
        // Fetch new CSRF tokens
        try {
          const newTokens = await fetchCSRFTokens()
          setCsrfTokens(newTokens)
        } catch (tokenError) {
          console.error('Failed to refresh CSRF tokens:', tokenError)
        }
        fetchUsers() // Refresh user list
      } else {
        setError(result.error || 'Failed to delete user')
        // Fetch new CSRF tokens on error
        try {
          const newTokens = await fetchCSRFTokens()
          setCsrfTokens(newTokens)
        } catch (tokenError) {
          console.error('Failed to refresh CSRF tokens:', tokenError)
        }
      }
    } catch (err) {
      setError('Failed to delete user')
      // Fetch new CSRF tokens on error
      try {
        const newTokens = await fetchCSRFTokens()
        setCsrfTokens(newTokens)
      } catch (tokenError) {
        console.error('Failed to refresh CSRF tokens:', tokenError)
      }
    } finally {
      setDeletingUser(null)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewUser(prev => ({ ...prev, [name]: value }))
  }

  const clearMessages = () => {
    setError('')
    setSuccess('')
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="admin-users">
      <div className="admin-header">
        <h1>User Management</h1>
        <div className="admin-nav">
          <button 
            onClick={() => router.navigate({ to: '/admin/change-password' })}
            className="nav-button"
          >
            Change Password
          </button>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>

      {error && (
        <div className="message error-message">
          {error}
          <button onClick={clearMessages} className="close-button">×</button>
        </div>
      )}

      {success && (
        <div className="message success-message">
          {success}
          <button onClick={clearMessages} className="close-button">×</button>
        </div>
      )}

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Email</th>
              <th>Name</th>
              <th>Password</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td className="user-id">{user.id}</td>
                <td>{user.email}</td>
                <td>{user.name}</td>
                <td className="password-field">•••••••••</td>
                <td>
                  <button
                    onClick={() => handleDeleteUser(user.id, user.name)}
                    className="delete-button"
                    disabled={deletingUser === user.id}
                  >
                    {deletingUser === user.id ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
            <tr className="create-user-row">
              <td className="user-id-placeholder">
                {/* Auto-generated UUID will be displayed here after creation */}
                <em>Auto-generated</em>
              </td>
              <td>
                <input
                  type="email"
                  name="email"
                  value={newUser.email}
                  onChange={handleInputChange}
                  placeholder="Enter email"
                  required
                  disabled={creatingUser}
                />
              </td>
              <td>
                <input
                  type="text"
                  name="name"
                  value={newUser.name}
                  onChange={handleInputChange}
                  placeholder="Enter name"
                  required
                  disabled={creatingUser}
                />
              </td>
              <td>
                <input
                  type="password"
                  name="password"
                  value={newUser.password}
                  onChange={handleInputChange}
                  placeholder="Enter password"
                  required
                  disabled={creatingUser}
                  minLength={8}
                />
              </td>
              <td>
                <button
                  onClick={handleCreateUser}
                  className="create-button"
                  disabled={creatingUser || !newUser.email || !newUser.name || !newUser.password}
                >
                  {creatingUser ? 'Creating...' : 'Create'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <style>{`
        .admin-users {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e0e0e0;
        }

        .admin-header h1 {
          margin: 0;
          color: #333;
        }

        .admin-nav {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .nav-button {
          background-color: #6c757d;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: background-color 0.2s ease;
        }

        .nav-button:hover {
          background-color: #5a6268;
        }

        .logout-button {
          background-color: #dc3545;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }

        .logout-button:hover {
          background-color: #c82333;
        }

        .admin-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 200px;
          font-size: 18px;
          color: #666;
        }

        .message {
          padding: 12px 16px;
          margin-bottom: 20px;
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-message {
          background-color: #fee;
          color: #c33;
          border: 1px solid #fcc;
        }

        .success-message {
          background-color: #efe;
          color: #363;
          border: 1px solid #cfc;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          margin-left: 10px;
          opacity: 0.7;
        }

        .close-button:hover {
          opacity: 1;
        }

        .users-table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .users-table {
          width: 100%;
          border-collapse: collapse;
        }

        .users-table th,
        .users-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid #e0e0e0;
        }

        .users-table th {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #333;
        }

        .user-id {
          font-family: monospace;
          font-size: 12px;
          color: #666;
          max-width: 200px;
          word-break: break-all;
        }

        .user-id-placeholder {
          font-family: monospace;
          font-size: 12px;
          color: #999;
          font-style: italic;
        }

        .password-field {
          font-family: monospace;
          color: #999;
        }

        .create-user-row {
          background-color: #f8f9fa;
        }

        .create-user-row input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .create-user-row input:focus {
          outline: none;
          border-color: #007bff;
        }

        .delete-button {
          background-color: #dc3545;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .delete-button:hover:not(:disabled) {
          background-color: #c82333;
        }

        .delete-button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .create-button {
          background-color: #28a745;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .create-button:hover:not(:disabled) {
          background-color: #218838;
        }

        .create-button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .admin-users {
            padding: 10px;
          }

          .users-table-container {
            overflow-x: auto;
          }

          .users-table {
            min-width: 700px;
          }

          .admin-header {
            flex-direction: column;
            gap: 15px;
            align-items: stretch;
          }

          .admin-header h1 {
            text-align: center;
          }
        }
      `}</style>
    </div>
  )
}