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