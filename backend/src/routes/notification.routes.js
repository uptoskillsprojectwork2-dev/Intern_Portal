import express from "express";
import verifyAuth from "../middlewares/verifyAuth.js";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/notification.controller.js";

const notificationRouter = express.Router();

// Protected by verifyAuth only, with no role check
notificationRouter.use(verifyAuth);

notificationRouter.get("/", getNotifications);
notificationRouter.get("/unread-count", getUnreadCount);
notificationRouter.patch("/read-all", markAllNotificationsRead);
notificationRouter.patch("/:id/read", markNotificationRead);

export default notificationRouter;
