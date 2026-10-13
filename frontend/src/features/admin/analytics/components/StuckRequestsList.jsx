import { useNavigate } from 'react-router-dom';
import StatusBadge from '../../../shared/components/StatusBadge.jsx';
import { CERTIFICATE_TYPE_LABELS } from '../constants/analyticsConstants.js';
import './StuckRequestsList.css';

const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function StuckRequestsList({ data }) {
    const navigate = useNavigate();

    if (!data) {
        return <div className="chart-empty">No data for this period</div>;
    }

    const { overdueRequests } = data;

    if (!overdueRequests || overdueRequests.length === 0) {
        return <div className="chart-empty">No stuck requests found — all requests are on track</div>;
    }

    return (
        <div className="stuck-requests-wrapper">
            <div className="stuck-requests-header">
                <h4>Stuck Requests</h4>
                <span className="stuck-requests-count">{overdueRequests.length} overdue</span>
            </div>
            <table className="stuck-requests-table">
                <thead>
                    <tr>
                        <th>Request #</th>
                        <th>Intern</th>
                        <th>Domain</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Requested</th>
                        <th>Days Pending</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {overdueRequests.map((r) => (
                        <tr key={r._id || r.requestNumber}>
                            <td><code className="stuck-req-code">{r.requestNumber || '—'}</code></td>
                            <td>
                                <div className="stuck-intern">
                                    <strong>{r.internName || 'Unknown'}</strong>
                                    <span>{r.internCode}</span>
                                </div>
                            </td>
                            <td>{r.domain || '—'}</td>
                            <td>{CERTIFICATE_TYPE_LABELS[r.certificateType] || r.certificateType?.replace(/_/g, ' ') || '—'}</td>
                            <td><StatusBadge status={r.status} /></td>
                            <td>{formatDate(r.requestedAt)}</td>
                            <td>
                                <span className="stuck-days">{r.daysPending} days</span>
                            </td>
                            <td>
                                <button
                                    className="stuck-review-btn"
                                    onClick={() => navigate(`/admin/dashboard?tab=requests`)}
                                    title="Open request review"
                                >
                                    Review →
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
