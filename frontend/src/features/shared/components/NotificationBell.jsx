import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import useNotifications from '../hooks/useNotifications';
import { getNotificationDestination } from '../utils/notificationDestination';
import './NotificationBell.css';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const previousUnreadCount = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, unreadCount, hasLoaded, error, refresh, markRead, markAllRead } = useNotifications();

  useEffect(() => {
    if (!hasLoaded) return;
    if (previousUnreadCount.current !== null && unreadCount > previousUnreadCount.current) {
      const added = unreadCount - previousUnreadCount.current;
      setToastMessage(`${added} new notification${added === 1 ? '' : 's'}`);
    }
    previousUnreadCount.current = unreadCount;
  }, [hasLoaded, unreadCount]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timeout = setTimeout(() => setToastMessage(''), 5000);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointerDown = (event) => {
      if (!popoverRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    popoverRef.current?.querySelector('button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const openNotification = async (notification) => {
    if (!notification.isRead) await markRead(notification._id);
    setOpen(false);
    navigate(getNotificationDestination(notification, user?.role));
  };

  return <div className="notification-bell">
    <button ref={triggerRef} className="notification-bell-trigger" type="button" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-haspopup="dialog" aria-controls="notification-popover" aria-expanded={open} onClick={() => { setOpen((value) => !value); if (!open) refresh(); }}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
      {unreadCount > 0 && <span className="notification-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
    {toastMessage && <div className="notification-toast" role="status" aria-live="polite"><span>{toastMessage}</span><button type="button" aria-label="Dismiss notification message" onClick={() => setToastMessage('')}>Dismiss</button></div>}
    {open && <section ref={popoverRef} id="notification-popover" className="notification-popover" role="dialog" aria-modal="false" aria-label="Notifications">
      <header><div><strong>Notifications</strong><small>{unreadCount} unread</small></div><div className="notification-popover-actions"><button type="button" onClick={refresh} aria-label="Refresh notifications">Refresh</button><button type="button" disabled={!unreadCount} onClick={markAllRead}>Mark all read</button></div></header>
      {error && <p className="notification-error" role="alert">{error}</p>}
      <div className="notification-list">
        {notifications.length ? notifications.map((notification) => <button className={`notification-item ${notification.isRead ? 'is-read' : 'is-unread'}`} type="button" key={notification._id} onClick={() => openNotification(notification)}>
          <span className="notification-item-dot" aria-hidden="true" />
          <span className="notification-item-content"><strong>{notification.title}</strong><span>{notification.message}</span><time dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString()}</time></span>
        </button>) : <p className="notification-empty">No notifications yet.</p>}
      </div>
    </section>}
  </div>;
}
