import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';
import Toast from './Toast';
import './NotificationBell.css';

/**
 * Shared Notification Bell Component.
 *
 * @param {Object} props
 * @param {'intern'|'teamleader'|'admin'} [props.role='intern'] - User role for navigation target
 */
export default function NotificationBell({ role = 'intern' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const {
    unreadCount,
    notifications,
    loading,
    error,
    toastMessage,
    clearToast,
    loadNotifications,
    markOneAsRead,
    markAllAsRead,
  } = useNotifications();

  // Format badge count: show "9+" if count > 9
  const badgeText = unreadCount > 9 ? '9+' : unreadCount > 0 ? String(unreadCount) : null;

  const toggleDropdown = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      loadNotifications();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Close on click outside or Escape key
  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleDocumentClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="notif-bell-container" ref={containerRef}>
      <button
        type="button"
        className={`notif-bell-btn ${isOpen ? 'active' : ''}`}
        onClick={toggleDropdown}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        title="Notifications"
      >
        {/* Modern bell SVG */}
        <svg
          className="notif-bell-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {badgeText && (
          <span className="notif-badge" aria-hidden="true">
            {badgeText}
          </span>
        )}
      </button>

      {/* Dropdown popup */}
      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          loading={loading}
          error={error}
          onRetry={() => loadNotifications()}
          onMarkRead={markOneAsRead}
          onMarkAllRead={markAllAsRead}
          onClose={handleClose}
          role={role}
        />
      )}

      {/* Toast Alert on unread count increase */}
      {toastMessage && (
        <div className="notif-toast-wrapper">
          <Toast
            type="info"
            message={toastMessage}
            onClose={clearToast}
          />
        </div>
      )}
    </div>
  );
}
