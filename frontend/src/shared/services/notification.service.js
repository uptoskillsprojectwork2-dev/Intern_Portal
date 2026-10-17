import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const notificationApi = axios.create({
  baseURL: `${API_BASE}/api/notifications`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

notificationApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Fetch paginated notifications for current authenticated user
 */
export const getNotifications = async ({ unread = false, page = 1, limit = 20 } = {}) => {
  const response = await notificationApi.get('', {
    params: { unread, page, limit },
  });
  return response.data;
};

/**
 * Fetch unread count for bell badge
 */
export const getUnreadCount = async () => {
  const response = await notificationApi.get('/unread-count');
  return response.data;
};

/**
 * Mark a single notification as read
 */
export const markNotificationRead = async (id) => {
  const response = await notificationApi.patch(`/${id}/read`);
  return response.data;
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsRead = async () => {
  const response = await notificationApi.patch('/read-all');
  return response.data;
};

export default {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};
