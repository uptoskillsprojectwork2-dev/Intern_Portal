import { useNavigate } from 'react-router-dom';

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getTypeBadge(type) {
  switch (type) {
    case 'REQUEST_SUBMITTED':
      return { icon: '📥', label: 'Submitted', className: 'type-submitted' };
    case 'REQUEST_FORWARDED':
      return { icon: '↗️', label: 'Forwarded', className: 'type-forwarded' };
    case 'REQUEST_APPROVED':
      return { icon: '✓', label: 'Approved', className: 'type-approved' };
    case 'REQUEST_REJECTED':
      return { icon: '✕', label: 'Rejected', className: 'type-rejected' };
    case 'CERTIFICATE_SENT':
      return { icon: '📜', label: 'Certificate', className: 'type-cert' };
    case 'ARCHIVE_WARNING':
      return { icon: '⚠️', label: 'Warning', className: 'type-warning' };
    default:
      return { icon: 'ℹ', label: 'Notice', className: 'type-notice' };
  }
}

export default function NotificationDropdown({
  notifications,
  loading,
  error,
  onRetry,
  onMarkRead,
  onMarkAllRead,
  onClose,
  role = 'intern',
}) {
  const navigate = useNavigate();

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      onMarkRead(notification._id);
    }

    if (onClose) onClose();

    // Navigate by role: intern -> My Requests, TL -> Pending Review, Admin -> Forwarded Requests
    if (role === 'intern') {
      navigate('/intern/dashboard?view=certificates');
    } else if (role === 'teamleader') {
      navigate('/teamleader/dashboard?view=requests');
    } else if (role === 'admin') {
      navigate('/admin/dashboard?view=requests');
    }
  };

  return (
    <div
      className="notif-dropdown-menu"
      role="region"
      aria-label="Notifications list"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Dropdown Header */}
      <div className="notif-dropdown-header">
        <div className="notif-header-title">
          <strong>Notifications</strong>
        </div>
        <button
          type="button"
          className="notif-mark-all-btn"
          onClick={onMarkAllRead}
          title="Mark all notifications as read"
        >
          Mark all read
        </button>
      </div>

      {/* Body Content */}
      <div className="notif-dropdown-body">
        {loading && (
          <div className="notif-loading-state" role="status">
            <div className="notif-spinner" aria-hidden="true" />
            <span>Loading notifications…</span>
          </div>
        )}

        {!loading && error && (
          <div className="notif-error-state" role="alert">
            <span className="notif-error-icon">⚠️</span>
            <p>{error}</p>
            <button
              type="button"
              className="notif-retry-btn"
              onClick={onRetry}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && notifications.length === 0 && (
          <div className="notif-empty-state" role="status">
            <span className="notif-empty-icon" aria-hidden="true">🎉</span>
            <strong>You're all caught up</strong>
            <p>No new notifications right now.</p>
          </div>
        )}

        {!loading && !error && notifications.length > 0 && (
          <ul className="notif-list" role="list">
            {notifications.map((item) => {
              const badge = getTypeBadge(item.type);
              const isUnread = !item.isRead;

              return (
                <li
                  key={item._id}
                  className={`notif-item ${isUnread ? 'unread' : 'read'}`}
                  onClick={() => handleNotificationClick(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNotificationClick(item);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${isUnread ? 'Unread: ' : ''}${item.title}. ${item.message}`}
                >
                  <div className={`notif-type-icon ${badge.className}`} aria-hidden="true">
                    <span>{badge.icon}</span>
                  </div>

                  <div className="notif-content">
                    <div className="notif-title-row">
                      <strong className="notif-title">{item.title}</strong>
                      <span className="notif-time" title={item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}>
                        {timeAgo(item.createdAt)}
                      </span>
                    </div>

                    <p className="notif-message">{item.message}</p>
                  </div>

                  {isUnread && (
                    <span className="notif-unread-dot" title="Unread" aria-hidden="true" />
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
