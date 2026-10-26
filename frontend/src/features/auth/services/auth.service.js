import axios from 'axios';
import { attachCentralInterceptor } from '../../../shared/services/axiosSetup';

const API_BASE_URL = 'http://localhost:3000';

const apiClient = attachCentralInterceptor(
  axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  })
);

export const login = async (email, password) => {
  const response = await apiClient.post('/api/auth/login', {
    email,
    password,
  });
  return response.data;
};

export const getMe = async () => {
  const response = await apiClient.get('/api/auth/get-me');
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await apiClient.post('/api/auth/forgot-password', {
    email,
  });
  return response.data;
};

export const resetPassword = async (token, newPassword) => {
  const response = await apiClient.post(`/api/auth/reset-password/${token}`, {
    newPassword,
  });
  return response.data;
};

