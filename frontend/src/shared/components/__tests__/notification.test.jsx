import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotificationBell from '../NotificationBell';
import NotificationDropdown from '../NotificationDropdown';
import * as notifService from '../../services/notification.service';

describe('Task E: Frontend Notification Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(notifService, 'getUnreadCount').mockResolvedValue({ unreadCount: 0 });
    vi.spyOn(notifService, 'getNotifications').mockResolvedValue({ notifications: [], unreadCount: 0 });
    vi.spyOn(notifService, 'markNotificationRead').mockResolvedValue({ message: 'Marked' });
    vi.spyOn(notifService, 'markAllNotificationsRead').mockResolvedValue({ modifiedCount: 1 });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /* --------------------------------------------------------------------------
     7. BADGE DISPLAY (0 -> hidden, 1..9 -> count, 10+ -> "9+")
     -------------------------------------------------------------------------- */
  describe('7. Badge rendering', () => {
    it('shows no badge when unreadCount is 0', async () => {
      notifService.getUnreadCount.mockResolvedValueOnce({ unreadCount: 0 });
      render(
        <MemoryRouter>
          <NotificationBell role="intern" />
        </MemoryRouter>
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      expect(document.getElementById('notification-unread-badge')).toBeNull();
    });

    it('shows exact count for 1 to 9', async () => {
      notifService.getUnreadCount.mockResolvedValueOnce({ unreadCount: 5 });
      render(
        <MemoryRouter>
          <NotificationBell role="intern" />
        </MemoryRouter>
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      const badge = document.getElementById('notification-unread-badge');
      expect(badge).not.toBeNull();
      expect(badge.textContent).toBe('5');
    });

    it('shows "9+" when count is 10 or greater', async () => {
      notifService.getUnreadCount.mockResolvedValueOnce({ unreadCount: 12 });
      render(
        <MemoryRouter>
          <NotificationBell role="intern" />
        </MemoryRouter>
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      const badge = document.getElementById('notification-unread-badge');
      expect(badge).not.toBeNull();
      expect(badge.textContent).toBe('9+');
    });
  });

  /* --------------------------------------------------------------------------
     8. POLLING & VISIBILITY CHANGE & 401 STOP
     -------------------------------------------------------------------------- */
  describe('8. Polling behavior', () => {
    it('polls unread count every 30 seconds', async () => {
      render(
        <MemoryRouter>
          <NotificationBell role="intern" />
        </MemoryRouter>
      );
      // Initial call on mount
      expect(notifService.getUnreadCount).toHaveBeenCalledTimes(1);

      // Advance by 30s
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });
      expect(notifService.getUnreadCount).toHaveBeenCalledTimes(2);

      // Advance by another 30s
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });
      expect(notifService.getUnreadCount).toHaveBeenCalledTimes(3);
    });

    it('pauses polling when tab is hidden and resumes when visible', async () => {
      render(
        <MemoryRouter>
          <NotificationBell role="intern" />
        </MemoryRouter>
      );
      expect(notifService.getUnreadCount).toHaveBeenCalledTimes(1);

      // Simulate tab hidden
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      // Advance 60s while hidden -> no new calls should happen
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60000);
      });
      expect(notifService.getUnreadCount).toHaveBeenCalledTimes(1);

      // Simulate tab visible again
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      // Immediate refresh on becoming visible
      expect(notifService.getUnreadCount).toHaveBeenCalledTimes(2);

      // Further 30s timer works
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });
      expect(notifService.getUnreadCount).toHaveBeenCalledTimes(3);
    });

    it('stops polling on 401 Unauthorized', async () => {
      const err401 = new Error('Unauthorized');
      err401.response = { status: 401 };
      notifService.getUnreadCount.mockRejectedValueOnce(err401);

      render(
        <MemoryRouter>
          <NotificationBell role="intern" />
        </MemoryRouter>
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      // Advance timer by 60s
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60000);
      });
      // Should not poll again after receiving 401
      expect(notifService.getUnreadCount).toHaveBeenCalledTimes(1);
    });
  });

  /* --------------------------------------------------------------------------
     9. TOAST NOTIFICATION ON INCREASE ONLY
     -------------------------------------------------------------------------- */
  describe('9. Toast on count increase only', () => {
    it('does not fire toast on initial load', async () => {
      notifService.getUnreadCount.mockResolvedValueOnce({ unreadCount: 3 });
      render(
        <MemoryRouter>
          <NotificationBell role="intern" />
        </MemoryRouter>
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      expect(screen.queryByText(/new notification/i)).toBeNull();
    });

    it('fires toast when count increases on subsequent poll', async () => {
      notifService.getUnreadCount
        .mockResolvedValueOnce({ unreadCount: 1 })
        .mockResolvedValueOnce({ unreadCount: 3 });

      render(
        <MemoryRouter>
          <NotificationBell role="intern" />
        </MemoryRouter>
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });
      expect(screen.queryByText(/new notification/i)).toBeNull();

      // Poll triggers with count increase (1 -> 3)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });

      expect(screen.getByText(/You have 2 new notifications/i)).toBeDefined();
    });

    it('does not fire toast when count decreases or stays same', async () => {
      notifService.getUnreadCount
        .mockResolvedValueOnce({ unreadCount: 5 })
        .mockResolvedValueOnce({ unreadCount: 5 })
        .mockResolvedValueOnce({ unreadCount: 2 });

      render(
        <MemoryRouter>
          <NotificationBell role="intern" />
        </MemoryRouter>
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });
      expect(screen.queryByText(/new notification/i)).toBeNull();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });
      expect(screen.queryByText(/new notification/i)).toBeNull();
    });
  });

  /* --------------------------------------------------------------------------
     10. INTERACTIONS, NAVIGATION, KEYBOARD & ESCAPE FOCUS
     -------------------------------------------------------------------------- */
  describe('10. Dropdown interactions & accessibility', () => {
    it('opens on click and displays notifications list', async () => {
      notifService.getNotifications.mockResolvedValueOnce({
        notifications: [
          {
            _id: 'n1',
            type: 'REQUEST_SUBMITTED',
            title: 'Request Received',
            message: 'Your bonafide request is processing',
            isRead: false,
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 1,
      });

      render(
        <MemoryRouter>
          <NotificationBell role="intern" />
        </MemoryRouter>
      );

      const bellBtn = document.getElementById('notification-bell-btn');
      await act(async () => {
        fireEvent.click(bellBtn);
        await vi.advanceTimersByTimeAsync(10);
      });

      expect(screen.getByText('Notifications')).toBeDefined();
      expect(screen.getByText('Request Received')).toBeDefined();
      expect(screen.getByText('Your bonafide request is processing')).toBeDefined();
    });

    it('clicking item marks read and calls onNavigate by role', async () => {
      const onNavigate = vi.fn();
      notifService.getNotifications.mockResolvedValueOnce({
        notifications: [
          {
            _id: 'n100',
            type: 'REQUEST_APPROVED',
            title: 'Approved!',
            message: 'Your certificate is ready',
            isRead: false,
          },
        ],
        unreadCount: 1,
      });

      render(
        <MemoryRouter>
          <NotificationBell role="intern" onNavigate={onNavigate} />
        </MemoryRouter>
      );

      const bellBtn = document.getElementById('notification-bell-btn');
      await act(async () => {
        fireEvent.click(bellBtn);
        await vi.advanceTimersByTimeAsync(10);
      });

      const item = screen.getByText('Approved!');
      await act(async () => {
        fireEvent.click(item);
      });

      expect(notifService.markNotificationRead).toHaveBeenCalledWith('n100');
      expect(onNavigate).toHaveBeenCalledWith('certificates', expect.anything());
    });

    it('Escape key closes dropdown and returns focus to bell button', async () => {
      notifService.getNotifications.mockResolvedValueOnce({
        notifications: [],
        unreadCount: 0,
      });

      render(
        <MemoryRouter>
          <NotificationBell role="intern" />
        </MemoryRouter>
      );

      const bellBtn = document.getElementById('notification-bell-btn');
      await act(async () => {
        fireEvent.click(bellBtn);
        await vi.advanceTimersByTimeAsync(10);
      });

      expect(screen.getByText("You're all caught up")).toBeDefined();

      // Press Escape
      await act(async () => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });

      expect(screen.queryByText("You're all caught up")).toBeNull();
      expect(document.activeElement).toBe(bellBtn);
    });

    it('outside click closes dropdown', async () => {
      render(
        <MemoryRouter>
          <div>
            <div data-testid="outside-area">Outside</div>
            <NotificationBell role="intern" />
          </div>
        </MemoryRouter>
      );

      const bellBtn = document.getElementById('notification-bell-btn');
      await act(async () => {
        fireEvent.click(bellBtn);
        await vi.advanceTimersByTimeAsync(10);
      });

      expect(screen.getByText("You're all caught up")).toBeDefined();

      // Click outside
      const outside = screen.getByTestId('outside-area');
      await act(async () => {
        fireEvent.pointerDown(outside);
      });

      expect(screen.queryByText("You're all caught up")).toBeNull();
    });

    it('renders empty, loading, and error states properly', async () => {
      const onRefresh = vi.fn();
      const onClose = vi.fn();

      // Empty state
      const { rerender } = render(
        <NotificationDropdown
          notifications={[]}
          unreadCount={0}
          loading={false}
          error={null}
          onClose={onClose}
        />
      );
      expect(screen.getByText("You're all caught up")).toBeDefined();

      // Loading state
      rerender(
        <NotificationDropdown
          notifications={[]}
          unreadCount={0}
          loading={true}
          error={null}
          onClose={onClose}
        />
      );
      expect(screen.getByText("Loading notifications…")).toBeDefined();

      // Error state with retry
      rerender(
        <NotificationDropdown
          notifications={[]}
          unreadCount={0}
          loading={false}
          error="Network Error"
          onClose={onClose}
          onRefresh={onRefresh}
        />
      );
      expect(screen.getByText("Network Error")).toBeDefined();
      const retryBtn = screen.getByText("Retry");
      fireEvent.click(retryBtn);
      expect(onRefresh).toHaveBeenCalled();
    });
  });
});
