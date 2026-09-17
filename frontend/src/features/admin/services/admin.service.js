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

// ================================
// Certificate Template APIs Day 1
// ================================

export const createTemplate = (payload) =>
  request(
    'post',
    '/api/admin/templates',
    payload
  );

export const getAllTemplates = () =>
  request(
    'get',
    '/api/admin/templates'
  );

export const updateTemplate = (id, payload) =>
  request(
    'patch',
    `/api/admin/templates/${id}`,
    payload
  );

export const toggleTemplateActive = (id) =>
  request(
    'patch',
    `/api/admin/templates/${id}/toggle`
  );

// ================================
// Certificate DRAFT 
// ================================

export const getCertificateDraft = (id) =>
  request('get', `/api/admin/certificates/${id}`);

export const getAllCertificates = () =>
  request("get", "/api/admin/certificates");

export const downloadCertificatePdf = async (id) => {
  const response = await adminApi.get(
    `/api/admin/certificates/${id}/download`,
    {
      responseType: "blob",
    }
  );

  return response;
};

export const updateCertificateDraft = (id, htmlContent) =>
  request('patch', `/api/admin/certificates/${id}`, {
    htmlContent,
  });

export const finalizeCertificate = (id) =>
  request('post', `/api/admin/certificates/${id}/finalize`);
  
export const retryCertificateGeneration = (id) =>
  request(
    'post',
    `/api/admin/requests/${id}/retry-generation`
  );