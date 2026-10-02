import AnalyticsExportButton from '../components/AnalyticsExportButton';
import AnalyticsFilters from '../components/AnalyticsFilters';
import AnalyticsKpiCards from '../components/AnalyticsKpiCards';
import CertificateTypesChart from '../components/CertificateTypesChart';
import DomainChart from '../components/DomainChart';
import PipelineChart from '../components/PipelineChart';
import RequestsTrendChart from '../components/RequestsTrendChart';
import StuckRequests from '../components/StuckRequests';
import TeamLeaderPerformance from '../components/TeamLeaderPerformance';
import UpcomingCompletions from '../components/UpcomingCompletions';
import useAdminAnalytics from '../hooks/useAdminAnalytics';
import '../styles/AdminAnalytics.css';

const defaultFilters = {
  range: '30d',
  from: '',
  to: '',
  domain: '',
  teamLeader: '',
  groupBy: 'day',
  overdueDays: '3',
};

export default function AdminAnalytics() {
  const { data, loading, errors, refetch, filters, setFilters } = useAdminAnalytics(defaultFilters);

  const lastUpdated = new Date().toLocaleString();

  return (
    <section className="analytics-page-shell">
      <div className="analytics-page-header">
        <div>
          <p className="admin-eyebrow">Analytics</p>
          <h2>Admin Analytics</h2>
          <p>Monitor internship activity, certificate requests, turnaround time, and team leader performance.</p>
        </div>
        <div className="analytics-toolbar-right">
          <span>Last updated: {lastUpdated}</span>
          <AnalyticsExportButton filters={filters} type="overview" />
        </div>
      </div>

      <AnalyticsFilters filters={filters} onChange={setFilters} onRefresh={() => refetch()} />

      <AnalyticsKpiCards overview={data.overview} loading={loading.overview} onRetry={refetch} />

      <div className="analytics-grid analytics-grid-two">
        <RequestsTrendChart data={data.requestsTrend} loading={loading.requestsTrend} error={errors.requestsTrend} onRetry={refetch} />
        <CertificateTypesChart data={data.certificateTypes} loading={loading.certificateTypes} error={errors.certificateTypes} onRetry={refetch} />
      </div>

      <div className="analytics-grid analytics-grid-two">
        <DomainChart data={data.domains} loading={loading.domains} error={errors.domains} onRetry={refetch} />
        <PipelineChart data={data.pipeline} loading={loading.pipeline} error={errors.pipeline} onRetry={refetch} />
      </div>

      <div className="analytics-grid analytics-grid-full">
        <TeamLeaderPerformance data={data.teamLeaders} loading={loading.teamLeaders} error={errors.teamLeaders} onRetry={refetch} />
      </div>

      <div className="analytics-grid analytics-grid-two">
        <StuckRequests data={data.stuck} loading={loading.stuck} error={errors.stuck} onRetry={refetch} />
        <UpcomingCompletions data={data.upcoming} loading={loading.upcoming} error={errors.upcoming} onRetry={refetch} />
      </div>
    </section>
  );
}
