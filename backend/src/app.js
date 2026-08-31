import express from 'express';
import authRouter from './routes/auth.routes.js';
import internRoutes from './routes/intern.routes.js';
import hrRoutes from './routes/hr.routes.js';
import cookieParser from 'cookie-parser';
import dns from 'dns';

// Use public DNS providers (Cloudflare and Google) to avoid local DNS issues.
// Remove or modify if you rely on system DNS or have internal DNS requirements.
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = express();

// Parse JSON request bodies and populate `req.body`.
app.use(express.json());

// Parse cookies and populate `req.cookies`.
app.use(cookieParser());

// Mount authentication routes at `/api/auth` (e.g., `/api/auth/login`).
app.use('/api/auth', authRouter);

app.use('/api/intern', internRoutes);
app.use('/api/hr', hrRoutes);

export default app;