import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dns from 'dns';

import authRouter from './routes/auth.routes.js';
import internRouter from './routes/intern.routes.js';
import adminRouter from './routes/admin.routes.js';
import teamleaderRouter from './routes/teamleader.routes.js';
import analyticsRouter from './routes/adminAnalytics.routes.js';
import notificationRouter from './routes/notification.routes.js';
import verifyRouter from './routes/verify.routes.js';
import { verifyCertificatePublic } from './controllers/admin.controller.js';

// Use public DNS providers (Cloudflare and Google) to avoid local DNS issues.
// Remove or modify if you rely on system DNS or have internal DNS requirements.
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = express();
app.set('trust proxy', 1);

const configuredOrigins = process.env.FRONTEND_URL
	? process.env.FRONTEND_URL.split(',').map((o) => o.trim()).filter(Boolean)
	: [];

const defaultOrigins = [
	'http://localhost:5173',
	'http://localhost:5174',
	'http://localhost:5175',
	'http://127.0.0.1:5173',
	'http://127.0.0.1:5174',
	'http://127.0.0.1:5175',
];

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...configuredOrigins]));

const isLocalOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

// Allow the frontend to send and receive the authentication cookie.
app.use(cors({
	origin: (origin, callback) => {
		// Allow requests with no origin (like mobile apps, curl, or Postman)
		if (!origin || allowedOrigins.includes(origin) || isLocalOrigin(origin)) {
			return callback(null, true);
		}
		return callback(null, false);
	},
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Parse JSON request bodies and populate `req.body`.
app.use(express.json());

// Parse cookies and populate `req.cookies`.
app.use(cookieParser());

// Mount authentication routes at `/api/auth` (e.g., `/api/auth/login`).
app.use('/api/auth', authRouter);

app.use('/api/intern', internRouter);

app.use('/api/notifications', notificationRouter);

app.use('/api/admin/analytics', analyticsRouter);

app.use('/api/admin', adminRouter);

app.use('/api/teamleader', teamleaderRouter);

// Public certificate verification route (unauthenticated, rate limited)
app.use('/api/verify', verifyRouter);
app.get('/api/public/certificates/verify', verifyCertificatePublic);

export default app;
