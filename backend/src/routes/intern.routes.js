import express from 'express';
import verifyAuth from '../middlewares/verifyAuth.js';
import {
	getMyRequests,
	getProfile,
	submitCertificateRequest,
	getCertificateForRequest,
	changePassword
} from '../controllers/intern.controller.js';

const internRouter = express.Router();

internRouter.use(verifyAuth, (req, res, next) => {
	if (req.user.role !== 'intern') {
		return res.status(403).json({ message: 'Forbidden' });
	}

	next();
});

internRouter.get('/profile', getProfile);

internRouter.put('/change-password', changePassword);

internRouter.post('/request-certificate', submitCertificateRequest);

internRouter.get('/requests', getMyRequests);

internRouter.get('/requests/:id/certificate', getCertificateForRequest);

export default internRouter;