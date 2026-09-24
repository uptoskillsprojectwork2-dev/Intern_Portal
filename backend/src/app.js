import express from 'express';
<<<<<<< HEAD
import authRouter from './routes/auth.routes.js';
import internRoutes from './routes/intern.routes.js';
import hrRoutes from './routes/hr.routes.js';
=======
>>>>>>> origin/main
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dns from 'dns';
import dotenv from 'dotenv';
dotenv.config();

import authRouter from './routes/auth.routes.js';
import internRouter from './routes/intern.routes.js';
import adminRouter from './routes/admin.routes.js';
import teamleaderRouter from './routes/teamleader.routes.js';



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

<<<<<<< HEAD
app.use('/api/intern', internRoutes);
app.use('/api/hr', hrRoutes);
=======
app.use('/api/intern', internRouter);

app.use('/api/admin', adminRouter);

app.use('/api/teamleader', teamleaderRouter);
>>>>>>> origin/main

export default app;