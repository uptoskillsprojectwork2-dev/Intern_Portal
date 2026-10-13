import CertificateTemplate from "../models/CertificateTemplate.js";
import { getCertificateTitle } from "../services/certificate.service.js";
import Handlebars from 'handlebars';
import { logAudit } from "../utils/auditLogger.js";
import { clearAnalyticsCache } from "../utils/cache.js";

export const PLACEHOLDERS = [
  { key: 'fullName', source: 'User.fullName', description: 'Intern full name' },
  { key: 'internCode', source: 'User.internCode', description: 'Intern unique code' },
  { key: 'domain', source: 'User.domain', description: 'Internship domain/department' },
  { key: 'startDate', source: 'User.startDate', description: 'Internship start date, formatted as 12 Jan 2026' },
  { key: 'endDate', source: 'User.endDate', description: 'Internship end date, formatted as 12 Jan 2026' },
  { key: 'issueDate', source: 'Date of finalization', description: 'Certificate issue date, formatted as 12 Jan 2026' },
  { key: 'requestNumber', source: 'CertificateRequest.requestNumber', description: 'Unique request number' },
  { key: 'certificateTitle', source: 'Mapped from certificateType', description: 'Human-readable certificate title' },
  { key: 'qrCodeUrl', source: 'QR placeholder (reserved)', description: 'Placeholder for QR code URL — to be added in later task' },
];

export const getPlaceholders = async (req, res) => {
  try {
    res.json({ placeholders: PLACEHOLDERS });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getAllTemplates = async (req, res) => {
  try {
    const templates = await CertificateTemplate.find()
      .select('-content')
      .sort({ createdAt: -1 });
    return res.json({ templates });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getTemplateById = async (req, res) => {
  try {
    const template = await CertificateTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    return res.json({ template });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getTemplateByType = async (req, res) => {
  try {
    const { certificateType } = req.params;
    const template = await CertificateTemplate.findOne({ certificateType }).sort({ version: -1, createdAt: -1 });
    if (!template) {
      return res.status(404).json({ message: 'Template not found for this certificate type' });
    }
    return res.json({ template });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const validateTemplateContent = (content) => {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'Template content is required' };
  }

  if (!content.includes('{{fullName}}')) {
    return { valid: false, error: 'Template must include the {{fullName}} placeholder' };
  }

  const openCount = (content.match(/\{\{/g) || []).length;
  const closeCount = (content.match(/\}\}/g) || []).length;
  if (openCount !== closeCount) {
    return { valid: false, error: 'Unbalanced {{ }} brackets detected in template' };
  }

  try {
    const compiled = Handlebars.compile(content);
    compiled({});
  } catch (err) {
    return { valid: false, error: `Unbalanced or invalid Handlebars template syntax: ${err.message}` };
  }

  return { valid: true };
};

export const createTemplate = async (req, res) => {
  try {
    const { templateCode, templateName, certificateType, title, description, content } = req.body;

    const validation = validateTemplateContent(content);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.error });
    }

    const existing = await CertificateTemplate.findOne({ certificateType });
    if (existing) {
      return res.status(409).json({ message: `Template for ${certificateType} already exists` });
    }

    const template = await CertificateTemplate.create({
      templateCode,
      templateName,
      certificateType,
      title: title || getCertificateTitle(certificateType),
      description,
      content,
      placeholders: PLACEHOLDERS.map(p => p.key),
      status: 'active',
      createdBy: req.user.id,
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_TEMPLATE',
      entityType: 'certificate_template',
      entityId: template._id,
      description: `Created template for ${certificateType}`,
      req,
    });

    return res.status(201).json({ template });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.content !== undefined) {
      const validation = validateTemplateContent(updates.content);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }
    }

    const existing = await CertificateTemplate.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const nextVersion = (existing.version || 0) + 1;
    const template = await CertificateTemplate.findByIdAndUpdate(
      id,
      { ...updates, version: nextVersion },
      { new: true, runValidators: true }
    );

    clearAnalyticsCache();

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_TEMPLATE',
      entityType: 'certificate_template',
      entityId: template._id,
      description: `Updated template for ${template.certificateType}`,
      req,
    });

    return res.json({ template });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    const template = await CertificateTemplate.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    await logAudit({
      userId: req.user.id,
      action: 'DELETE_TEMPLATE',
      entityType: 'certificate_template',
      entityId: template._id,
      description: `Deleted template for ${template.certificateType}`,
      req,
    });

    return res.json({ message: 'Template deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
