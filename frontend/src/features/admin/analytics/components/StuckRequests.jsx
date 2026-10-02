import { useNavigate } from 'react-router-dom';

const formatDate = (date) => {
  if (!date) return '?';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function StuckRequests({ data, loading, error, onRetry }) {
  const navigate = useNavigate();

  if (loading) {
    return <div className="analytics-table-card analytics-skeleton analytics-table-skeleton" />;
  }

  if (error) {
    return <div className="analytics-table-card analytics-error-card"><span>{error}</span><button type="button" onClick={onRetry}>Retry</button></div>;
  }

  const rows = data?.requests || [];

  if (!rows.length) {
    return <div className="analytics-table-card empty-state">No data for this period</div>;
  }

  return (
    <div className="analytics-table-card">
      <div className="analytics-widget-header">
        <h3>Stuck requests</h3>
      </div>
      <div className="analytics-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Request</th>
              <th>Intern</th>
              <th>Type</th>
              <th>Status</th>
              <th>Requested</th>
              <th>Waiting</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.requestId} onClick={() => navigate(`/admin/certificate-review/${item.requestId}`)} className="analytics-table-row">
                <td>
                  <strong>{item.requestNumber}</strong>
                  <small>{item.requestId}</small>
                </td>
                <td>{item.internName}</td>
                <td>{item.certificateType}</td>
                <td>{item.currentStatus}</td>
                <td>{formatDate(item.requestedDate)}</td>
                <td>{item.daysWaiting} days</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
