import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function DomainChart({ data, loading, error, onRetry }) {
  if (loading) {
    return <div className="analytics-chart-card analytics-skeleton analytics-chart-skeleton" />;
  }

  if (error) {
    return <div className="analytics-chart-card analytics-error-card"><span>{error}</span><button type="button" onClick={onRetry}>Retry</button></div>;
  }

  const labels = data?.labels || [];
  const series = data?.series || [];
  if (!labels.length) {
    return <div className="analytics-chart-card empty-state">No data for this period</div>;
  }

  const chartData = labels.map((label, index) => ({ label, value: series[index] || 0 }));

  return (
    <div className="analytics-chart-card">
      <div className="analytics-widget-header">
        <h3>Interns by domain</h3>
      </div>
      <div className="analytics-chart-wrap">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
            <XAxis dataKey="label" stroke="var(--muted)" />
            <YAxis allowDecimals={false} stroke="var(--muted)" />
            <Tooltip />
            <Bar dataKey="value" fill="#34d399" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
