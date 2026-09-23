import { useEffect, useState, useCallback } from 'react';
import { getTLNotifications, markNotificationRead } from '../services/tl.service';
import './TLNotificationsAlert.css';

const TLNotificationsAlert = ({ onNavigateToInterns }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await getTLNotifications();
      const list = data?.notifications || [];
      // Only keep unread notifications
      setNotifications(list.filter((n) => !n.isRead));
    } catch (err) {
      console.error('Failed to fetch TL notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchAlerts, 0);
    const interval = setInterval(fetchAlerts, 60000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchAlerts]);

  const handleMarkAsRead = async (id) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (loading && notifications.length === 0) {
    return null;
  }

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="tl-alerts-container" aria-label="Internship Completion Alerts">
      <div className="tl-alerts-header">
        <div className="tl-alerts-title-row">
          <span className="tl-alerts-icon" role="img" aria-label="alert">⚠️</span>
          <h3>Internship Completion Alerts ({notifications.length})</h3>
        </div>
        <span className="tl-alerts-badge-top">Action Needed</span>
      </div>

      <div className="tl-alerts-list">
        {notifications.map((notif) => {
          const meta = notif.metadata || {};
          const isEndingSoon = meta.daysRemaining === 3 || notif.title?.includes('3 Days');
          const formattedEndDate = meta.endDate
            ? new Date(meta.endDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : null;

          return (
            <div key={notif._id} className="tl-alert-card">
              <div className="tl-alert-card-left">
                <div className="tl-alert-tags">
                  <span className="tl-tag-urgent">
                    {isEndingSoon ? 'Ending in 3 days' : 'Internship Alert'}
                  </span>
                  {meta.domain && <span className="tl-tag-domain">{meta.domain}</span>}
                </div>
                <h4 className="tl-alert-intern-name">
                  {meta.fullName || notif.title}
                </h4>
                <p className="tl-alert-message">{notif.message}</p>
                <div className="tl-alert-intern-details">
                  {meta.internCode && (
                    <span>
                      <strong>Code:</strong> {meta.internCode}
                    </span>
                  )}
                  {meta.email && (
                    <span>
                      <strong>Email:</strong> {meta.email}
                    </span>
                  )}
                  {formattedEndDate && (
                    <span>
                      <strong>End Date:</strong> {formattedEndDate}
                    </span>
                  )}
                </div>
              </div>

              <div className="tl-alert-card-actions">
                {onNavigateToInterns && (
                  <button
                    type="button"
                    className="tl-alert-btn-view"
                    onClick={onNavigateToInterns}
                  >
                    View Team
                  </button>
                )}
                <button
                  type="button"
                  className="tl-alert-btn-read"
                  disabled={actionLoading[notif._id]}
                  onClick={() => handleMarkAsRead(notif._id)}
                >
                  {actionLoading[notif._id] ? 'Updating...' : 'Mark as Read'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TLNotificationsAlert;
