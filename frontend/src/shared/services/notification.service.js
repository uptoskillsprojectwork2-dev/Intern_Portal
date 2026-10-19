import axios from 'axios';

const notificationApi = axios.create({
  baseURL: 'http://localhost:3000/api/notifications',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

/**
 * Fetch paginated notifications for current user.
 *
 * @param {Object} params
 * @param {boolean} [params.unread] - Filter to unread only
 * @param {number} [params.page=1] - Page number
 * @param {number} [params.limit=15] - Items per page
 */
export const getNotifications = async ({ unread, page = 1, limit = 15 } = {}) => {
  const params = { page: String(page), limit: String(limit) };
  if (unread) params.unread = 'true';

  const response = await notificationApi.get('/', { params });
  return response.data;
};

/**
 * Fetch number of unread notifications for bell badge.
 */
export const getUnreadCount = async () => {
  const response = await notificationApi.get('/unread-count');
  return response.data;
};

/**
 * Mark a single notification as read.
 *
 * @param {string} id - Notification ID
 */
export const markAsRead = async (id) => {
  const response = await notificationApi.patch(`/${id}/read`);
  return response.data;
};

/**
 * Mark all notifications as read for current user.
 */
export const markAllAsRead = async () => {
  const response = await notificationApi.patch('/read-all');
  return response.data;
};
