import { Link } from "@tanstack/react-router";
import { JobApplication } from "../db/schemas";

interface JobApplicationCardProps {
    application: JobApplication;
}

export function JobApplicationCard({ application }: JobApplicationCardProps) {
    const getMostRecentEventDate = (events: JobApplication['events']): string => {
        if (events.length === 0) return '';
        
        // Sort events by date (most recent first) and get the first one
        const sortedEvents = [...events].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        return new Date(sortedEvents[0].date).toISOString().split('T')[0];
    };

    const getStatusBadgeClass = (statusId: string): string => {
        const baseClass = 'status-badge';
        switch (statusId.toLowerCase()) {
            case 'applied':
                return `${baseClass} applied`;
            case 'phone_screen':
                return `${baseClass} phone-screen`;
            case 'interview':
                return `${baseClass} interview`;
            case 'rejected':
                return `${baseClass} rejected`;
            default:
                return baseClass;
        }
    };

    return (
        <Link 
            to="/applications/$id/details" 
            params={{ id: application._id?.toString() || '' }}
            className="application-card-link"
        >
            <div className="application-card">
                <div className="card-content">
                    <div className="card-header">
                        <h3 className="company-name">{application.companyName}</h3>
                        <span className={getStatusBadgeClass(application.currentStatus.id)}>
                            {application.currentStatus.name}
                        </span>
                    </div>
                    <div className="role-name">{application.roleName}</div>
                    <div className="status-date">
                        {getMostRecentEventDate(application.events)}
                    </div>
                </div>
            </div>
        </Link>
    );
}