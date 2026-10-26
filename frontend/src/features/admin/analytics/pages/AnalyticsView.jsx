import { useEffect, useState } from 'react';
import { useAdminAnalytics } from '../hooks/useAdminAnalytics';
import AnalyticsControls from '../components/AnalyticsControls';
import AnalyticsKPICards from '../components/AnalyticsKPICards';
import AnalyticsCharts from '../components/AnalyticsCharts';
import AnalyticsTables from '../components/AnalyticsTables';
import AnalyticsTurnaround from '../components/AnalyticsTurnaround';
import Toast from '../../../../shared/components/Toast';
import { getAllTeamLeaders } from '../../services/admin.service';
import { fetchDomains } from '../services/analytics.service';
import './AnalyticsView.css';

function periodBounds(period, groupBy) {
  if (!period) return null;
  if (groupBy === 'day') return { from: period, to: period };
  if (groupBy === 'week') {
    const [year, week] = period.split('-W').map(Number);
    const start = new Date(Date.UTC(year, 0, 4));
    const mondayOffset = (start.getUTCDay() || 7) - 1;
    start.setUTCDate(start.getUTCDate() - mondayOffset + (week - 1) * 7);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
  }
  const [year, month] = period.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

export default function AnalyticsView({ onOpenRequests }) {
  const {
    range,
    setRange,
    from,
    setFrom,
    to,
    setTo,
    domain,
    setDomain,
    teamLeader,
    setTeamLeader,
    groupBy,
    setGroupBy,
    lastUpdated,
    widgets,
    loading,
    errors,
    fetchSingleWidget,
    refetchAll,
    handleExport,
    toastMessage,
    clearToast
  } = useAdminAnalytics();

  const [teamLeadersList, setTeamLeadersList] = useState(null);
  const [allDomainsList, setAllDomainsList] = useState(null);
  const [filterOptionsError, setFilterOptionsError] = useState('');
  const [filterOptionsRetry, setFilterOptionsRetry] = useState(0);
  const filtersLoading = teamLeadersList === null || allDomainsList === null;

  useEffect(() => {
    let active = true;
    Promise.allSettled([getAllTeamLeaders(), fetchDomains({ range: 'all' })]).then(([leadersResult, domainsResult]) => {
      if (!active) return;
      const failures = [];
      if (leadersResult.status === 'fulfilled') setTeamLeadersList(leadersResult.value.teamLeaders || []);
      else { setTeamLeadersList([]); failures.push('Team leaders could not be loaded.'); }
      if (domainsResult.status === 'fulfilled') setAllDomainsList(domainsResult.value.data?.domains || []);
      else { setAllDomainsList([]); failures.push('Domains could not be loaded.'); }
      setFilterOptionsError(failures.join(' '));
    });
    return () => { active = false; };
  }, [filterOptionsRetry]);

  const domainsList = allDomainsList || [];
  const dateError = range === 'custom' && (!from || !to)
    ? 'Choose both a start and end date.'
    : range === 'custom' && from > to
      ? 'Start date must be on or before end date.'
      : '';
  const changeRange = (value) => {
    if (value === 'custom' && (!from || !to)) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const monthAgo = new Date(today);
      monthAgo.setUTCDate(monthAgo.getUTCDate() - 30);
      setFrom(monthAgo.toISOString().slice(0, 10));
      setTo(today.toISOString().slice(0, 10));
    }
    setRange(value);
  };
  const openRequestDrilldown = (extra = {}) => {
    const drilldown = { ...extra };
    const filters = {
      range: range === 'custom' && from && to ? 'custom' : (range === 'custom' ? '6m' : range),
      domain,
      teamLeaderId: teamLeader,
      groupBy
    };
    if (range === 'custom' && from && to) {
      filters.from = from;
      filters.to = to;
    }
    if (drilldown.period) {
      Object.assign(filters, periodBounds(drilldown.period, groupBy), { range: 'custom' });
      delete filters.groupBy;
      delete drilldown.period;
    }
    onOpenRequests?.({ ...filters, ...drilldown });
  };

  return (
    <div className="analytics-view-shell">
      {toastMessage && (
        <Toast
          type={toastMessage.type}
          message={toastMessage.message}
          onClose={clearToast}
        />
      )}

      {/* Controls Bar */}
      <AnalyticsControls
        range={range}
        setRange={changeRange}
        from={from}
        setFrom={setFrom}
        to={to}
        setTo={setTo}
        domain={domain}
        setDomain={setDomain}
        teamLeader={teamLeader}
        setTeamLeader={setTeamLeader}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        lastUpdated={lastUpdated}
        onRefresh={refetchAll}
        onExport={handleExport}
        onClearFilters={() => {
          setRange('6m');
          setFrom('');
          setTo('');
          setDomain('');
          setTeamLeader('');
          setGroupBy('month');
        }}
        dateError={dateError}
        filtersLoading={filtersLoading}
        filterOptionsError={filterOptionsError}
        onRetryFilterOptions={() => {
          setFilterOptionsError('');
          setTeamLeadersList(null);
          setAllDomainsList(null);
          setFilterOptionsRetry((value) => value + 1);
        }}
        domainsList={domainsList}
        teamLeadersList={teamLeadersList || []}
      />

      {/* Top Row: KPI Cards */}
      <AnalyticsKPICards
        overviewData={widgets.overview}
        loading={loading.overview}
        error={errors.overview}
        onRetry={() => fetchSingleWidget('overview')}
      />

      <AnalyticsTurnaround
        data={widgets.turnaround}
        loading={loading.turnaround}
        error={errors.turnaround}
        onRetry={() => fetchSingleWidget('turnaround')}
        onExport={handleExport}
      />

      {/* Middle: Recharts Visualization Widgets */}
      <AnalyticsCharts
        trendData={widgets.trend}
        typesData={widgets.types}
        domainsData={widgets.domains}
        pipelineData={widgets.pipeline}
        teamLeadersData={widgets.teamLeaders}
        loadingMap={loading}
        errorMap={errors}
        onRetry={fetchSingleWidget}
        onExport={handleExport}
        onOpenRequests={openRequestDrilldown}
        onSelectDomain={setDomain}
        onSelectTeamLeader={setTeamLeader}
      />

      {/* Bottom: Performance Tables & Action Lists */}
      <AnalyticsTables
        teamLeadersData={widgets.teamLeaders}
        stuckData={widgets.stuck}
        upcomingData={widgets.upcoming}
        loadingMap={loading}
        errorMap={errors}
        onRetry={fetchSingleWidget}
        onExport={handleExport}
        onOpenRequests={openRequestDrilldown}
      />
    </div>
  );
}
