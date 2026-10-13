import mongoose from 'mongoose';
import Handlebars from 'handlebars';
import CertificateTemplate from '../models/CertificateTemplate.js';
import { logAudit } from '../utils/auditLogger.js';

// ─── Constants ────────────────────────────────────────────────────────────────

export const ALLOWED_CERTIFICATE_TYPES = [
  'offer_letter',
  'bonafide',
  'ojt_certificate',
  'experience_letter',
  'completion_certificate',
  'intern_of_month',
  'intern_of_the_month',
  'league_winner',
  'custom'
];

/**
 * Canonical list of supported Handlebars placeholders.
 * Returned by GET /api/admin/templates/placeholders so the frontend
 * does not need to hard-code them.
 */
export const PLACEHOLDER_LIST = [
  // ── Required ──────────────────────────────────────────────────────────────
  { key: '{{fullName}}',         description: "Intern's full name",                           source: 'User.fullName',                          required: true  },
  // ── Core certificate fields ───────────────────────────────────────────────
  { key: '{{internCode}}',       description: 'Unique intern identifier',                      source: 'User.internCode',                        required: false },
  { key: '{{domain}}',           description: 'Internship domain / department',                source: 'User.domain',                            required: false },
  { key: '{{startDate}}',        description: 'Internship start date (e.g. 1 Jan 2026)',       source: 'User.startDate',                         required: false },
  { key: '{{endDate}}',          description: 'Internship end date (e.g. 30 Jun 2026)',        source: 'User.endDate',                           required: false },
  { key: '{{issueDate}}',        description: 'Date the certificate was issued',               source: 'Date of finalization',                   required: false },
  { key: '{{requestNumber}}',    description: 'Certificate request reference number',          source: 'CertificateRequest.requestNumber',       required: false },
  { key: '{{certificateTitle}}', description: 'Human-readable certificate type title',         source: 'Mapped from certificateType',            required: false },
  { key: '{{qrCodeUrl}}',        description: 'QR code image URL (reserved for future task)', source: 'System-generated',                       required: false },
  // ── Type-specific supplementary fields ────────────────────────────────────
  { key: '{{collegeName}}',      description: 'College / university name (Bonafide)',          source: 'CertificateRequest.metadata.collegeName',  required: false },
  { key: '{{purpose}}',          description: 'Purpose of the bonafide certificate',           source: 'CertificateRequest.metadata.purpose',      required: false },
  { key: '{{duration}}',         description: 'Internship duration (e.g. 3 Months)',           source: 'Calculated from startDate / endDate',      required: false },
  { key: '{{internshipRole}}',   description: 'Intern role or designation',                   source: 'CertificateRequest.metadata.internshipRole', required: false },
  { key: '{{stipend}}',          description: 'Monthly stipend amount',                       source: 'CertificateRequest.metadata.stipend',      required: false },
  { key: '{{reportingManager}}', description: 'Reporting manager name',                       source: 'CertificateRequest.metadata.reportingManager', required: false },
  { key: '{{mentorName}}',       description: 'Mentor name (OJT)',                            source: 'CertificateRequest.metadata.mentorName',   required: false },
  { key: '{{trainingProgram}}',  description: 'Training programme name (OJT)',                source: 'CertificateRequest.metadata.trainingProgram', required: false },
  { key: '{{awardMonth}}',       description: 'Month of award (Intern of the Month)',         source: 'CertificateRequest.metadata.awardMonth',   required: false },
  { key: '{{recognitionCriteria}}', description: 'Recognition criteria text',                 source: 'CertificateRequest.metadata.recognitionCriteria', required: false },
  { key: '{{eventName}}',        description: 'Event / competition name (League Winner)',     source: 'CertificateRequest.metadata.eventName',    required: false },
  { key: '{{position}}',         description: 'Winning position (League Winner)',             source: 'CertificateRequest.metadata.position',     required: false },
  { key: '{{eventDate}}',        description: 'Event date (League Winner)',                   source: 'CertificateRequest.metadata.eventDate',    required: false },
  { key: '{{place}}',            description: 'Event location (League Winner)',               source: 'CertificateRequest.metadata.place',        required: false },
  // ── Backward-compatible PascalCase aliases ────────────────────────────────
  { key: '{{InternName}}',       description: "Intern full name (PascalCase alias)",          source: 'User.fullName',                          required: false },
  { key: '{{CertificateNumber}}',description: 'System-generated certificate number',          source: 'System-generated',                       required: false },
  { key: '{{Department}}',       description: 'Department / domain (PascalCase alias)',       source: 'User.domain',                            required: false },
  { key: '{{StartDate}}',        description: 'Start date (PascalCase alias)',                source: 'User.startDate',                         required: false },
  { key: '{{EndDate}}',          description: 'End date (PascalCase alias)',                  source: 'User.endDate',                           required: false },
  { key: '{{IssueDate}}',        description: 'Issue date (PascalCase alias)',                source: 'Date of finalization',                   required: false },
  { key: '{{VerificationCode}}', description: 'Unique certificate verification code',        source: 'System-generated',                       required: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts all simple Handlebars placeholder tokens from HTML content.
 * Matches {{identifier}} but not block helpers like {{#if}}.
 */
const extractPlaceholders = (content) => {
  const matches = content.match(/\{\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g) || [];
  return [...new Set(matches)];
};

/**
 * Validates template HTML content against Task B rules:
 *  1. Must include {{fullName}} placeholder.
 *  2. Must compile without Handlebars syntax errors (catches unbalanced {{ }}).
 *
 * Throws an Error with a `statusCode` property on failure.
 */
const validateContent = (content) => {
  if (!content || !content.includes('{{fullName}}')) {
    const err = new Error(
      'Template HTML must contain the {{fullName}} placeholder (Task B requirement)'
    );
    err.statusCode = 400;
    throw err;
  }
  const openCount = (content.match(/\{\{/g) || []).length;
  const closeCount = (content.match(/\}\}/g) || []).length;
  if (openCount !== closeCount) {
    const err = new Error('Template has unbalanced {{ }} brackets');
    err.statusCode = 400;
    throw err;
  }
  try {
    Handlebars.precompile(content);
  } catch (hbsErr) {
    const err = new Error(
      `Template has invalid Handlebars syntax: ${hbsErr.message}`
    );
    err.statusCode = 400;
    throw err;
  }
};

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/admin/templates/placeholders
 *
 * Returns the canonical list of supported Handlebars placeholders so the
 * frontend placeholder panel does not need to hard-code them.
 */
export const getPlaceholders = (_req, res) => {
  return res.status(200).json({ success: true, placeholders: PLACEHOLDER_LIST, data: PLACEHOLDER_LIST });
};

/**
 * GET /api/admin/templates
 *
 * Lists all templates. Supports optional query filters:
 *   ?status=active|draft|inactive|archived
 *   ?certificateType=<type>
 *
 * The heavy `content` field is excluded from the list response to keep
 * payloads small; fetch a single template by ID to get the full HTML.
 */
export const getAllTemplates = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status)          filter.status          = req.query.status;
    if (req.query.certificateType) filter.certificateType = req.query.certificateType;

    const templates = await CertificateTemplate.find(filter)
      .select('-content')
      .populate('createdBy', 'fullName email')
      .sort({ certificateType: 1, createdAt: -1 });

    return res.status(200).json({ templates, total: templates.length });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/admin/templates/by-type/:certificateType
 *
 * Returns the single active template for a given certificateType.
 * Used by the visual editor to pre-load a template for editing.
 */
export const getTemplateByType = async (req, res) => {
  try {
    const { certificateType } = req.params;

    if (!ALLOWED_CERTIFICATE_TYPES.includes(certificateType)) {
      return res.status(400).json({
        message: `Invalid certificateType. Allowed values: ${ALLOWED_CERTIFICATE_TYPES.join(', ')}`
      });
    }

    const template = await CertificateTemplate.findOne({
      certificateType,
      status: 'active'
    }).populate('createdBy', 'fullName email');

    if (!template) {
      return res.status(404).json({
        message: `No active template found for certificateType: ${certificateType}`
      });
    }

    return res.status(200).json({ template });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/admin/templates/:id
 *
 * Returns a single template by MongoDB ObjectId, including the full
 * HTML content string.
 */
export const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid template ID format' });
    }

    const template = await CertificateTemplate.findById(id)
      .populate('createdBy', 'fullName email');

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    return res.status(200).json({ template });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * POST /api/admin/templates
 *
 * Creates a new certificate template.
 * Validates content for {{fullName}} and Handlebars correctness.
 * Auto-extracts placeholders from content.
 */
export const createTemplate = async (req, res) => {
  try {
    const {
      templateCode, templateName, certificateType,
      title, description, content, status,
      logoPath, backgroundPath, signaturePath
    } = req.body;

    // Deep content validation (validation middleware already checked {{fullName}};
    // this call also runs the Handlebars compile check).
    if (content) {
      try {
        validateContent(content);
      } catch (valErr) {
        return res.status(valErr.statusCode || 400).json({ message: valErr.message });
      }
    }

    // Guard against duplicate templateCode (unique index will also catch this,
    // but we return a clearer message here).
    const existing = await CertificateTemplate.findOne({ templateCode });
    if (existing) {
      return res.status(409).json({
        message: `A template with code '${templateCode}' already exists`
      });
    }

    const placeholders = content ? extractPlaceholders(content) : [];

    const template = await CertificateTemplate.create({
      templateCode,
      templateName,
      certificateType,
      title,
      description,
      content:      content || '',
      placeholders,
      status:       status || 'draft',
      logoPath,
      backgroundPath,
      signaturePath,
      createdBy:    req.user.id
    });

    await logAudit({
      userId:      req.user.id,
      action:      'CREATE_CERTIFICATE_TEMPLATE',
      entityType:  'CertificateTemplate',
      entityId:    template._id,
      description: { templateCode: template.templateCode, certificateType: template.certificateType },
      req
    });

    return res.status(201).json({ message: 'Template created successfully', template });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    if (err.code === 11000) return res.status(409).json({ message: 'Template code must be unique' });
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * PATCH /api/admin/templates/:id
 *
 * Updates an existing template's editable fields.
 * Archived templates are blocked from editing.
 * Updating `content` increments the version and re-extracts placeholders.
 */
export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid template ID format' });
    }

    const template = await CertificateTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (template.status === 'archived') {
      return res.status(409).json({
        message: 'Archived templates cannot be edited. Create a new version instead.'
      });
    }

    const {
      templateName, title, description, content,
      logoPath, backgroundPath, signaturePath
    } = req.body;

    // Validate new content if supplied
    if (content !== undefined) {
      try {
        validateContent(content);
      } catch (valErr) {
        return res.status(valErr.statusCode || 400).json({ message: valErr.message });
      }
    }

    const changes = {};

    if (templateName !== undefined) {
      changes.templateName = { from: template.templateName, to: templateName };
      template.templateName = templateName;
    }
    if (title !== undefined) {
      changes.title = { from: template.title, to: title };
      template.title = title;
    }
    if (description !== undefined) {
      changes.description = { updated: true };
      template.description = description;
    }
    if (content !== undefined) {
      changes.content = { version: (template.version || 1) + 1 };
      template.content      = content;
      template.placeholders = extractPlaceholders(content);
      template.version      = (template.version || 1) + 1;
    }
    if (logoPath      !== undefined) template.logoPath      = logoPath;
    if (backgroundPath !== undefined) template.backgroundPath = backgroundPath;
    if (signaturePath !== undefined) template.signaturePath = signaturePath;

    await template.save();

    await logAudit({
      userId:      req.user.id,
      action:      'UPDATE_CERTIFICATE_TEMPLATE',
      entityType:  'CertificateTemplate',
      entityId:    template._id,
      description: changes,
      req
    });

    return res.status(200).json({ message: 'Template updated successfully', template });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * PATCH /api/admin/templates/:id/activate
 *
 * Sets a template's status to 'active'.
 * Any other active template for the same certificateType is set to 'inactive'
 * so the PDF generator always finds exactly one active template per type.
 */
export const activateTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid template ID format' });
    }

    const template = await CertificateTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (template.status === 'archived') {
      return res.status(409).json({
        message: 'Archived templates cannot be activated. Create a new version instead.'
      });
    }

    if (!template.content || !template.content.trim()) {
      return res.status(400).json({
        message: 'Cannot activate a template with empty content'
      });
    }

    // Re-validate before activating (content might have been set before validation rules existed)
    try {
      validateContent(template.content);
    } catch (valErr) {
      return res.status(400).json({
        message: `Cannot activate: ${valErr.message}`
      });
    }

    // Deactivate any currently-active sibling templates for this type.
    // They become 'inactive' (not 'draft') to preserve the published/unpublished distinction.
    await CertificateTemplate.updateMany(
      {
        certificateType: template.certificateType,
        status:          'active',
        _id:             { $ne: template._id }
      },
      { status: 'inactive' }
    );

    template.status = 'active';
    await template.save();

    await logAudit({
      userId:      req.user.id,
      action:      'ACTIVATE_CERTIFICATE_TEMPLATE',
      entityType:  'CertificateTemplate',
      entityId:    template._id,
      description: {
        certificateType: template.certificateType,
        templateCode:    template.templateCode
      },
      req
    });

    return res.status(200).json({ message: 'Template activated successfully', template });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * DELETE /api/admin/templates/:id
 *
 * Soft-deletes a template by setting its status to 'archived'.
 * No records are removed from the database.
 * A warning is included in the response when archiving the last active
 * template for a certificateType, because new requests for that type will
 * fail until a replacement is activated.
 */
export const archiveTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid template ID format' });
    }

    const template = await CertificateTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (template.status === 'archived') {
      return res.status(409).json({ message: 'Template is already archived' });
    }

    // Check whether archiving leaves the type without an active template
    let warning = null;
    if (template.status === 'active') {
      const otherActive = await CertificateTemplate.findOne({
        certificateType: template.certificateType,
        status:          'active',
        _id:             { $ne: template._id }
      });
      if (!otherActive) {
        warning =
          `No active template will remain for certificateType '${template.certificateType}'. ` +
          'New certificate requests of this type will fail until a replacement is activated.';
      }
    }

    template.status = 'archived';
    await template.save();

    await logAudit({
      userId:      req.user.id,
      action:      'ARCHIVE_CERTIFICATE_TEMPLATE',
      entityType:  'CertificateTemplate',
      entityId:    template._id,
      description: {
        templateCode:    template.templateCode,
        certificateType: template.certificateType,
        warning
      },
      req
    });

    const payload = { message: 'Template archived successfully', template };
    if (warning) payload.warning = warning;
    return res.status(200).json(payload);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
