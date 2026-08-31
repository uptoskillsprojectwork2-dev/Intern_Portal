import express from 'express';
import { submitCertificateRequest, getMyRequests } from '../controllers/intern.controller.js';
import  verifyAuth from '../middlewares/verifyAuth.js'; // Assuming this is your middleware's export name

const router = express.Router();

// Apply the existing protected block middleware
router.use(verifyAuth);

// Intern endpoints
router.post('/certificates', submitCertificateRequest);
router.get('/certificates', getMyRequests);

export default router;