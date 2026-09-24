import express from 'express';
import { 
    getPendingRequests, 
    updateCertificateStatus, 
    getMyInterns,
    createTemplate,
    getAllTemplates,
    updateTemplate,
    toggleTemplateActive,
    getCertificateDraft,
    updateCertificateDraft,
    finalizeAndSendCertificate,
    getAllCertificates,
    retryCertificateGeneration
} from '../controllers/hr.controller.js';
import verifyAuth from '../middlewares/verifyAuth.js';
import CertificateTemplate from '../models/CertificateTemplate.js';

const router = express.Router();

// Team Leader / HR intern routes
router.get('/my-interns', verifyAuth, getMyInterns);

// Use a completely unique static path to prevent parameter collisions
router.get('/certificate-requests/pending', getPendingRequests);
router.get('/certificates', verifyAuth, getAllCertificates);

// Parameterized certificate and request routes
router.get('/certificates/:id', verifyAuth, getCertificateDraft);
router.patch('/certificates/:id', verifyAuth, updateCertificateDraft);
router.patch('/certificates/:id/status', verifyAuth, updateCertificateStatus);
router.patch('/requests/:id/approve', verifyAuth, updateCertificateStatus);
router.post('/certificates/:id/finalize', verifyAuth, finalizeAndSendCertificate);
router.post('/requests/:id/retry-generation', verifyAuth, retryCertificateGeneration);

// Certificate Template Routes
router.post("/templates", verifyAuth, async (req, res) => {
    try {
        const templateCode = req.body.templateCode?.trim();
        const title = req.body.title?.trim();
        const { templateName, certificateType, htmlContent, isActive } = req.body;

        const updatedTemplate = await CertificateTemplate.findOneAndUpdate(
            { templateCode },
            { title, templateName, certificateType, htmlContent, isActive },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(200).json({ success: true, data: updatedTemplate });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});


router.post('/generate-certificate', verifyAuth, async (req, res) => {
    try {
        const { templateCode, internName } = req.body;
        const template = await CertificateTemplate.findOne({ templateCode });

        if (!template) {
            return res.status(404).json({ success: false, message: "Template not found in database" });
        }

        if (!template.htmlContent) {
            return res.status(400).json({ success: false, message: "Template is missing htmlContent field" });
        }

        let finalHtml = template.htmlContent.replace('{{fullName}}', internName || 'Intern');

        res.status(200).json({
            success: true,
            renderedHtml: finalHtml
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/templates', verifyAuth, getAllTemplates);
router.patch('/templates/:id', verifyAuth, updateTemplate);
router.patch('/templates/:id/toggle', verifyAuth, toggleTemplateActive);

export default router;