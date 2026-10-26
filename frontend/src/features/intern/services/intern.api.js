import axios from 'axios';
import { attachCentralInterceptor } from '../../../shared/services/axiosSetup';

const internApi = attachCentralInterceptor(
  axios.create({
    baseURL: 'http://localhost:3000/api/intern',
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
  })
);

export const getProfile = async () => {
  const response = await internApi.get('/profile');
  return response.data;
};

export const updateProfile = async (data) => {
  const response = await internApi.patch('/profile', data);
  return response.data;
};

export const setPassword = async (data) => {
  const response = await internApi.patch('/set-password', data);
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
  try {
    const response = await axios.get(`http://localhost:3000/api/certificates/${id}/download`, {
      withCredentials: true,
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
  } catch (err) {
    if (err.response?.data instanceof Blob && err.response.data.type?.includes('json')) {
      const text = await err.response.data.text();
      try {
        err.response.data = JSON.parse(text);
      } catch {
        // noop
      }
    }
    throw err;
  }
};