import express from 'express';
import rateLimit from 'express-rate-limit';
import { verifyCertificatePublic } from '../controllers/admin.controller.js';

const verifyRouter = express.Router();

/**
 * Rate limit the public verification endpoint to prevent abuse.
 * 30 requests per minute per IP.
 */
const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many verification requests. Please try again shortly.' },
});

// GET /api/verify/:verifyId — NO authentication required
verifyRouter.get('/:verifyId', verifyLimiter, verifyCertificatePublic);

export default verifyRouter;
