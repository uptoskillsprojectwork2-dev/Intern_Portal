import express from 'express';
import { registerValidator } from '../validators/auth.validator.js';
import verifyAuth from '../middlewares/verifyAuth.js';
import { createIntern, getInternsForTL, getRequestsForReview, reviewRequestAsTL } from '../controllers/teamleader.controller.js';

const teamleaderRouter = express.Router();

teamleaderRouter.use(verifyAuth, (req, res, next) => {
	if (req.user.role !== 'teamleader') {
		return res.status(403).json({ message: 'Team leader access required' });
	}

	next();
});

teamleaderRouter.post('/create-intern', registerValidator, createIntern);

teamleaderRouter.get('/interns', getInternsForTL);

teamleaderRouter.get('/requests-for-review', getRequestsForReview);

teamleaderRouter.patch('/requests/:id/review', reviewRequestAsTL);

export default teamleaderRouter;
