import mongoose from 'mongoose';
import Notification from '../models/Notification.model.js';

/**
 * GET /api/notifications?unread=true&page=1
 *
 * Lists notifications for the authenticated user (paginated, newest first).
 */
export const getNotifications = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const unreadOnly = req.query.unread === 'true';

    const filter = { userId: req.user.id };
    if (unreadOnly) {
      filter.isRead = false;
    }

    const [total, notifications, unreadCount] = await Promise.all([
      Notification.countDocuments(filter),
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId: req.user.id, isRead: false }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.status(200).json({
      notifications,
      page,
      totalPages,
      total,
      unreadCount,
    });
  } catch (err) {
    console.error('getNotifications error:', err);
    return res.status(500).json({ message: 'Failed to fetch notifications.' });
  }
};

/**
 * GET /api/notifications/unread-count
 *
 * Returns number of unread notifications for badge counter.
 */
export const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false,
    });

    return res.status(200).json({ unreadCount });
  } catch (err) {
    console.error('getUnreadCount error:', err);
    return res.status(500).json({ message: 'Failed to fetch unread count.' });
  }
};

/**
 * PATCH /api/notifications/:id/read
 *
 * Marks a single notification as read.
 * Returns 404 if it does not belong to the requesting user or does not exist.
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    return res.status(200).json({
      message: 'Notification marked as read.',
      notification,
    });
  } catch (err) {
    console.error('markAsRead error:', err);
    return res.status(500).json({ message: 'Failed to mark notification as read.' });
  }
};

/**
 * PATCH /api/notifications/read-all
 *
 * Marks all notifications for the authenticated user as read.
 */
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return res.status(200).json({
      message: 'All notifications marked as read.',
    });
  } catch (err) {
    console.error('markAllAsRead error:', err);
    return res.status(500).json({ message: 'Failed to mark all as read.' });
  }
};
