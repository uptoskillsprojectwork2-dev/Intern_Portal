import express from 'express';
import { verifyPublicCertificate } from '../controllers/public.controller.js';
import publicRateLimit from '../middlewares/publicRateLimit.js';

const publicRouter = express.Router();

publicRouter.get('/verify/:verificationId', publicRateLimit, verifyPublicCertificate);

export default publicRouter;
