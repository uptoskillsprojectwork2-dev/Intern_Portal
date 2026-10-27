
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';

import authRouter from './routes/auth.routes.js';
import internRouter from './routes/intern.routes.js';
import adminRouter from './routes/admin.routes.js';
import teamleaderRouter from './routes/teamleader.routes.js';
import analyticsRouter from './routes/adminAnalytics.routes.js';
import notificationRouter from './routes/notification.routes.js';
import sanitizeInput from './middlewares/sanitizeInput.js';
import { verifyPublicCertificate } from './controllers/public.controller.js';


const app = express();

const allowedOrigins = new Set(
  [process.env.FRONTEND_URL, ...(process.env.CORS_ORIGINS || '').split(',')]
    .map((origin) => origin?.trim())
    .filter(Boolean)
);

app.use(helmet());

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    const error = new Error('Origin is not allowed by CORS');
    error.status = 403;
    return callback(error);
  },
  credentials: true
}));

// Parse JSON request bodies and sanitize input.
app.use(express.json({ limit: '1mb' }));
app.use(sanitizeInput);

app.use((_req, res, next) => {
  const sendJson = res.json.bind(res);

  res.json = (body) => {
    if (res.statusCode >= 500 && process.env.NODE_ENV === 'production') {
      return sendJson({ message: 'Internal server error' });
    }

    if (body && typeof body === 'object' && body.error && res.statusCode < 500) {
      const { error: _hidden, ...safeBody } = body;
      return sendJson(safeBody);
    }

    return sendJson(body);
  };

  return next();
});

app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/intern', internRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/admin/analytics', analyticsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/teamleader', teamleaderRouter);

app.get('/api/public/certificates/verify', (req, res, next) => {
  const adaptedReq = {
    ...req,
    params: {
      ...req.params,
      verificationId:
        req.query.verifyId ||
        req.query.verificationCode ||
        req.query.certificateNumber
    }
  };

  return verifyPublicCertificate(adaptedReq, res, next);
});

app.get(
  '/api/public/verify/:certificateNumber',
  verifyPublicCertificate
);
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

app.use((error, _req, res, _next) => {
  if (res.headersSent) return;

  const status = Number(error.status || error.statusCode) || 500;
  const message = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : (error.message || 'Internal server error');

  return res.status(status).json({
    message,
    ...(error.errors ? { errors: error.errors } : {})
  });
});

export default app;
