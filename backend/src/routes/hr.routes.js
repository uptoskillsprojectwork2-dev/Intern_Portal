import express from 'express';
import { getPendingRequests, updateCertificateStatus, getMyInterns } from '../controllers/hr.controller.js';
import verifyAuth from '../middlewares/verifyAuth.js'; // The security guard!

const router = express.Router();

// New route for Team Leaders/HR to get their assigned interns
router.get('/my-interns', verifyAuth, getMyInterns);

// Both routes now require verifyAuth so req.user is populated!
router.get('/certificates/pending', verifyAuth, getPendingRequests);
router.patch('/certificates/:id', verifyAuth, updateCertificateStatus);

export default router;