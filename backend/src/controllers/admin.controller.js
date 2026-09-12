import CertificateTemplate from '../models/CertificateTemplate.model.js';
import Certificate from '../models/Certificate.model.js';
import CertificateRequest from '../models/CertificateRequest.js';
import { createCertificateDraft, finalizeCertificate } from '../services/certificate.service.js';
import sendEmail from '../utils/sendEmail.js';
import '../models/User.js';

export const getMyInterns = async (req, res) => {
  try {
    const interns = await CertificateRequest.find({}).populate('internId');
    res.status(200).json({ success: true, data: interns });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPendingRequests = async (req, res) => {
  try {
    const pending = await CertificateRequest.find({ status: { $ne: 'approved' } }).populate('internId');
    res.status(200).json({ success: true, data: pending });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateCertificateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const request = await CertificateRequest.findByIdAndUpdate(id, { status }, { new: true });
    if (!request) {
      return res.status(404).json({ success: false, error: "Request not found" });
    }
    res.status(200).json({ success: true, data: request });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const createTemplate = async (req, res) => {
  try {
    const template = await CertificateTemplate.create({ ...req.body, createdBy: req.user?._id || req.body.createdBy });
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getAllTemplates = async (req, res) => {
  try {
    const templates = await CertificateTemplate.find({});
    res.status(200).json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateTemplate = async (req, res) => {
  try {
    const template = await CertificateTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const toggleTemplateActive = async (req, res) => {
  try {
    const template = await CertificateTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: "Template not found" });
    }
    template.isActive = !template.isActive;
    await template.save();
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const finalizeRequest = async (req, res) => {
  try {
    const request = await CertificateRequest.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });

    if (!request) {
      return res.status(404).json({ success: false, error: "Request not found" });
    }

    const draft = await createCertificateDraft(request._id);
    res.status(200).json({ success: true, data: { request, draft } });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getCertificateDraft = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) {
      return res.status(404).json({ success: false, error: "Certificate draft not found" });
    }
    res.status(200).json({ success: true, data: certificate });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
};

export const updateCertificateDraft = async (req, res) => {
  try {
    const certificate = await Certificate.findByIdAndUpdate(req.params.id, { htmlContent: req.body.htmlContent }, { new: true });
    if (!certificate) {
      return res.status(404).json({ success: false, error: "Certificate draft not found" });
    }
    res.status(200).json({ success: true, data: certificate });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const finalizeAndSendCertificate = async (req, res) => {
  try {
    const { certificate, pdfBuffer } = await finalizeCertificate(req.params.id);
    const request = await CertificateRequest.findById(certificate.request).populate('internId');

    if (!request || !request.internId) {
      return res.status(404).json({ success: false, error: "Associated request or user not found" });
    }

    await sendEmail({
      to: request.internId.email,
      subject: 'Your Certificate is Ready',
      html: '<p>Please find your attached certificate.</p>',
      attachments: [{ filename: 'certificate.pdf', content: pdfBuffer }]
    });

    certificate.emailSentAt = new Date();
    await certificate.save();

    res.status(200).json({ success: true, data: certificate });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find({})
      .populate({
        path: 'request',
        populate: { path: 'internId' }
      })
      .populate('template');
    res.status(200).json({ success: true, data: certificates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const retryCertificateGeneration = async (req, res) => {
  try {
    const draft = await createCertificateDraft(req.params.id);
    res.status(201).json({ success: true, data: draft });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};