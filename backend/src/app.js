import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dns from 'dns';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';

import authRouter from './routes/auth.routes.js';
import internRouter from './routes/intern.routes.js';
import adminRouter from './routes/admin.routes.js';
import teamleaderRouter from './routes/teamleader.routes.js';
import analyticsRouter from './routes/adminAnalytics.routes.js';
import notificationRouter from './routes/notification.routes.js';
import verifyRouter from './routes/verify.routes.js';
import certificateRouter from './routes/certificate.routes.js';
import { centralErrorHandler } from './middlewares/errorHandler.js';

// Use public DNS providers (Cloudflare and Google) to avoid local DNS issues.
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = express();

// Trust the first proxy so req.ip returns the real client IP.
app.set('trust proxy', 1);

// Security Headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// CORS Whitelist configuration with credentials support
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
const allowedOrigins = [
  frontendUrl,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, server-to-server, supertest)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

// Parse JSON request bodies with 1mb limit
app.use(express.json({ limit: "1mb" }));

// NoSQL injection protection: Sanitize user input against MongoDB operator injection
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') mongoSanitize.sanitize(req.body);
  if (req.params && typeof req.params === 'object') mongoSanitize.sanitize(req.params);
  if (req.query && typeof req.query === 'object') mongoSanitize.sanitize(req.query);
  next();
});

// Parse cookies and populate `req.cookies`.
app.use(cookieParser());

// Mount application routes
app.use('/api/auth', authRouter);
app.use('/api/verify', verifyRouter);
app.use('/api/intern', internRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/admin/analytics', analyticsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/teamleader', teamleaderRouter);
app.use('/api/certificates', certificateRouter);

// Central error handler (single error shape: { message, errors? }, no 500 leaks in prod)
app.use(centralErrorHandler);

export default app;