import mongoose from "mongoose";
import Notification from "../models/Notification.model.js";

/**
 * GET /api/notifications?unread=true&page=1
 * List notifications for the authenticated user
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { unread, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = { userId };
    if (String(unread).toLowerCase() === "true") {
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
  } catch (error) {
    console.error("[notification.controller] getNotifications error:", error);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

/**
 * GET /api/notifications/unread-count
 * Returns the unread notification count for badge display
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    return res.status(200).json({ unreadCount });
  } catch (error) {
    console.error("[notification.controller] getUnreadCount error:", error);
    return res.status(500).json({ message: "Failed to fetch unread count" });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark one notification as read
 * Returns 404 if notification not found or belongs to another user
 */
export const markNotificationRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // A user can never read or mark another user's notification -> 404
    const notification = await Notification.findOne({ _id: id, userId });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return res.status(200).json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("[notification.controller] markNotificationRead error:", error);
    return res.status(500).json({ message: "Failed to mark notification as read" });
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all unread notifications for current user as read
 */
export const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return res.status(200).json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount || 0,
    });
  } catch (error) {
    console.error("[notification.controller] markAllNotificationsRead error:", error);
    return res.status(500).json({ message: "Failed to mark all notifications as read" });
  }
};
