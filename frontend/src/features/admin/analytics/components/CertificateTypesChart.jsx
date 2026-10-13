import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import './CertificateTypesChart.css';

const COLORS = ['#6d72ea', '#8c57e8', '#34d399', '#fb7185', '#f59e0b', '#60a5fa', '#a78bfa', '#fbbf24'];

const getTypeLabel = (type) => {
    return type?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || 'Unknown';
};

const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const entry = payload[0];
    return (
        <div className="donut-tooltip">
            <div className="donut-tooltip-label">{getTypeLabel(entry.name)}</div>
            <div className="donut-tooltip-value">{entry.value} certificates</div>
        </div>
    );
};

const renderLabel = ({ name, percent }) => {
    if (!name || percent === 0) return '';
    return `${getTypeLabel(name)} (${(percent * 100).toFixed(0)}%)`;
};

export default function CertificateTypesChart({ data }) {
    if (!data) {
        return <div className="chart-empty">No data for this period</div>;
    }

    const { labels, series } = data;

    if (!labels || labels.length === 0) {
        return <div className="chart-empty">No certificates found for the selected period</div>;
    }

    const chartData = labels.map((label, i) => ({
        name: label,
        value: series[i],
    }));

    return (
        <div className="donut-wrapper">
            <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ color: 'var(--muted)', fontSize: 12, top: 10 }} />
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="48%"
                        innerRadius={70}
                        outerRadius={110}
                        dataKey="value"
                        nameKey="name"
                        label={renderLabel}
                        labelLine={false}
                    >
                        {chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
