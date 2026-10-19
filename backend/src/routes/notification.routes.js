import express from 'express';
import verifyAuth from '../middlewares/verifyAuth.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../controllers/notification.controller.js';

const notificationRouter = express.Router();

// All routes require authentication only (no role restriction)
notificationRouter.get('/', verifyAuth, getNotifications);
notificationRouter.get('/unread-count', verifyAuth, getUnreadCount);
notificationRouter.patch('/read-all', verifyAuth, markAllAsRead);
notificationRouter.patch('/:id/read', verifyAuth, markAsRead);

export default notificationRouter;
