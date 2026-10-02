import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#6d72ea', '#8c57e8', '#34d399', '#fbbf24', '#fb7185', '#60a5fa', '#a78bfa'];

export default function CertificateTypesChart({ data, loading, error, onRetry }) {
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

  const pieData = labels.map((label, index) => ({ name: label, value: series[index] || 0 }));

  return (
    <div className="analytics-chart-card">
      <div className="analytics-widget-header">
        <h3>Certificate types</h3>
      </div>
      <div className="analytics-chart-wrap pie-wrap">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={pieData} innerRadius={45} outerRadius={80} dataKey="value" nameKey="name">
              {pieData.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="legend-list">
        {pieData.map((item, index) => (
          <div key={item.name} className="legend-item">
            <span className="legend-swatch" style={{ background: COLORS[index % COLORS.length] }} />
            <span>{item.name}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
