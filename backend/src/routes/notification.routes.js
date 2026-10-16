import express from 'express';
import verifyAuth from '../middlewares/verifyAuth.js';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../controllers/notification.controller.js';

const notificationRouter = express.Router();
const allowedRoles = new Set(['admin', 'teamleader', 'intern']);

notificationRouter.use(verifyAuth, (req, res, next) => {
  if (!allowedRoles.has(req.user.role)) return res.status(403).json({ message: 'Notification access is not available for this role.' });
  return next();
});

notificationRouter.get('/', getNotifications);
notificationRouter.get('/unread-count', getUnreadNotificationCount);
notificationRouter.patch('/read-all', markAllNotificationsAsRead);
notificationRouter.patch('/:id/read', markNotificationAsRead);

export default notificationRouter;
