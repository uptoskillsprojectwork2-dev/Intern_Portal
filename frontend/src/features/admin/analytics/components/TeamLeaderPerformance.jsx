import { useNavigate } from 'react-router-dom';

const formatDays = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '?';
  return `${Number(value).toFixed(1)}d`;
};

export default function TeamLeaderPerformance({ data, loading, error, onRetry }) {
  const navigate = useNavigate();

  if (loading) {
    return <div className="analytics-table-card analytics-skeleton analytics-table-skeleton" />;
  }

  if (error) {
    return <div className="analytics-table-card analytics-error-card"><span>{error}</span><button type="button" onClick={onRetry}>Retry</button></div>;
  }

  const rows = data || [];

  if (!rows.length) {
    return <div className="analytics-table-card empty-state">No data for this period</div>;
  }

  return (
    <div className="analytics-table-card">
      <div className="analytics-widget-header">
        <h3>Team leader performance</h3>
      </div>
      <div className="analytics-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Team leader</th>
              <th>Assigned</th>
              <th>Reviewed</th>
              <th>Pending</th>
              <th>Avg review</th>
              <th>Rejection</th>
              <th>Overdue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((leader) => (
              <tr key={leader.teamLeaderId} onClick={() => navigate('/admin/dashboard')} className="analytics-table-row">
                <td>
                  <strong>{leader.name}</strong>
                  <small>{leader.email}</small>
                </td>
                <td>{leader.internsAssigned ?? 0}</td>
                <td>{leader.requestsReviewed ?? 0}</td>
                <td>{leader.pendingReviews ?? 0}</td>
                <td>{formatDays(leader.averageReviewTime)}</td>
                <td>{Number(leader.rejectionRate ?? 0).toFixed(1)}%</td>
                <td>{leader.overdueRequests ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
