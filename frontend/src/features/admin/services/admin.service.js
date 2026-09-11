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
export const getAllTeamLeaders = () => request('get', '/api/admin/teamleaders');
export const getInternsByTeamLeader = (id) => request('get', `/api/admin/teamleaders/${id}/interns`);
export const getForwardedRequests = () => request('get', '/api/admin/forwarded-requests');
export const finalizeRequest = (id, action, rejectionReason) => request(
  'patch',
  `/api/admin/requests/${id}/finalize`,
  action === 'reject' ? { action, rejectionReason } : { action }
);

export const getCertificateDraft = (id) => request('get', `/api/admin/certificates/draft/${id}`);
export const updateCertificateDraft = (id, htmlContent) => request('patch', `/api/admin/certificates/draft/${id}`, { htmlContent });
export const finalizeCertificate = (id) => request('post', `/api/admin/certificates/${id}/finalize`);
export const getAllCertificates = () => request('get', '/api/admin/certificates');
export const retryCertificateGeneration = (id) => request('post', `/api/admin/requests/${id}/retry-generation`);
export const downloadAdminCertificatePdf = async (id, filename = 'certificate.pdf') => {
  const response = await adminApi.get(`/api/admin/certificates/${id}/download`, {
    responseType: 'blob'
  });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};