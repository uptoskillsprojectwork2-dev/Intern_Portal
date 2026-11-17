import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dns from 'dns';

// Controllers and Routers
import analyticsRouter from './routes/adminAnalytics.routes.js';
import authRouter from './routes/auth.routes.js';
import internRouter from './routes/intern.routes.js';
import adminRouter from './routes/admin.routes.js';
import teamleaderRouter from './routes/teamleader.routes.js';
import notificationRouter from './routes/notification.routes.js';
import healthRouter from './routes/health.router.js'; // Task J Requirement
import { verifyCertificatePublic } from './controllers/admin.controller.js';

// Use public DNS providers (Cloudflare and Google) to avoid local DNS issues.
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = express();

// Task J Requirement: Trust proxy so rate limiters and audit logs see real IPs
app.set('trust proxy', 1);

// Allow the frontend to send and receive the authentication cookie.
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

// Parse JSON request bodies and cookies.
app.use(express.json());
app.use(cookieParser());

// Task J Requirement: Health check for host uptime monitoring[cite: 1]
app.use('/api', healthRouter);

// Core Application Routes
app.use('/api/auth', authRouter);
app.use('/api/intern', internRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/admin/analytics', analyticsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/teamleader', teamleaderRouter);
app.get('/api/public/certificates/verify', verifyCertificatePublic);

export default app;