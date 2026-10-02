import {
  getAdminAnalyticsCertificateTypes,
  getAdminAnalyticsDomains,
  getAdminAnalyticsOverview,
  getAdminAnalyticsPipeline,
  getAdminAnalyticsRequestsTrend,
  getAdminAnalyticsStuckRequests,
  getAdminAnalyticsTeamLeaders,
  getAdminAnalyticsTurnaround,
  getAdminAnalyticsUpcomingCompletions,
  exportAdminAnalytics,
} from '../../services/admin.service';

export const fetchAnalyticsBatch = async (params = {}) => {
  const [overview, requestsTrend, certificateTypes, turnaround, teamLeaders, domains, pipeline, upcoming, stuck] = await Promise.all([
    getAdminAnalyticsOverview(params),
    getAdminAnalyticsRequestsTrend(params),
    getAdminAnalyticsCertificateTypes(params),
    getAdminAnalyticsTurnaround(params),
    getAdminAnalyticsTeamLeaders(params),
    getAdminAnalyticsDomains(params),
    getAdminAnalyticsPipeline(params),
    getAdminAnalyticsUpcomingCompletions(params),
    getAdminAnalyticsStuckRequests(params),
  ]);

  return {
    overview,
    requestsTrend,
    certificateTypes,
    turnaround,
    teamLeaders,
    domains,
    pipeline,
    upcoming,
    stuck,
  };
};

export const downloadAnalyticsExport = async (type, params = {}, format = 'xlsx') => {
  const response = await exportAdminAnalytics({ ...params, type, format });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: response.headers['content-type'] }));
  const link = document.createElement('a');
  const disposition = response.headers['content-disposition'] || '';
  const parts = disposition.split('filename=');
  const fileName = parts[1] ? parts[1].replace(/"/g, '') : `${type}-export.${format === 'csv' ? 'csv' : 'xlsx'}`;

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
