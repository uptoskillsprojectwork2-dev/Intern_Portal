import Notification from '../models/Notification.model.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/sendEmail.js';

// Agreed notification types
export const REQUEST_SUBMITTED = 'REQUEST_SUBMITTED';
export const REQUEST_FORWARDED = 'REQUEST_FORWARDED';
export const REQUEST_REJECTED  = 'REQUEST_REJECTED';
export const REQUEST_APPROVED  = 'REQUEST_APPROVED';
export const CERTIFICATE_SENT  = 'CERTIFICATE_SENT';
export const CERTIFICATE_REVOKED = 'CERTIFICATE_REVOKED';
export const ARCHIVE_WARNING   = 'ARCHIVE_WARNING';

/**
 * Creates clean HTML email markup with consistent UPTOSKILL branding.
 */
function createEmailTemplate({ title, message, recipientName }) {
  const safeName = recipientName || 'Intern Portal User';
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }
          .header { background: linear-gradient(135deg, #6d72ea, #8c57e8); padding: 24px; color: #ffffff; }
          .brand { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9; margin: 0 0 6px 0; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; }
          .content { padding: 24px; line-height: 1.6; font-size: 15px; }
          .message-box { background: #f1f5f9; border-left: 4px solid #6d72ea; padding: 14px 18px; margin: 16px 0; border-radius: 0 6px 6px 0; font-size: 15px; }
          .footer { padding: 18px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <p class="brand">UPTOSKILL Intern Portal</p>
            <h1>${title}</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${safeName}</strong>,</p>
            <div class="message-box">
              ${message}
            </div>
            <p>You can view full details by logging into your portal dashboard.</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from the UPTOSKILL Intern Portal.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Creates an in-app notification and optionally dispatches an email.
 * An email delivery failure will NEVER fail the calling request.
 *
 * @param {string|ObjectId} userId - Recipient user ID
 * @param {string} type - Notification type constant
 * @param {Object} options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message content
 * @param {string|ObjectId} [options.requestId] - Associated certificate request ID
 * @param {boolean} [options.email=false] - Whether to also send email via Brevo
 */
export async function notify(userId, type, { title, message, requestId = null, email = false }) {
  try {
    // 1. Create in-app notification in DB
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      requestId,
    });

    // 2. Dispatch email if requested
    if (email) {
      try {
        const user = await User.findById(userId).select('email fullName');
        if (user && user.email) {
          const html = createEmailTemplate({
            title,
            message,
            recipientName: user.fullName,
          });

          await sendEmail({
            to: user.email,
            subject: `[UPTOSKILL] ${title}`,
            html,
          });
        } else {
          console.warn(`[notify] Recipient user ${userId} has no valid email address; skipped email.`);
        }
      } catch (mailErr) {
        // An email failure must NEVER fail the request. Catch it and log it.
        console.error(`[notify] Email delivery failed for user ${userId} (${type}):`, mailErr.message);
      }
    }

    return notification;
  } catch (err) {
    console.error(`[notify] Failed to create notification for user ${userId}:`, err);
    return null;
  }
}
