import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function RequestsTrendChart({ data, loading, error, onRetry }) {
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

  const chartData = labels.map((label, index) => {
    const row = { label };
    series.forEach((item) => {
      row[item.name] = item.data?.[index] ?? 0;
    });
    return row;
  });

  return (
    <div className="analytics-chart-card">
      <div className="analytics-widget-header">
        <h3>Requests over time</h3>
      </div>
      <div className="analytics-chart-wrap">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="pendingGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#6d72ea" stopOpacity={0.7} />
                <stop offset="95%" stopColor="#6d72ea" stopOpacity={0.08} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
            <XAxis dataKey="label" stroke="var(--muted)" />
            <YAxis allowDecimals={false} stroke="var(--muted)" />
            <Tooltip />
            {series.map((entry) => (
              <Area key={entry.name} type="monotone" dataKey={entry.name} stackId="1" stroke="#6d72ea" fill="url(#pendingGradient)" />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
