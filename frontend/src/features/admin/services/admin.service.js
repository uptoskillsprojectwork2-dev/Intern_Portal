import axios from 'axios';

export const adminApi = axios.create({
  baseURL: 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

const request = async (method, url, payload) => {
  try {
    const response = await adminApi({ method, url, data: payload });
    return response.data;
  } catch (error) {
    const data = error.response?.data;
    const validationMessage = data?.errors?.map(({ msg }) => msg).join(' ');
    throw new Error(
      validationMessage || data?.message || (error.response?.status === 500 ? 'Internal server error.' : 'Request failed.'),
      { cause: error }
    );
  }
};

export const createIntern = (payload) => request('post', '/api/admin/create-intern', payload);
export const createTeamLeader = (payload) => request('post', '/api/admin/create-tl', payload);
export const getAllTeamLeaders = () => request('get', '/api/admin/teamleaders');
export const getInternsByTeamLeader = (id) => request('get', `/api/admin/teamleaders/${id}/interns`);
export const getForwardedRequests = () => request('get', '/api/admin/forwarded-requests');
export const finalizeRequest = (id, action, rejectionReason) => request(
  'patch',
  `/api/admin/requests/${id}/finalize`,
  action === 'reject' ? { action, rejectionReason } : { action }
);

const analyticsQuery = (params) => {
  const queryString = params ? new URLSearchParams(params).toString() : '';
  return queryString ? `?${queryString}` : '';
};

export const getAdminAnalyticsOverview = (params) => request('get', `/api/admin/analytics/overview${analyticsQuery(params)}`);
export const getAdminAnalyticsRequestsTrend = (params) => request('get', `/api/admin/analytics/requests-trend${analyticsQuery(params)}`);
export const getAdminAnalyticsCertificateTypes = (params) => request('get', `/api/admin/analytics/certificate-types${analyticsQuery(params)}`);
export const getAdminAnalyticsTurnaround = (params) => request('get', `/api/admin/analytics/turnaround${analyticsQuery(params)}`);
export const getAdminAnalyticsTeamLeaders = (params) => request('get', `/api/admin/analytics/team-leaders${analyticsQuery(params)}`);
export const getAdminAnalyticsDomains = (params) => request('get', `/api/admin/analytics/domains${analyticsQuery(params)}`);
export const getAdminAnalyticsPipeline = (params) => request('get', `/api/admin/analytics/pipeline${analyticsQuery(params)}`);
export const getAdminAnalyticsUpcomingCompletions = (params) => request('get', `/api/admin/analytics/upcoming-completions${analyticsQuery(params)}`);
export const getAdminAnalyticsStuckRequests = (params) => request('get', `/api/admin/analytics/stuck-requests${analyticsQuery(params)}`);
export const exportAdminAnalytics = (params) => adminApi.get(`/api/admin/analytics/export${analyticsQuery(params)}`, { responseType: 'blob' });