import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './PipelineFunnel.css';

const PIPELINE_COLORS = {
    pending: '#6d72ea',
    approved: '#8c57e8',
    processing: '#f59e0b',
    completed: '#34d399',
    failed_gens: '#fb7185',
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const entry = payload[0];
    return (
        <div className="funnel-tooltip">
            <div className="funnel-tooltip-label">{label}</div>
            <div className="funnel-tooltip-value">{entry.value} requests</div>
        </div>
    );
};

export default function PipelineFunnel({ data }) {
    if (!data) {
        return <div className="chart-empty">No data for this period</div>;
    }

    const { stages } = data;

    if (!stages || stages.length === 0) {
        return <div className="chart-empty">No pipeline data found</div>;
    }

    const chartData = stages.map((s) => ({
        stage: s.label,
        label: s.label,
        count: s.count,
    }));

    return (
        <div className="pipeline-wrapper">
            <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 50)}>
                <BarChart data={chartData} layout="horizontal" margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                    <YAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="var(--accent)">
                        {chartData.map((_, index) => {
                            const stage = stages[index]?.stage || '';
                            return <Cell key={`cell-${index}`} fill={PIPELINE_COLORS[stage] || '#8276f1'} />;
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
