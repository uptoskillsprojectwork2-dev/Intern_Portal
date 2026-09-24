import express from 'express';
import * as internController from '../controllers/intern.controller.js';

const router = express.Router();

router.get('/requests/:id/certificate', internController.getInternCertificate);

export default router;
