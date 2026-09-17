import express from 'express';
import { getPendingRequests, updateCertificateStatus } from '../controllers/hr.controller.js';
import verifyAuth from '../middlewares/verifyAuth.js'; // The security guard!

const router = express.Router();

// Both routes now require verifyAuth so req.user is populated!
router.get('/certificates/pending', verifyAuth, getPendingRequests);
router.patch('/certificates/:id', verifyAuth, updateCertificateStatus);

export default router;