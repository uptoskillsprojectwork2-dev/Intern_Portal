import express from 'express';
import verifyAuth from '../middlewares/verifyAuth.js';
import {
  getMyRequests,
  getProfile,
  submitCertificateRequest,
  getCertificateForRequest,
  downloadCertificateForRequest
} from '../controllers/intern.controller.js';

const internRouter = express.Router();

internRouter.use(verifyAuth, (req, res, next) => {
	if (req.user.role !== 'intern') {
		return res.status(403).json({ message: 'Forbidden' });
	}

	next();
});

internRouter.get('/profile', getProfile);

internRouter.post('/request-certificate', submitCertificateRequest);

internRouter.get('/requests', getMyRequests);

// Day 5 Intern Certificate Fetch and Secure Download routes
internRouter.get('/requests/:id/certificate', getCertificateForRequest);
internRouter.get('/requests/:id/certificate/download', downloadCertificateForRequest);

export default internRouter;