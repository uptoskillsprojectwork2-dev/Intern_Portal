import './KpiCards.css';

const KPI_CARDS_CONFIG = [
    { key: 'totalInterns', label: 'Total Interns', icon: '👥', accent: 'var(--accent)' },
    { key: 'activeInterns', label: 'Active Interns', icon: '🔄', accent: 'var(--success)' },
    { key: 'pendingRequests', label: 'Pending Requests', icon: '⏳', accent: 'var(--accent-2)' },
    { key: 'certificatesIssuedThisMonth', label: 'Issued This Month', icon: '📜', accent: 'var(--accent)' },
    { key: 'approvalRate', label: 'Approval Rate', icon: '✅', accent: 'var(--success)', suffix: '%' },
    { key: 'totalTeamLeaders', label: 'Team Leaders', icon: '👔', accent: 'var(--accent-2)' },
];

const SkeletonCard = () => (
    <div className="kpi-card kpi-skeleton">
        <div className="kpi-skeleton-icon"></div>
        <div>
            <div className="kpi-skeleton-line"></div>
            <div className="kpi-skeleton-line short"></div>
        </div>
    </div>
);

const KpiCard = ({ label, value, icon, accent, suffix, loading, change }) => {
    if (loading) return <SkeletonCard />;

    return (
        <div className="kpi-card" style={{ '--kpi-accent': accent }}>
            <div className="kpi-card-icon" style={{ background: `color-mix(in srgb, ${accent} 15%, transparent)` }}>
                {icon}
            </div>
            <div className="kpi-card-body">
                <div className="kpi-card-label">{label}</div>
                <div className="kpi-card-value">
                    {value}
                    {suffix ? <span className="kpi-suffix">{suffix}</span> : null}
                </div>
                {change !== undefined && change !== null && (
                    <div className={`kpi-change ${change >= 0 ? 'positive' : 'negative'}`}>
                        {change >= 0 ? '▲' : '▼'} {Math.abs(change)}%
                    </div>
                )}
            </div>
        </div>
    );
};

export default function KpiCards({ overview, loading }) {
    if (loading || !overview) {
        return (
            <div className="kpi-grid">
                {KPI_CARDS_CONFIG.map((config) => (
                    <SkeletonCard key={config.key} />
                ))}
            </div>
        );
    }

    return (
        <div className="kpi-grid">
            {KPI_CARDS_CONFIG.map((config) => (
                <KpiCard
                    key={config.key}
                    label={config.label}
                    value={overview[config.key] || 0}
                    icon={config.icon}
                    accent={config.accent}
                    suffix={config.suffix}
                    change={overview[`${config.key}Change`]}
                />
            ))}
        </div>
    );
}

export { KpiCard, SkeletonCard };
