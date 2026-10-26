import axios from 'axios';
import { installApiInterceptors } from '../../../shared/services/apiInterceptors';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin)).replace(/\/+$/, '');
const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true
});
installApiInterceptors(api);

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.append(key, val);
    }
  });
  const str = searchParams.toString();
  return str ? `?${str}` : '';
};

const request = async (url) => {
  try {
    const res = await api.get(url);
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Failed to fetch analytics data.';
    throw new Error(msg, { cause: err });
  }
};

export const fetchOverview = (params) =>
  request(`/api/admin/analytics/overview${buildQueryString(params)}`);

export const fetchTrend = (params) =>
  request(`/api/admin/analytics/requests-trend${buildQueryString(params)}`);

export const fetchTypes = (params) =>
  request(`/api/admin/analytics/certificate-types${buildQueryString(params)}`);

export const fetchTurnaround = (params) =>
  request(`/api/admin/analytics/turnaround${buildQueryString(params)}`);

export const fetchTeamLeaders = (params) =>
  request(`/api/admin/analytics/team-leaders${buildQueryString(params)}`);

export const fetchDomains = (params) =>
  request(`/api/admin/analytics/domains${buildQueryString(params)}`);

export const fetchPipeline = (params) =>
  request(`/api/admin/analytics/pipeline${buildQueryString(params)}`);

export const fetchUpcoming = (days = 30, params = {}) =>
  request(`/api/admin/analytics/upcoming-completions${buildQueryString({ ...params, days })}`);

export const fetchStuck = (days = 3, params = {}) =>
  request(`/api/admin/analytics/stuck${buildQueryString({ ...params, days })}`);

export const fetchAnalyticsRequests = (params = {}) =>
  request(`/api/admin/analytics/requests${buildQueryString(params)}`);

export const downloadAnalytics = async (type = 'overview', params = {}, format = 'csv') => {
  const qs = buildQueryString({ ...params, type, format });
  let response;
  try {
    response = await api.get(`/api/admin/analytics/export${qs}`, { responseType: 'blob' });
  } catch (error) {
    let message = error.response?.data?.message || error.message || 'Unable to export analytics.';
    if (error.response?.data instanceof Blob) {
      try {
        const payload = JSON.parse(await error.response.data.text());
        message = payload.message || message;
      } catch { /* Keep the Axios message when the response is not JSON. */ }
    }
    throw new Error(message, { cause: error });
  }
  const mimeType = format === 'xlsx'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'text/csv;charset=utf-8';
  const blob = new Blob([response.data], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `uptoskill_analytics_${type}_${new Date().toISOString().slice(0, 10)}.${format}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const downloadAnalyticsCSV = (type = 'overview', params = {}) => downloadAnalytics(type, params, 'csv');
