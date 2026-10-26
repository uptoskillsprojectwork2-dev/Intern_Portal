import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendEmail } from './sendEmail.js';

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

export async function createNotification({ userId, title, message, type = 'general', email = true }) {
  if (!userId || !title || !message) {
    return null;
  }
  if (mongoose.connection.readyState !== 1) return null;

  try {
    const notification = await Notification.create({
      userId,
      title: String(title).trim(),
      message: String(message).trim(),
      type,
    });

    // Email delivery is best effort so Brevo outages never prevent an in-app event.
    try {
      const recipient = await User.findById(userId).select('email fullName personalDataPurged').lean();
      if (email && recipient?.email && !recipient.personalDataPurged && process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_KEY && process.env.BREVO_SENDER_EMAIL) {
        void sendEmail({
          to: recipient.email,
          subject: String(title).trim(),
          html: `<p>Hello ${escapeHtml(recipient.fullName || 'there')},</p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p><p>Sign in to your UPTOSKILL portal to view this notification.</p>`,
        }).catch((emailError) => console.error('Notification email delivery failed:', emailError.message));
      }
    } catch (emailError) {
      console.error('Notification email delivery failed:', emailError.message);
    }

    return notification;
  } catch (error) {
    console.error('Notification creation failed:', error.message);
    return null;
  }
}

export async function getUserNotifications(userId, { limit = 50 } = {}) {
  if (!userId) return [];

  try {
    return await Notification.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
  } catch (error) {
    console.error('Failed to fetch notifications:', error.message);
    return [];
  }
}

export async function markNotificationRead(userId, notificationId) {
  if (!userId || !notificationId) return null;

  try {
    return await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
  } catch (error) {
    console.error('Failed to mark notification read:', error.message);
    return null;
  }
}
