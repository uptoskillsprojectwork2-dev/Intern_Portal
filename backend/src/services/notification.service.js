import Notification from "../models/Notification.model.js";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";

const escapeHtml = (text = "") =>
  String(text).replace(/[&<>"']/g, (match) => {
    switch (match) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return match;
    }
  });

/**
 * Creates an in-app notification and optionally sends an email notification via Brevo.
 * Note: An email failure must never fail the request. Catch it and log it.
 *
 * @param {string|mongoose.Types.ObjectId} userId - Recipient user ID
 * @param {string} type - Notification event type (e.g., REQUEST_SUBMITTED, REQUEST_FORWARDED, etc.)
 * @param {object} payload - Notification data
 * @param {string} payload.title - Notification title
 * @param {string} payload.message - Notification message body
 * @param {string|mongoose.Types.ObjectId} [payload.requestId] - Associated certificate request ID
 * @param {boolean} [payload.email=false] - Whether to also send an email
 * @returns {Promise<object>} The created notification document
 */
export const notify = async (
  userId,
  type,
  { title, message, requestId = null, email = false }
) => {
  // 1. Create in-app notification
  const notification = await Notification.create({
    userId,
    type,
    title,
    message,
    requestId: requestId || null,
    isRead: false,
  });

  // 2. If email is requested, attempt to send via Brevo sendEmail
  if (email) {
    try {
      const user = await User.findById(userId).select("email fullName");

      if (user && user.email) {
        const safeTitle = escapeHtml(title);
        const safeMessage = escapeHtml(message);
        const safeName = escapeHtml(user.fullName || "User");

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${safeTitle}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 20px 24px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 18px; font-weight: 700; letter-spacing: 0.5px;">UPTOSKILLS</h1>
      <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.9;">Talent & Certificate Governance</p>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 15px; margin: 0 0 16px; color: #334155;">Hello <strong>${safeName}</strong>,</p>
      <div style="background: #f1f5f9; border-left: 4px solid #6366f1; padding: 14px 18px; border-radius: 6px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 6px; font-size: 15px; color: #0f172a;">${safeTitle}</h3>
        <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.5;">${safeMessage}</p>
      </div>
      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0 0 8px;">
        You can log in to your portal dashboard to view updates or track progress.
      </p>
    </div>
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 24px; font-size: 11px; color: #94a3b8; text-align: center;">
      This is an automated notification from UptoSkills Intern Portal.
    </div>
  </div>
</body>
</html>
        `.trim();

        await sendEmail({
          to: user.email,
          subject: `[UPTOSKILL] ${title}`,
          html,
        });
      } else {
        console.warn(
          `[notification.service] Could not send email: user ${userId} has no email address.`
        );
      }
    } catch (err) {
      // An email failure must never fail the request. Catch it and log it.
      console.error(
        `[notification.service] Email delivery failed for user ${userId} (${type}):`,
        err.message || err
      );
    }
  }

  return notification;
};

export default {
  notify,
};
