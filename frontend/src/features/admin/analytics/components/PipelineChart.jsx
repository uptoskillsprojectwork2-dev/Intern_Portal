import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const COLORS = ['#6d72ea', '#8c57e8', '#34d399', '#fbbf24', '#fb7185', '#a78bfa'];

export default function PipelineChart({ data, loading, error, onRetry }) {
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
        <h3>Request pipeline</h3>
      </div>
      <div className="analytics-chart-wrap">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart layout="vertical" data={chartData}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
            <XAxis type="number" allowDecimals={false} stroke="var(--muted)" />
            <YAxis dataKey="label" type="category" width={120} stroke="var(--muted)" />
            <Tooltip />
            <Bar dataKey="value" radius={[0, 10, 10, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
