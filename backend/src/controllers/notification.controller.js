import mongoose from 'mongoose';
import Notification from '../models/Notification.js';

const PAGE_SIZE = 50;

export async function getNotifications(req, res) {
  try {
    const filter = { userId: req.user.id };
    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(PAGE_SIZE).lean(),
      Notification.countDocuments({ ...filter, isRead: false }),
    ]);
    return res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Notification fetch failed:', error.message);
    return res.status(500).json({ message: 'Unable to load notifications.' });
  }
}

export async function getUnreadNotificationCount(req, res) {
  try {
    const unreadCount = await Notification.countDocuments({ userId: req.user.id, isRead: false });
    return res.json({ unreadCount });
  } catch (error) {
    console.error('Unread notification count failed:', error.message);
    return res.status(500).json({ message: 'Unable to load unread notification count.' });
  }
}

export async function markNotificationAsRead(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid notification ID.' });
  }
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found.' });
    return res.json({ notification });
  } catch (error) {
    console.error('Mark notification read failed:', error.message);
    return res.status(500).json({ message: 'Unable to update notification.' });
  }
}

export async function markAllNotificationsAsRead(req, res) {
  try {
    const readAt = new Date();
    const result = await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { $set: { isRead: true, readAt } }
    );
    return res.json({ markedRead: result.modifiedCount, readAt });
  } catch (error) {
    console.error('Mark all notifications read failed:', error.message);
    return res.status(500).json({ message: 'Unable to update notifications.' });
  }
}
