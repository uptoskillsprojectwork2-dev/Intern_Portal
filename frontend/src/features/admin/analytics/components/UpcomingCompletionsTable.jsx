import StatusBadge from '../../../shared/components/StatusBadge.jsx';
import './UpcomingCompletionsTable.css';

const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function UpcomingCompletionsTable({ data }) {
    if (!data) {
        return <div className="chart-empty">No data for this period</div>;
    }

    const { interns, withoutCertificate } = data;

    if (!interns || interns.length === 0) {
        return <div className="chart-empty">No upcoming completions in the next 30 days</div>;
    }

    return (
        <div className="upcoming-wrapper">
            <div className="upcoming-header">
                <h4>Upcoming Completions</h4>
                <span className="upcoming-count">{interns.length} interns ending</span>
                <span className="upcoming-without-cert">{withoutCertificate} without certificate request</span>
            </div>
            <table className="upcoming-table">
                <thead>
                    <tr>
                        <th>Intern</th>
                        <th>Domain</th>
                        <th>Status</th>
                        <th>End Date</th>
                        <th>Days Left</th>
                        <th>Certificate</th>
                    </tr>
                </thead>
                <tbody>
                    {interns.map((intern) => (
                        <tr key={intern._id}>
                            <td>
                                <div className="upcoming-intern">
                                    <strong>{intern.fullName || '—'}</strong>
                                    <span>{intern.internCode || '—'}</span>
                                </div>
                            </td>
                            <td>{intern.domain || '—'}</td>
                            <td><StatusBadge status={intern.status} /></td>
                            <td>{formatDate(intern.endDate)}</td>
                            <td>
                                <span className={`upcoming-days ${intern.daysToEnd <= 7 ? 'urgent' : ''}`}>
                                    {intern.daysToEnd} days
                                </span>
                            </td>
                            <td>
                                {intern.hasCompletionRequest ? (
                                    <span className={`cert-status ${intern.requestStatus === 'completed' ? 'is-completed' : 'in-progress'}`}>
                                        {intern.requestStatus === 'completed' ? 'Completed' : 'In Progress'}
                                    </span>
                                ) : (
                                    <span className="cert-status not-requested">Not Requested</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
