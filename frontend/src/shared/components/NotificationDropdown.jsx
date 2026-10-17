import { useEffect, useRef } from 'react';
import './NotificationBell.css';

/**
 * Format relative date time cleanly
 */
function formatNotificationTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Type icon based on notification event
 */
function getTypeIcon(type) {
  switch (type) {
    case 'REQUEST_SUBMITTED':
      return { icon: '📝', className: 'notif-badge-submitted' };
    case 'REQUEST_FORWARDED':
      return { icon: '↗️', className: 'notif-badge-forwarded' };
    case 'REQUEST_APPROVED':
      return { icon: '✅', className: 'notif-badge-approved' };
    case 'REQUEST_REJECTED':
      return { icon: '✕', className: 'notif-badge-rejected' };
    case 'CERTIFICATE_SENT':
      return { icon: '🎓', className: 'notif-badge-sent' };
    case 'ARCHIVE_WARNING':
      return { icon: '⚠️', className: 'notif-badge-warning' };
    default:
      return { icon: '🔔', className: 'notif-badge-default' };
  }
}

export default function NotificationDropdown({
  notifications = [],
  unreadCount = 0,
  loading = false,
  error = null,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onRefresh,
  onNotificationClick,
}) {
  const dropdownRef = useRef(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleItemClick = (notification) => {
    if (!notification.isRead) {
      onMarkAsRead(notification._id || notification.id);
    }
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    onClose();
  };

  return (
    <div
      ref={dropdownRef}
      className="notif-dropdown"
      role="dialog"
      aria-label="Notifications"
      aria-modal="true"
    >
      {/* ── Dropdown Header ── */}
      <div className="notif-header">
        <div className="notif-title-row">
          <h3 className="notif-title">Notifications</h3>
          {unreadCount > 0 && (
            <span className="notif-unread-pill">{unreadCount} unread</span>
          )}
        </div>
        <div className="notif-header-actions">
          {unreadCount > 0 && (
            <button
              type="button"
              className="notif-mark-all-btn"
              onClick={onMarkAllAsRead}
              title="Mark all notifications as read"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* ── Dropdown Body ── */}
      <div className="notif-body">
        {loading && (
          <div className="notif-state notif-loading-state" role="status">
            <div className="notif-spinner" aria-hidden="true" />
            <span>Loading notifications…</span>
          </div>
        )}

        {!loading && error && (
          <div className="notif-state notif-error-state" role="alert">
            <span className="notif-state-icon">⚠️</span>
            <p className="notif-error-msg">{error}</p>
            {onRefresh && (
              <button
                type="button"
                className="notif-retry-btn"
                onClick={onRefresh}
              >
                Retry
              </button>
            )}
          </div>
        )}

        {!loading && !error && notifications.length === 0 && (
          <div className="notif-state notif-empty-state">
            <span className="notif-state-icon">🎉</span>
            <strong className="notif-empty-title">You're all caught up</strong>
            <p className="notif-empty-desc">
              No new notifications right now. Any updates on requests or accounts will appear here.
            </p>
          </div>
        )}

        {!loading && !error && notifications.length > 0 && (
          <ul className="notif-list" role="list">
            {notifications.map((item) => {
              const { icon, className } = getTypeIcon(item.type);
              const isUnread = !item.isRead;
              const itemId = item._id || item.id;

              return (
                <li
                  key={itemId}
                  className={`notif-item ${isUnread ? 'is-unread' : 'is-read'}`}
                  onClick={() => handleItemClick(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleItemClick(item);
                    }
                  }}
                  aria-label={`${item.title}: ${item.message}`}
                >
                  <div className={`notif-type-icon ${className}`} aria-hidden="true">
                    {icon}
                  </div>

                  <div className="notif-content">
                    <div className="notif-item-top">
                      <h4 className="notif-item-title">{item.title}</h4>
                      <time className="notif-time" dateTime={item.createdAt}>
                        {formatNotificationTime(item.createdAt)}
                      </time>
                    </div>
                    <p className="notif-item-message">{item.message}</p>
                  </div>

                  {isUnread && (
                    <span
                      className="notif-unread-dot"
                      title="Unread"
                      aria-label="Unread"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
