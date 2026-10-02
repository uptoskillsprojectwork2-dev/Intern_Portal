const formatDays = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '?';
  return `${Number(value).toFixed(1)} days`;
};

const formatPct = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '?';
  return `${Number(value).toFixed(1)}%`;
};

export default function AnalyticsKpiCards({ overview, loading, onRetry }) {
  if (loading) {
    return (
      <div className="analytics-kpis">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="analytics-skeleton analytics-kpi-card" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'Total Interns', value: overview.totalInterns ?? 0 },
    { label: 'Active Interns', value: overview.activeInterns ?? 0 },
    { label: 'Pending Requests', value: overview.pendingRequests ?? 0 },
    { label: 'Certificates Issued', value: overview.certificatesIssuedThisMonth ?? 0 },
    { label: 'Avg. Turnaround', value: formatDays(overview.averageTurnaround) },
    { label: 'Upcoming Interns', value: overview.upcomingInterns ?? 0 },
    { label: 'Completed Interns', value: overview.completedInterns ?? 0 },
    { label: 'Approval Rate', value: formatPct(overview.approvalRate) },
    { label: 'Rejection Rate', value: formatPct(overview.rejectionRate) },
  ];

  return (
    <div className="analytics-kpis">
      {cards.map((card) => (
        <div key={card.label} className="analytics-kpi-card">
          <div className="analytics-kpi-header">
            <span>{card.label}</span>
          </div>
          <strong>{card.value}</strong>
        </div>
      ))}
      {onRetry && <button type="button" className="analytics-inline-button" onClick={onRetry}>Retry</button>}
    </div>
  );
}
