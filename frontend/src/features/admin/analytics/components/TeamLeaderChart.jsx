import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './TeamLeaderChart.css';

const COLORS = ['#6d72ea', '#8c57e8', '#34d399', '#fb7185', '#f59e0b', '#60a5fa', '#a78bfa', '#fbbf24'];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const entry = payload[0];
    return (
        <div className="tl-tooltip">
            <div className="tl-tooltip-label">{label}</div>
            <div className="tl-tooltip-value">{entry.value} days avg</div>
        </div>
    );
};

export default function TeamLeaderChart({ data }) {
    if (!data) {
        return <div className="chart-empty">No data for this period</div>;
    }

    const { teamLeaders } = data;

    if (!teamLeaders || teamLeaders.length === 0) {
        return <div className="chart-empty">No team leader data found for the selected period</div>;
    }

    const chartData = teamLeaders
        .filter((tl) => (tl.avgReviewTime || 0) > 0)
        .map((tl) => ({
            name: tl.fullName || 'Unknown',
            avgTime: tl.avgReviewTime,
            pending: tl.pendingReviews,
        }))
        .sort((a, b) => b.avgTime - a.avgTime);

    if (chartData.length === 0) {
        return <div className="chart-empty">No review times recorded for the selected period</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--muted)', fontSize: 12 }}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgTime" name="Avg Review Time" radius={[6, 6, 0, 0]} fill="var(--accent)">
                    {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
