import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notification.service';

/**
 * Custom hook to manage in-app notifications, polling, unread counts, and toasts.
 */
export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Track if this is the initial unread-count fetch so we don't toast on initial page load
  const isInitialFetch = useRef(true);
  const prevUnreadCountRef = useRef(0);
  const pollingTimerRef = useRef(null);

  // 1. Fetch unread count (and trigger toast if count increased)
  const fetchCount = useCallback(async () => {
    try {
      const data = await getUnreadCount();
      const count = typeof data?.unreadCount === 'number' ? data.unreadCount : 0;

      if (!isInitialFetch.current && count > prevUnreadCountRef.current) {
        const diff = count - prevUnreadCountRef.current;
        setToastMessage(
          diff === 1
            ? 'You have 1 new notification'
            : `You have ${diff} new notifications`
        );
      }

      isInitialFetch.current = false;
      prevUnreadCountRef.current = count;
      setUnreadCount(count);
    } catch (err) {
      // Background poll silently logs failure without breaking UI
      console.warn('[useNotifications] Failed to poll unread count:', err.message);
    }
  }, []);

  // 2. Fetch full notifications list (for dropdown)
  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNotifications({ page: 1, limit: 20 });
      setNotifications(data?.notifications || []);
      if (typeof data?.unreadCount === 'number') {
        prevUnreadCountRef.current = data.unreadCount;
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.error('[useNotifications] Failed to fetch notifications list:', err);
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. Mark single notification as read
  const markAsRead = useCallback(async (id) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((item) =>
        item._id === id || item.id === id
          ? { ...item, isRead: true, readAt: new Date().toISOString() }
          : item
      )
    );
    setUnreadCount((prev) => {
      const next = Math.max(0, prev - 1);
      prevUnreadCountRef.current = next;
      return next;
    });

    try {
      await markNotificationRead(id);
    } catch (err) {
      console.error('[useNotifications] Failed to mark notification as read:', err);
      // Refresh count from server on failure
      fetchCount();
    }
  }, [fetchCount]);

  // 4. Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        isRead: true,
        readAt: new Date().toISOString(),
      }))
    );
    setUnreadCount(0);
    prevUnreadCountRef.current = 0;

    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.error('[useNotifications] Failed to mark all notifications as read:', err);
      fetchCount();
    }
  }, [fetchCount]);

  // 5. Polling setup: every 30 seconds, paused when browser tab is hidden
  useEffect(() => {
    const startPolling = () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = setInterval(() => {
        fetchCount();
      }, 30000); // 30 seconds
    };

    const stopPolling = () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Tab became visible again: immediately fetch latest count and restart timer
        fetchCount();
        startPolling();
      }
    };

    // Initial count fetch on mount
    fetchCount();
    startPolling();

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchCount]);

  // 6. When dropdown opens, load notification list
  useEffect(() => {
    if (isOpen) {
      fetchList();
    }
  }, [isOpen, fetchList]);

  // 7. Auto-dismiss toast message after 5 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  const clearToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  return {
    unreadCount,
    badgeText: unreadCount > 9 ? '9+' : String(unreadCount),
    notifications,
    loading,
    error,
    isOpen,
    toastMessage,
    toggleDropdown,
    closeDropdown,
    markAsRead,
    markAllAsRead,
    refreshNotifications: fetchList,
    refreshCount: fetchCount,
    clearToast,
  };
}

export default useNotifications;
