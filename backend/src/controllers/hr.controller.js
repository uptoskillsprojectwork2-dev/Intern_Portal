import CertificateRequest from '../models/CertificateRequest.js';
import Certificate from '../models/Certificate.js';
import CertificateTemplate from '../models/CertificateTemplate.js';
import User from '../models/User.js';

// Get pending certificate requests
export const getPendingRequests = async (req, res) => {
    try {
        const pendingRequests = await CertificateRequest.find({ status: 'pending' }).populate('internId');
        return res.status(200).json({ success: true, data: pendingRequests });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// Update certificate request status (approve/reject)
export const updateCertificateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;

        const updatedRequest = await CertificateRequest.findByIdAndUpdate(
            id,
            { status, remarks },
            { new: true }
        ).populate('internId');

        if (!updatedRequest) {
            return res.status(404).json({ success: false, error: 'Certificate request not found' });
        }

        return res.status(200).json({ success: true, data: updatedRequest });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// Get all interns managed by the HR/Team Leader
export const getMyInterns = async (req, res) => {
    try {
        const interns = await User.find({ role: 'intern' });
        return res.status(200).json({ success: true, data: interns });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// Create a certificate template
export const createTemplate = async (req, res) => {
    try {
        const { name, certificateType, htmlContent } = req.body;
        const newTemplate = await CertificateTemplate.create({
            name,
            certificateType,
            htmlContent,
            createdBy: req.user?._id
        });
        return res.status(201).json({ success: true, data: newTemplate });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// Get all templates
export const getAllTemplates = async (req, res) => {
    try {
        const templates = await CertificateTemplate.find({});
        return res.status(200).json({ success: true, data: templates });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// Update a template
export const updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await CertificateTemplate.findByIdAndUpdate(id, req.body, { new: true });
        return res.status(200).json({ success: true, data: updated });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// Toggle template active status
export const toggleTemplateActive = async (req, res) => {
    try {
        const { id } = req.params;
        const template = await CertificateTemplate.findById(id);
        if (!template) {
            return res.status(404).json({ success: false, error: 'Template not found' });
        }
        template.isActive = !template.isActive;
        await template.save();
        return res.status(200).json({ success: true, data: template });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// Get certificate draft by ID
export const getCertificateDraft = async (req, res) => {
    try {
        const { id } = req.params;
        const certificate = await Certificate.findById(id).populate('request template');
        if (!certificate) {
            return res.status(404).json({ success: false, error: 'Certificate draft not found' });
        }
        return res.status(200).json({ success: true, data: certificate });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// Update certificate draft content
export const updateCertificateDraft = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await Certificate.findByIdAndUpdate(id, req.body, { new: true });
        return res.status(200).json({ success: true, data: updated });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// Finalize and send certificate
export const finalizeAndSendCertificate = async (req, res) => {
    try {
        const { id } = req.params;
        const certificate = await Certificate.findById(id);
        if (!certificate) {
            return res.status(404).json({ success: false, error: 'Certificate not found' });
        }
        certificate.status = 'completed';
        await certificate.save();
        return res.status(200).json({ success: true, data: certificate });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// Get all certificates
export const getAllCertificates = async (req, res) => {
    try {
        const certificates = await Certificate.find({})
            .populate({
                path: 'request',
                populate: { path: 'internId' }
            })
            .populate('template');
        return res.status(200).json({ success: true, data: certificates });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// Retry certificate generation
export const retryCertificateGeneration = async (req, res) => {
    try {
        const { id } = req.params;
        return res.status(200).json({ success: true, message: `Retried generation for request ${id}` });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};