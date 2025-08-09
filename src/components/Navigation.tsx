import { Link } from '@tanstack/react-router'
import './Navigation.css'

export function Navigation() {
    return (
        <nav className="navigation">
            <ul className="nav-list">
                <li className="nav-item">
                    <Link to="/" className="nav-link brand">
                        Fulcrum
                    </Link>
                </li>
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
            </ul>
        </nav>
    )
}