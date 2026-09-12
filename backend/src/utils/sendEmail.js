import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  family: 4,
  auth: {
    user: 'your-actual-email@gmail.com', // Replace with your actual email string
    pass: 'your-16-character-app-password', // Replace with your actual App Password string
  },
});

export default async function sendEmail({ to, subject, html, attachments }) {
  console.log("----------------------------------------");
  console.log("MOCK EMAIL DISPATCHED SUCCESSFULLY:");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Attachments: ${attachments ? attachments.length : 0} file(s) attached`);
  console.log("----------------------------------------");

  // Simulate successful resolution without connecting to an SMTP server
  return Promise.resolve(true);
}