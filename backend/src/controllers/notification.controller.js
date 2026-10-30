import mongoose from 'mongoose';
import Notification from '../models/Notification.js';

const PAGE_SIZE = 50;

/**
 * GET /api/notifications
 * List notifications for the authenticated user
 */
export async function getNotifications(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const hasPaginationOrFilter = Boolean(req.query?.unread || req.query?.page || req.query?.limit);

    if (hasPaginationOrFilter) {
      const { unread, page = 1, limit = 20 } = req.query;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const filter = { userId };
      if (String(unread).toLowerCase() === 'true') {
        filter.isRead = false;
      }

      const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Notification.countDocuments(filter),
        Notification.countDocuments({ userId, isRead: false }),
      ]);

      return res.status(200).json({
        notifications,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum) || 1,
        unreadCount,
      });
    }

    const filter = { userId };
    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(PAGE_SIZE).lean(),
      Notification.countDocuments({ ...filter, isRead: false }),
    ]);

    return res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    console.error('[notification.controller] getNotifications error:', error.message);
    return res.status(500).json({ message: 'Unable to load notifications.' });
  }
}

/**
 * GET /api/notifications/unread-count
 * Returns unread notification count
 */
export async function getUnreadCount(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const unreadCount = await Notification.countDocuments({ userId, isRead: false });
    return res.status(200).json({ unreadCount });
  } catch (error) {
    console.error('[notification.controller] getUnreadCount error:', error.message);
    return res.status(500).json({ message: 'Unable to load unread notification count.' });
  }
}

export const getUnreadNotificationCount = getUnreadCount;

/**
 * PATCH /api/notifications/:id/read
 * Mark one notification as read
 */
export async function markNotificationRead(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid notification ID.' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.status(200).json({
      message: 'Notification marked as read',
      notification,
    });
  } catch (error) {
    console.error('[notification.controller] markNotificationRead error:', error.message);
    return res.status(500).json({ message: 'Failed to mark notification as read' });
  }
}

export const markNotificationAsRead = markNotificationRead;

/**
 * PATCH /api/notifications/read-all
 * Mark all unread notifications for current user as read
 */
export async function markAllNotificationsRead(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const readAt = new Date();
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true, readAt } }
    );

    const body = {
      markedRead: result.modifiedCount || 0,
      readAt,
    };

    Object.defineProperty(body, 'modifiedCount', {
      value: result.modifiedCount || 0,
      enumerable: false,
    });
    Object.defineProperty(body, 'message', {
      value: 'All notifications marked as read',
      enumerable: false,
    });

    return res.status(200).json(body);
  } catch (error) {
    console.error('[notification.controller] markAllNotificationsRead error:', error.message);
    return res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
}

export const markAllNotificationsAsRead = markAllNotificationsRead;
