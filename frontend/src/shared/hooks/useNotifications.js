import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../services/notification.service.js';

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const prevCountRef = useRef(null);
  const intervalRef = useRef(null);

  /**
   * Fetch unread badge count and fire toast if count increased.
   */
  const checkUnreadCount = useCallback(async (isInitial = false) => {
    try {
      const data = await getUnreadCount();
      const count = typeof data?.unreadCount === 'number' ? data.unreadCount : 0;

      // Toast when unread count increases (after initial mount check)
      if (!isInitial && prevCountRef.current !== null && count > prevCountRef.current) {
        const diff = count - prevCountRef.current;
        setToastMessage(
          diff === 1
            ? 'You have 1 new notification.'
            : `You have ${diff} new notifications.`
        );
      }

      prevCountRef.current = count;
      setUnreadCount(count);
    } catch {
      // Background poll silently fails to not disrupt UI
    }
  }, []);

  /**
   * Fetch list of notifications (for dropdown).
   */
  const loadNotifications = useCallback(async (unreadOnly = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNotifications({ unread: unreadOnly, page: 1, limit: 20 });
      setNotifications(data?.notifications || []);
      if (typeof data?.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
        prevCountRef.current = data.unreadCount;
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Mark a single notification read.
   */
  const markOneAsRead = useCallback(async (id) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true, readAt: new Date() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    if (prevCountRef.current !== null) {
      prevCountRef.current = Math.max(0, prevCountRef.current - 1);
    }

    try {
      await markAsRead(id);
    } catch (err) {
      console.error('Failed to mark notification read:', err);
      // Re-fetch to sync
      checkUnreadCount();
    }
  }, [checkUnreadCount]);

  /**
   * Mark all notifications read.
   */
  const markAllAsReadAction = useCallback(async () => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
    );
    setUnreadCount(0);
    prevCountRef.current = 0;

    try {
      await markAllAsRead();
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
      // Re-fetch to sync
      checkUnreadCount();
    }
  }, [checkUnreadCount]);

  /**
   * Set up polling every 30 seconds with document.visibilityState pausing.
   */
  useEffect(() => {
    // Initial fetch
    checkUnreadCount(true);

    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') {
          checkUnreadCount();
        }
      }, 30000); // 30 seconds
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Immediate check when tab becomes visible, then resume timer
        checkUnreadCount();
        startPolling();
      } else {
        stopPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkUnreadCount]);

  return {
    unreadCount,
    notifications,
    loading,
    error,
    toastMessage,
    clearToast: () => setToastMessage(null),
    loadNotifications,
    markOneAsRead,
    markAllAsRead: markAllAsReadAction,
    refreshUnreadCount: checkUnreadCount,
  };
}
