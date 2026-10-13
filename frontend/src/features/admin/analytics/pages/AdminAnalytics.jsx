import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { exportAnalyticsCsv } from '../services/analyticsApi.js';
import { useAdminAnalytics } from '../hooks/useAdminAnalytics.js';
import Toast from '../../../../shared/components/Toast.jsx';import AnalyticsControls from '../components/AnalyticsControls.jsx';
import KpiCards from '../components/KpiCards.jsx';
import ChartWidget from '../components/ChartWidget.jsx';
import RequestsTrendChart from '../components/RequestsTrendChart.jsx';
import CertificateTypesChart from '../components/CertificateTypesChart.jsx';
import DomainsBarChart from '../components/DomainsBarChart.jsx';
import PipelineFunnel from '../components/PipelineFunnel.jsx';
import TeamLeaderChart from '../components/TeamLeaderChart.jsx';
import TeamLeaderTable from '../components/TeamLeaderTable.jsx';
import StuckRequestsList from '../components/StuckRequestsList.jsx';
import UpcomingCompletionsTable from '../components/UpcomingCompletionsTable.jsx';
import './AdminAnalytics.css';

export default function AdminAnalytics() {
    const navigate = useNavigate();
    const [params, setParams] = useState({ range: '30d', groupBy: 'month' });
    const [lastUpdated, setLastUpdated] = useState(null);
    const [toast, setToast] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'pendingReviews', dir: 'desc' });

    const {
        overview,
        requestsTrend,
        certificateTypes,
        turnaround,
        teamLeaders,
        domains,
        pipeline,
        upcomingCompletions,
        loading,
        refetchAll,
    } = useAdminAnalytics(params);

    const handleRefresh = useCallback(async () => {
        await refetchAll();
        setLastUpdated(new Date());
    }, [refetchAll]);

    const handleExport = async (type) => {
        try {
            await exportAnalyticsCsv(type, params);
            setToast({ type: 'success', message: `Exported ${type} analytics successfully` });
        } catch (err) {
            setToast({ type: 'error', message: err.message || 'Export failed' });
        } finally {
            setTimeout(() => setToast(null), 5000);
        }
    };

    const handleSort = useCallback((key) => {
        setSortConfig((prev) => ({
            key,
            dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc',
        }));
    }, []);

    return (
        <div className="analytics-shell">
            <div className="analytics-container">
                <div className="analytics-page-header">
                    <div>
                        <p className="admin-eyebrow">ANALYTICS DASHBOARD</p>
                        <h1>Team Performance &amp; Request Analytics</h1>                        <p>Track intern counts, certificate issuance speed, bottlenecks, and team leader performance.</p>
                    </div>
                    <button className="analytics-back-btn" onClick={() => navigate('/admin/dashboard')}>
                        ← Back to Dashboard
                    </button>
                </div>

                {toast && (
                    <div className="analytics-toast">
                        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
                    </div>
                )}

                <AnalyticsControls
                    params={params}
                    onChange={setParams}
                    onExport={handleExport}
                    onRefresh={handleRefresh}
                    lastUpdated={lastUpdated}
                    loading={loading}
                />

                <section className="analytics-kpi-row" aria-label="Overview KPIs">
                    <KpiCards overview={overview.data?.overview} loading={overview.loading} />
                </section>

                <div className="analytics-charts-grid">
                    <ChartWidget
                        title="Requests Over Time"
                        subtitle="Certificate requests by status and date"
                        loading={requestsTrend.loading}
                        error={requestsTrend.error}
                        onRetry={requestsTrend.refetch}
                    >
                        <RequestsTrendChart data={requestsTrend.data} />
                    </ChartWidget>

                    <ChartWidget
                        title="Certificate Types"
                        subtitle="Certificates issued by type"
                        loading={certificateTypes.loading}
                        error={certificateTypes.error}
                        onRetry={certificateTypes.refetch}
                    >
                        <CertificateTypesChart data={certificateTypes.data} />
                    </ChartWidget>

                    <ChartWidget
                        title="Interns per Domain"
                        subtitle="Active interns distributed across domains"
                        loading={domains.loading}
                        error={domains.error}
                        onRetry={domains.refetch}
                    >
                        <DomainsBarChart data={domains.data} />
                    </ChartWidget>
                </div>

                <div className="analytics-charts-grid">
                    <ChartWidget
                        title="Request Pipeline"
                        subtitle="Where requests are at in the workflow"
                        loading={pipeline.loading}
                        error={pipeline.error}
                        onRetry={pipeline.refetch}
                    >
                        <PipelineFunnel data={pipeline.data} />
                    </ChartWidget>

                    <ChartWidget
                        title="Turnaround Time"
                        subtitle="Average processing times (in days)"
                        loading={turnaround.loading}
                        error={turnaround.error}
                        onRetry={turnaround.refetch}
                    >
                        {turnaround.data && (
                            <div className="turnaround-metrics">
                                <div className="turnaround-card">
                                    <h4>TL Review</h4>
                                    <div className="turnaround-stat">
                                        <span className="stat-value">{turnaround.data.tlReviewTime.average}</span>
                                        <span className="stat-label">avg days</span>
                                    </div>
                                    <div className="turnaround-substats">
                                        <span>Median: {turnaround.data.tlReviewTime.median}</span>
                                        <span>P90: {turnaround.data.tlReviewTime.p90}</span>
                                    </div>
                                </div>
                                <div className="turnaround-card">
                                    <h4>Admin Review</h4>
                                    <div className="turnaround-stat">
                                        <span className="stat-value">{turnaround.data.adminReviewTime.average}</span>
                                        <span className="stat-label">avg days</span>
                                    </div>
                                    <div className="turnaround-substats">
                                        <span>Median: {turnaround.data.adminReviewTime.median}</span>
                                        <span>P90: {turnaround.data.adminReviewTime.p90}</span>
                                    </div>
                                </div>
                                <div className="turnaround-card">
                                    <h4>Total Time</h4>
                                    <div className="turnaround-stat">
                                        <span className="stat-value">{turnaround.data.totalTime.average}</span>
                                        <span className="stat-label">avg days</span>
                                    </div>
                                    <div className="turnaround-substats">
                                        <span>Median: {turnaround.data.totalTime.median}</span>
                                        <span>P90: {turnaround.data.totalTime.p90}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </ChartWidget>

                    <ChartWidget
                        title="Review Time per Team Leader"
                        subtitle="Average days to review requests"
                        loading={teamLeaders.loading}
                        error={teamLeaders.error}
                        onRetry={teamLeaders.refetch}
                    >
                        <TeamLeaderChart data={teamLeaders.data} />
                    </ChartWidget>
                </div>

                <div className="analytics-tables-section">
                    <ChartWidget
                        title="Team Leader Performance"
                        subtitle="Sortable performance metrics with overdue alerts"
                        loading={teamLeaders.loading}
                        error={teamLeaders.error}
                        onRetry={teamLeaders.refetch}
                    >
                        <TeamLeaderTable
                            data={teamLeaders.data}
                            sortKey={sortConfig.key}
                            sortDir={sortConfig.dir}
                            onSort={handleSort}
                        />
                    </ChartWidget>

                    <ChartWidget
                        title="Stuck Requests"
                        subtitle="Requests pending longer than 3 days"
                        loading={teamLeaders.loading}
                        error={teamLeaders.error}
                        onRetry={teamLeaders.refetch}
                    >
                        <StuckRequestsList data={teamLeaders.data} />
                    </ChartWidget>

                    <ChartWidget
                        title="Upcoming Completions"
                        subtitle="Interns ending in the next 30 days"
                        loading={upcomingCompletions.loading}
                        error={upcomingCompletions.error}
                        onRetry={upcomingCompletions.refetch}
                    >
                        <UpcomingCompletionsTable data={upcomingCompletions.data} />
                    </ChartWidget>
                </div>
            </div>
        </div>
    );
}
