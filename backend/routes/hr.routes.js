import express from 'express';
import * as adminController from '../src/controllers/admin.controller.js';

const router = express.Router();

router.post('/templates', adminController.createTemplate);
router.get('/templates', adminController.getAllTemplates);
router.patch('/templates/:id', adminController.updateTemplate);
router.patch('/templates/:id/toggle', adminController.toggleTemplateActive);

router.get('/certificates/:id', adminController.getCertificateDraft);
router.patch('/certificates/:id', adminController.updateCertificateDraft);
router.patch('/requests/:id/approve', adminController.finalizeRequest);

router.post('/certificates/:id/finalize', adminController.finalizeAndSendCertificate);

router.get('/certificates', adminController.getAllCertificates);
router.post('/requests/:id/retry-generation', adminController.retryCertificateGeneration);

export default router;
