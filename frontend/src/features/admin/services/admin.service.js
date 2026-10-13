import axios from 'axios';

const adminApi = axios.create({
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

// Intern Management API
export const getAllInterns = (params = {}) => {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
  const qs = query.toString() ? `?${query.toString()}` : '';
  return request('get', `/api/admin/interns${qs}`);
};
export const getInternById = (id) => request('get', `/api/admin/interns/${id}`);
export const updateIntern = (id, payload) => request('patch', `/api/admin/interns/${id}`, payload);
export const assignInternTeamLeader = (id, teamLeaderId) => request('patch', `/api/admin/interns/${id}/assignment`, { teamLeaderId });

// Team Leader Management API
export const getAllTeamLeaders = (params = {}) => {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
  const qs = query.toString() ? `?${query.toString()}` : '';
  return request('get', `/api/admin/teamleaders${qs}`);
};
export const getTeamLeaderById = (id) => request('get', `/api/admin/teamleaders/${id}`);
export const updateTeamLeader = (id, payload) => request('patch', `/api/admin/teamleaders/${id}`, payload);
export const getInternsByTeamLeader = (id) => request('get', `/api/admin/teamleaders/${id}/interns`);
export const getForwardedRequests = () => request('get', '/api/admin/forwarded-requests');
export const finalizeRequest = (id, action, rejectionReason) => request(
  'patch',
  `/api/admin/requests/${id}/finalize`,
  action === 'reject' ? { action, rejectionReason } : { action }
);
export const getCertificateDraft = (id) => request('get', `/api/admin/certificates/${id}`);
export const updateCertificateDraft = (id, htmlContent) => request('patch', `/api/admin/certificates/${id}`, { htmlContent });
export const finalizeCertificate = (id) => request('post', `/api/admin/certificates/${id}/finalize`);

// Day 5 Admin Overview & Retry Generation
export const getAllCertificates = () => request('get', '/api/admin/certificates');
export const retryCertificateGeneration = (id) => request('post', `/api/admin/requests/${id}/retry-generation`);
export const downloadAdminCertificate = async (id, fileName) => {
  const response = await adminApi.get(`/api/admin/certificates/${id}/download`, {
    responseType: 'blob'
  });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName || 'certificate.pdf');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// Task B Template Management & Visual Editor API
export const getPlaceholders = () => request('get', '/api/admin/templates/placeholders');
export const getAllTemplates = (params = {}) => {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
  const qs = query.toString() ? `?${query.toString()}` : '';
  return request('get', `/api/admin/templates${qs}`);
};
export const getTemplateByType = (certificateType) => request('get', `/api/admin/templates/by-type/${certificateType}`);
export const getTemplateById = (id) => request('get', `/api/admin/templates/${id}`);
export const createTemplate = (payload) => request('post', '/api/admin/templates', payload);
export const updateTemplate = (id, payload) => request('patch', `/api/admin/templates/${id}`, payload);
export const activateTemplate = (id) => request('patch', `/api/admin/templates/${id}/activate`);

// Task C Retention Policy & Intern Lifecycle API
export const getRetentionPolicy = () => request('get', '/api/admin/retention-policy');
export const updateRetentionPolicy = (payload) => request('patch', '/api/admin/retention-policy', payload);
export const getArchivedInterns = () => request('get', '/api/admin/interns/archived');
export const restoreArchivedIntern = (id) => request('patch', `/api/admin/interns/${id}/restore`);
