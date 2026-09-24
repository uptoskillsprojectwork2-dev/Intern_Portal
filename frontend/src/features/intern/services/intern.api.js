import axios from 'axios';

const internApi = axios.create({
  baseURL: 'http://localhost:3000/api/intern',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export const getProfile = async () => {
  const response = await internApi.get('/profile');
  return response.data;
};

export const submitCertificateRequest = async (data) => {
  const response = await internApi.post('/request-certificate', data);
  return response.data;
};

export const getMyRequests = async () => {
  const response = await internApi.get('/requests');
  return response.data;
};

export const getCertificateForRequest = async (id) => {
  const response = await internApi.get(`/requests/${id}/certificate`);
  return response.data;
};

export const downloadCertificatePdf = async (id, fileName) => {
  const response = await internApi.get(`/requests/${id}/certificate/download`, {
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