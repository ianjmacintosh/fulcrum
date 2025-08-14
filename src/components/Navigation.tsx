import { Link } from '@tanstack/react-router'
import { useAuth } from '../hooks/useAuth'
import './Navigation.css'

export function Navigation() {
    const { isLoggedIn, userType, user, logout } = useAuth()

    const handleLogout = async (e: React.MouseEvent) => {
        e.preventDefault()
        await logout()
        window.location.href = '/'
    }

    return (
        <nav className="navigation">
            <ul className="nav-list">
                <li className="nav-item">
                    <Link to="/" className="nav-link brand">
                        Fulcrum
                    </Link>
                </li>
                
                {!isLoggedIn && (
                    <li className="nav-item">
                        <Link to="/login" className="nav-link" activeProps={{ className: 'nav-link active' }}>
                            Login
                        </Link>
                    </li>
                )}

                {isLoggedIn && userType === 'user' && (
                    <>
                        <li className="nav-item">
                            <Link to="/dashboard" className="nav-link" activeProps={{ className: 'nav-link active' }}>
                                Dashboard
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link to="/job-boards" className="nav-link" activeProps={{ className: 'nav-link active' }}>
                                Job Boards
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link to="/applications" className="nav-link" activeProps={{ className: 'nav-link active' }}>
                                Applications
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link to="/resumes" className="nav-link" activeProps={{ className: 'nav-link active' }}>
                                Resumes
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link to="/settings" className="nav-link" activeProps={{ className: 'nav-link active' }}>
                                Settings
                            </Link>
                        </li>
                    </>
                )}

                {isLoggedIn && userType === 'admin' && (
                    <>
                        <li className="nav-item">
                            <Link to="/admin/users" className="nav-link" activeProps={{ className: 'nav-link active' }}>
                                Users
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link to="/admin/change-password" className="nav-link" activeProps={{ className: 'nav-link active' }}>
                                Change Password
                            </Link>
                        </li>
                    </>
                )}

                {isLoggedIn && (
                    <li className="nav-item nav-user-section">
                        <span className="nav-user-info">
                            {userType === 'user' && user && 'name' in user && user.name}
                            {userType === 'admin' && user && 'username' in user && `Admin: ${user.username}`}
                        </span>
                        <button onClick={handleLogout} className="nav-link logout-button">
                            Logout
                        </button>
                    </li>
                )}
            </ul>
        </nav>
    )
}