import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useNotifications from '../hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';
import Toast from './Toast';
import './NotificationBell.css';

/**
 * Shared NotificationBell component for Admin, Team Leader, and Intern dashboards.
 *
 * @param {Object} props
 * @param {'intern'|'teamleader'|'admin'} [props.role='intern'] - Current user's portal role
 * @param {function} [props.onNavigate] - Callback invoked when a notification is clicked to switch active view/tab
 */
export default function NotificationBell({ role = 'intern', onNavigate }) {
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const bellBtnRef = useRef(null);
  const {
    unreadCount,
    badgeText,
    notifications,
    loading,
    error,
    isOpen,
    toastMessage,
    toggleDropdown,
    closeDropdown,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    clearToast,
  } = useNotifications();

  const handleDropdownClose = (shouldFocusBell = false) => {
    closeDropdown();
    if (shouldFocusBell && bellBtnRef.current) {
      bellBtnRef.current.focus();
    }
  };

  // Handle outside click when dropdown is open
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        handleDropdownClose(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen, closeDropdown]);

  /**
   * Navigate by role when a notification is clicked:
   * - Intern -> My Requests (activeNav 'certificates')
   * - TL -> Pending Review (activeView 'requests')
   * - Admin -> Forwarded Requests (activeView 'requests')
   */
  const handleNotificationClick = (notification) => {
    if (role === 'intern') {
      if (onNavigate) {
        onNavigate('certificates', notification);
      } else {
        navigate('/intern/dashboard');
      }
    } else if (role === 'teamleader') {
      if (onNavigate) {
        onNavigate('requests', notification);
      } else {
        navigate('/teamleader/dashboard');
      }
    } else if (role === 'admin') {
      if (onNavigate) {
        onNavigate('requests', notification);
      } else {
        navigate('/admin/dashboard');
      }
    }
  };

  return (
    <div className="notif-bell-wrapper" ref={wrapperRef}>
      <button
        ref={bellBtnRef}
        type="button"
        id="notification-bell-btn"
        className={`notif-bell-btn ${isOpen ? 'is-active' : ''}`}
        onClick={toggleDropdown}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
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
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {unreadCount > 0 && (
          <span
            id="notification-unread-badge"
            className="notif-badge"
            aria-hidden="true"
          >
            {badgeText}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          loading={loading}
          error={error}
          onClose={handleDropdownClose}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onRefresh={refreshNotifications}
          onNotificationClick={handleNotificationClick}
        />
      )}

      {/* Floating Toast notification when unread count increases during tab session */}
      {toastMessage && (
        <div className="notif-toast-container">
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
