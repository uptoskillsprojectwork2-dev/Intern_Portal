import express from 'express';
import verifyAuth from '../middlewares/verifyAuth.js';
import {
  getNotifications,
  getUnreadCount,
  getUnreadNotificationCount,
  markNotificationRead,
  markNotificationAsRead,
  markAllNotificationsRead,
  markAllNotificationsAsRead,
} from '../controllers/notification.controller.js';

const notificationRouter = express.Router();
const allowedRoles = new Set(['admin', 'teamleader', 'intern']);

notificationRouter.use(verifyAuth, (req, res, next) => {
  if (!allowedRoles.has(req.user.role)) {
    return res.status(403).json({ message: 'Notification access is not available for this role.' });
  }
  return next();
});

notificationRouter.get('/', getNotifications);
notificationRouter.get('/unread-count', getUnreadCount);
notificationRouter.patch('/read-all', markAllNotificationsRead);
notificationRouter.patch('/:id/read', markNotificationRead);

export default notificationRouter;
