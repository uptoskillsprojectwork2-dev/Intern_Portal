import axios from 'axios';

const adminApi = axios.create({
  baseURL: 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

const request = async (method, url, payload) => {
  try {
    const response = await adminApi({
      method,
      url,
      data: payload,
    });

    return response.data;
  } catch (error) {
    const data = error.response?.data;
    const validationMessage = data?.errors
      ?.map(({ msg }) => msg)
      .join(' ');

    throw new Error(
      validationMessage ||
        data?.message ||
        (error.response?.status === 500
          ? 'Internal server error.'
          : 'Request failed.'),
      { cause: error }
    );
  }
};


// =========================
// Intern / Team Leader
// =========================

export const createIntern = (payload) =>
  request('post', '/api/admin/create-intern', payload);

export const createTeamLeader = (payload) =>
  request('post', '/api/admin/create-tl', payload);

export const getAllTeamLeaders = () =>
  request('get', '/api/admin/teamleaders');

export const getInternsByTeamLeader = (id) =>
  request('get', `/api/admin/teamleaders/${id}/interns`);


// =========================
// Certificate Requests
// =========================

export const getForwardedRequests = () =>
  request('get', '/api/admin/forwarded-requests');

export const finalizeRequest = (
  id,
  action,
  rejectionReason
) =>
  request(
    'patch',
    `/api/admin/requests/${id}/finalize`,
    action === 'reject'
      ? { action, rejectionReason }
      : { action }
  );


// =========================
// Certificate Templates
// =========================

export const createTemplate = (payload) =>
  request('post', '/api/admin/templates', payload);

export const getAllTemplates = () =>
  request('get', '/api/admin/templates');

export const updateTemplate = (id, payload) =>
  request('patch', `/api/admin/templates/${id}`, payload);

export const toggleTemplateActive = (id) =>
  request('patch', `/api/admin/templates/${id}/toggle`);


// =========================
// Certificate Draft
// =========================

// Day 2: manual draft generation
export const generateCertificateDraft = (requestId) =>
  request(
    'post',
    `/api/admin/certificates/draft/${requestId}`
  );

// Day 3: fetch existing draft
export const getCertificateDraft = (id) =>
  request(
    'get',
    `/api/admin/certificates/${id}`
  );

// Day 3: update existing draft HTML
export const updateCertificateDraft = (id, htmlContent) =>
  request(
    'patch',
    `/api/admin/certificates/${id}`,
    { htmlContent }
  );


// =========================
// Day 4: Finalize Certificate
// =========================

export const finalizeCertificate = (id) =>
  request(
    'post',
    `/api/admin/certificates/${id}/finalize`
  );


// =========================
// Day 5: Certificate Oversight
// =========================

// Get all certificates for Admin audit/overview
export const getAllCertificates = () =>
  request(
    'get',
    '/api/admin/certificates'
  );

// Retry generation for an approved request
// that currently has no certificate.
export const retryGeneration = (id) =>
  request(
    'post',
    `/api/admin/requests/${id}/retry-generation`
  );