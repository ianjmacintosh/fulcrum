import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

export const Route = createFileRoute('/logout')({
  component: LogoutPage,
})

function LogoutPage() {
  const router = useRouter()
  const { logout } = useAuth()

  useEffect(() => {
    const performLogout = async () => {
      try {
        await logout()
        // Redirect to homepage after logout
        await router.navigate({ to: '/' })
      } catch (error) {
        console.error('Logout error:', error)
        // Still redirect to homepage even if logout fails
        await router.navigate({ to: '/' })
      }
    }

    performLogout()
  }, [logout, router])

  return (
    <div className="logout">
      <div className="logout-container">
        <div className="spinner">
          <div className="bounce1"></div>
          <div className="bounce2"></div>
          <div className="bounce3"></div>
        </div>
        <p>Signing you out...</p>
      </div>

      <style>{`
        .logout {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .logout-container {
          text-align: center;
          color: white;
        }

        .logout-container p {
          margin-top: 20px;
          font-size: 18px;
          font-weight: 500;
        }

        .spinner {
          width: 60px;
          text-align: center;
          margin: 0 auto;
        }

        .spinner > div {
          width: 12px;
          height: 12px;
          background-color: white;
          border-radius: 100%;  
          display: inline-block;
          animation: sk-bouncedelay 1.4s infinite ease-in-out both;
        }

        .spinner .bounce1 {
          animation-delay: -0.32s;
        }

        .spinner .bounce2 {
          animation-delay: -0.16s;
        }

        @keyframes sk-bouncedelay {
          0%, 80%, 100% { 
            transform: scale(0);
          } 40% { 
            transform: scale(1.0);
          }
        }
      `}</style>
    </div>
  )
}