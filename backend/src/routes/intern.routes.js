import express from 'express';
import { 
    submitCertificateRequest, 
    getMyRequests, 
    getCertificateForRequest 
} from '../controllers/intern.controller.js';
import verifyAuth from '../middlewares/verifyAuth.js';

const router = express.Router();

// Apply the existing protected block middleware
router.use(verifyAuth);

// Intern endpoints
router.post('/certificates', submitCertificateRequest);
router.get('/certificates', getMyRequests);
router.get('/requests/:id/certificate', getCertificateForRequest);

export default router;