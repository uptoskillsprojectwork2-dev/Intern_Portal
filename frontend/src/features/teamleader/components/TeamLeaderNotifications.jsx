import { useEffect, useState } from 'react';
import { getNotifications, markNotificationAsRead } from '../services/tl.service';
import './TeamLeaderNotifications.css';

const formatDate = (value) => new Date(value).toLocaleDateString('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export default function TeamLeaderNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      try {
        const data = await getNotifications();
        if (active) setNotifications(data.notifications || []);
      } catch (error) {
        console.error('Failed to fetch team leader notifications:', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadNotifications();
    return () => { active = false; };
  }, []);

  const handleRead = async (notification) => {
    if (notification.isRead) return;

    try {
      await markNotificationAsRead(notification._id);
      setNotifications((current) => current.map((item) => (
        item._id === notification._id
          ? { ...item, isRead: true, readAt: new Date().toISOString() }
          : item
      )));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return (
    <section className="tl-notifications-card" aria-labelledby="tl-notifications-title">
      <div className="tl-notifications-heading">
        <div>
          <p className="admin-eyebrow">ALERTS</p>
          <h2 id="tl-notifications-title">Notifications</h2>
          <p>Important updates about your interns appear here.</p>
        </div>
        <span className="tl-notifications-count">{unreadCount} unread</span>
      </div>

      {loading && <p className="tl-notifications-state">Loading notifications…</p>}

      {!loading && notifications.length === 0 && (
        <p className="tl-notifications-state">No notifications yet.</p>
      )}

      {!loading && notifications.length > 0 && (
        <div className="tl-notifications-list">
          {notifications.map((notification) => (
            <button
              type="button"
              className={`tl-notification-item ${notification.isRead ? 'read' : 'unread'}`}
              key={notification._id}
              onClick={() => handleRead(notification)}
            >
              <span className="tl-notification-dot" aria-hidden="true" />
              <span className="tl-notification-copy">
                <strong>{notification.title}</strong>
                <span>{notification.message}</span>
                <small>{formatDate(notification.createdAt)}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
