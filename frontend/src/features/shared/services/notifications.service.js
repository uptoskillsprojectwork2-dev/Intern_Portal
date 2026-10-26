import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/notifications',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export const getNotifications = async () => (await api.get('/')).data;
export const getUnreadNotificationCount = async () => (await api.get('/unread-count')).data;
export const markNotificationRead = async (id) => (await api.patch(`/${id}/read`)).data;
export const markAllNotificationsRead = async () => (await api.patch('/read-all')).data;
