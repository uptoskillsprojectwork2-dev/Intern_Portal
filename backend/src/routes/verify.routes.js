import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyCertificate } from '../controllers/verify.controller.js';

const verifyRouter = Router();

// Rate limit with express-rate-limit (30 requests per minute per IP)
const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many verification attempts from this IP, please try again in a minute.' }
});

verifyRouter.get('/:verifyId', verifyLimiter, verifyCertificate);

export default verifyRouter;
