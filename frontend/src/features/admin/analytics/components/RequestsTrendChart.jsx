import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import './RequestsTrendChart.css';

const STATUS_COLORS = {
    pending: '#6d72ea',
    approved: '#8c57e8',
    processing: '#f59e0b',
    completed: '#34d399',
    rejected: '#fb7185',
    cancelled: '#a9acbe',
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
        <div className="trend-tooltip">
            <div className="trend-tooltip-label">{label}</div>
            {payload.map((entry) => (
                <div key={entry.name} className="trend-tooltip-row">
                    <span className="trend-tooltip-dot" style={{ color: STATUS_COLORS[entry.name] || entry.color }}>{'\u25CF'}</span>
                    <span>{entry.name}:</span>
                    <strong>{entry.value}</strong>
                </div>
            ))}
        </div>
    );
};

export default function RequestsTrendChart({ data }) {
    if (!data) {
        return <div className="chart-empty">No data for this period</div>;
    }

    const { labels, series } = data;

    if (!labels || labels.length === 0) {
        return <div className="chart-empty">No requests found for the selected period</div>;
    }

    const chartData = labels.map((label, i) => {
        const point = { period: label };
        series.forEach((s) => {
            point[s.status] = s.data[i] || 0;
        });
        return point;
    });

    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: 'var(--muted)', fontSize: 12 }} />
                {series.map((s) => (
                    <Area
                        key={s.status}
                        type="monotone"
                        dataKey={s.status}
                        stackId="1"
                        stroke={STATUS_COLORS[s.status] || '#8276f1'}
                        fill={STATUS_COLORS[s.status] || '#8276f1'}
                        fillOpacity={0.15}
                        strokeWidth={2}
                        dot={{ r: 3, fillOpacity: 1 }}
                        activeDot={{ r: 5 }}
                    />
                ))}
            </AreaChart>
        </ResponsiveContainer>
    );
}
