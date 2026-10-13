import StatusBadge from '../../../shared/components/StatusBadge.jsx';
import './TeamLeaderTable.css';

const SORT_CONFIG = {
    fullName: { label: 'Name', sortable: true },
    requestsReviewed: { label: 'Requests Reviewed', sortable: true },
    pendingReviews: { label: 'Pending Reviews', sortable: true },
    avgReviewTime: { label: 'Avg Review (days)', sortable: true },
    rejectionRate: { label: 'Rejection %', sortable: true },
};

export default function TeamLeaderTable({ data, onSort, sortKey, sortDir }) {
    if (!data) {
        return <div className="chart-empty">No data for this period</div>;
    }

    const { teamLeaders } = data;

    if (!teamLeaders || teamLeaders.length === 0) {
        return <div className="chart-empty">No team leaders found</div>;
    }

    const sortedLeaders = [...teamLeaders].sort((a, b) => {
        const aVal = a[sortKey] || 0;
        const bVal = b[sortKey] || 0;
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    return (
        <div className="tl-table-wrapper">
            <table className="tl-performance-table">
                <thead>
                    <tr>
                        {Object.entries(SORT_CONFIG).map(([key, config]) => (
                            <th key={key} onClick={() => config.sortable && onSort(key)}>
                                <button
                                    className={`tl-sort-btn ${sortKey === key ? `active ${sortDir}` : ''}`}
                                    disabled={!config.sortable}
                                >
                                    {config.label}
                                    {config.sortable && sortKey === key && (
                                        <span className="tl-sort-indicator">{sortDir === 'asc' ? '▲' : '▼'}</span>
                                    )}
                                </button>
                            </th>
                        ))}
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedLeaders.map((tl) => {
                        const initials = (tl.fullName || 'TL')
                            .split(' ')
                            .map((p) => p[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2);

                        return (
                            <tr key={tl.tlId || tl._id} className={tl.overdue ? 'overdue-row' : ''}>
                                <td>
                                    <div className="tl-cell-name">
                                        <span className="tl-avatar" style={{ background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))' }}>
                                            {initials}
                                        </span>
                                        {tl.fullName || 'Unknown'}
                                    </div>
                                </td>
                                <td>{tl.requestsReviewed || 0}</td>
                                <td className={tl.pendingReviews > 0 ? 'has-pending' : ''}>{tl.pendingReviews || 0}</td>
                                <td>{tl.avgReviewTime || 0}</td>
                                <td>{tl.rejectionRate || 0}%</td>
                                <td>
                                    <StatusBadge status={tl.overdue ? 'overdue' : 'on_track'} />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
