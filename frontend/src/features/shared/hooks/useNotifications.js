import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notifications.service';

const POLL_INTERVAL = 30_000;

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');
  const refreshInFlight = useRef(null);

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current;
    const request = Promise.all([getNotifications(), getUnreadNotificationCount()])
      .then(([list, count]) => {
        setNotifications(list.notifications || []);
        setUnreadCount(count.unreadCount || 0);
        setHasLoaded(true);
        setError('');
      })
      .catch((requestError) => {
        setError(requestError.response?.data?.message || 'Notifications are temporarily unavailable.');
      })
      .finally(() => {
        refreshInFlight.current = null;
      });
    refreshInFlight.current = request;
    return request;
  }, []);

  useEffect(() => {
    let timer;
    let active = true;
    let polling = false;
    const clearTimer = () => { if (timer) clearTimeout(timer); };
    const pollWhenVisible = async () => {
      clearTimer();
      if (!active || polling || document.visibilityState === 'hidden') return;
      polling = true;
      await refresh();
      polling = false;
      if (active && document.visibilityState !== 'hidden') {
        timer = setTimeout(pollWhenVisible, POLL_INTERVAL);
      }
    };
    const onVisibilityChange = () => {
      clearTimer();
      if (document.visibilityState !== 'hidden') pollWhenVisible();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    pollWhenVisible();
    return () => {
      active = false;
      clearTimer();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refresh]);

  const markRead = useCallback(async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((current) => current.map((item) => item._id === id ? { ...item, isRead: true } : item));
      setUnreadCount((current) => Math.max(0, current - 1));
      return true;
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update this notification.');
      return false;
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true, readAt })));
      setUnreadCount(0);
      setError('');
      return true;
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update notifications.');
      return false;
    }
  }, []);

  return { notifications, unreadCount, hasLoaded, error, refresh, markRead, markAllRead };
}
