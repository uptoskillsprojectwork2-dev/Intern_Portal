import dotenv from "dotenv";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

dotenv.config({
    path: fileURLToPath(new URL("../../.env", import.meta.url)),
    override: true
});

export const sendEmail = async ({ to, subject, html, attachments }) => {
    const { BREVO_SMTP_USER, BREVO_SMTP_KEY, BREVO_SENDER_EMAIL } = process.env;
    const sender = BREVO_SENDER_EMAIL || BREVO_SMTP_USER;

    if (!BREVO_SMTP_USER || !BREVO_SMTP_KEY || !sender) {
        console.warn("[sendEmail] Brevo SMTP credentials not configured in .env. Logging email to console:");
        console.log(`[sendEmail] TO: ${to}`);
        console.log(`[sendEmail] SUBJECT: ${subject}`);
        console.log(`[sendEmail] HTML: ${html}`);
        return { messageId: "mock-dev-email-" + Date.now() };
    }

    const transporter = nodemailer.createTransport({
        host: "smtp-relay.brevo.com",
        port: 587,
        auth: {
            user: BREVO_SMTP_USER,
            pass: BREVO_SMTP_KEY
        }
    });

    const mailOptions = {
        from: `"UPTOSKILL" <${sender}>`,
        to,
        subject,
        html
    };

    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        mailOptions.attachments = attachments;
    }

    return transporter.sendMail(mailOptions);
};