import axios from 'axios';

const backendUrl = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin)).replace(/\/+$/, '');

const publicApi = axios.create({
  baseURL: `${backendUrl}/api/public`,
  withCredentials: false,
});

export const verifyCertificate = async (certificateNumber) =>
  (await publicApi.get(`/verify/${encodeURIComponent(certificateNumber)}`)).data;
