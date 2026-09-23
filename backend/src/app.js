import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dns from 'dns';

import authRouter from './routes/auth.routes.js';
import internRouter from './routes/intern.routes.js';
import adminRouter from './routes/admin.routes.js';
import teamleaderRouter from './routes/teamleader.routes.js';

import path from 'path';
import { fileURLToPath } from 'url';

// Use public DNS providers (Cloudflare and Google) to avoid local DNS issues.
// Remove or modify if you rely on system DNS or have internal DNS requirements.
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve uploaded files
app.use(
  '/uploads',
  express.static(path.join(__dirname, '../uploads'))
);

// Allow the frontend to send and receive the authentication cookie.
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // such as Postman, curl, or server-to-server requests.
      if (!origin) {
        return callback(null, true);
      }

      // Allow configured frontend origins.
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS policy: Origin ${origin} is not allowed`)
      );
    },
    credentials: true,
  })
);

// Parse JSON request bodies and populate req.body.
app.use(express.json());

// Parse cookies and populate req.cookies.
app.use(cookieParser());

// Mount authentication routes at /api/auth
app.use('/api/auth', authRouter);

// Intern routes
app.use('/api/intern', internRouter);

// Admin routes
app.use('/api/admin', adminRouter);

// Team Leader routes
app.use('/api/teamleader', teamleaderRouter);

export default app;