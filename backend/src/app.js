import express from 'express';
import authRouter from './routes/auth.routes.js';
import internRoutes from './routes/intern.routes.js';
import hrRoutes from './routes/hr.routes.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dns from 'dns';

// Use public DNS providers (Cloudflare and Google) to avoid local DNS issues.
// Remove or modify if you rely on system DNS or have internal DNS requirements.
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = express();

// Allow the frontend to send and receive the authentication cookie.
app.use(cors({
	origin: process.env.FRONTEND_URL || 'http://localhost:5173',
	credentials: true
}));

// Parse JSON request bodies and populate `req.body`.
app.use(express.json());

// Parse cookies and populate `req.cookies`.
app.use(cookieParser());

// Mount authentication routes at `/api/auth` (e.g., `/api/auth/login`).
app.use('/api/auth', authRouter);

app.use('/api/intern', internRoutes);
app.use('/api/hr', hrRoutes);

export default app;