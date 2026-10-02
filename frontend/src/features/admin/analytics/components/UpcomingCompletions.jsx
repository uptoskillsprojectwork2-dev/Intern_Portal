const formatDate = (date) => {
  if (!date) return '?';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function UpcomingCompletions({ data, loading, error, onRetry }) {
  if (loading) {
    return <div className="analytics-table-card analytics-skeleton analytics-table-skeleton" />;
  }

  if (error) {
    return <div className="analytics-table-card analytics-error-card"><span>{error}</span><button type="button" onClick={onRetry}>Retry</button></div>;
  }

  const rows = data?.items || [];

  if (!rows.length) {
    return <div className="analytics-table-card empty-state">No data for this period</div>;
  }

  return (
    <div className="analytics-table-card">
      <div className="analytics-widget-header">
        <h3>Upcoming completions</h3>
      </div>
      <div className="analytics-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Intern</th>
              <th>Domain</th>
              <th>Team leader</th>
              <th>End date</th>
              <th>Certificate request</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="analytics-table-row">
                <td>{item.name}</td>
                <td>{item.domain}</td>
                <td>{item.teamLeader}</td>
                <td>{formatDate(item.endDate)}</td>
                <td className={item.hasCertificateRequest ? 'status-positive' : 'status-warning'}>
                  {item.hasCertificateRequest ? item.certificateRequestStatus || 'Exists' : 'Missing'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
