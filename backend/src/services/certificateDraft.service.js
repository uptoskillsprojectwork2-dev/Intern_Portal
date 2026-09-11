import mongoose from 'mongoose';
import Handlebars from 'handlebars';
import Certificate from '../models/Certificate.js';
import CertificateTemplate from '../models/CertificateTemplate.js';
import User from '../models/User.js';

/**
 * Format a Date object into human-readable string: e.g. "January 15, 2026".
 * Returns empty string if date is null/undefined.
 */
export const formatDisplayDate = (date) => {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Generates a unique certificate number using the current year and sequence count.
 */
export const generateCertificateNumber = async () => {
  const currentYear = new Date().getFullYear();
  const certCount = await Certificate.countDocuments();
  const sequence = String(certCount + 1).padStart(5, '0');
  return `CERT-${currentYear}-${sequence}`;
};

/**
 * Generates a secure verification code.
 */
export const generateVerificationCode = () => {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timePart = Date.now().toString(36).toUpperCase();
  return `VER-${timePart}-${randomPart}`;
};

/**
 * Generates a Certificate draft for an approved CertificateRequest.
 * Enforces duplicate protection and compiles HTML using active CertificateTemplate.
 *
 * @param {Object} request - CertificateRequest document
 * @param {string|mongoose.Types.ObjectId} adminId - Reviewing admin user ID
 * @returns {Promise<Certificate>} - Generated or existing Certificate draft
 */
export const generateDraftForRequest = async (request, adminId) => {
  if (!request) {
    const err = new Error('Certificate request is required');
    err.statusCode = 400;
    throw err;
  }

  // Duplicate protection: return existing certificate if one is already associated
  if (request.certificateId) {
    const existing = await Certificate.findById(request.certificateId);
    if (existing) {
      return existing;
    }
  }

  // Load intern/user document
  let intern = request.userId;
  if (!intern || !intern.fullName) {
    intern = await User.findById(request.userId);
  }
  if (!intern) {
    const err = new Error('Intern account linked to this certificate request was not found');
    err.statusCode = 404;
    throw err;
  }

  // Locate the active template
  let template = null;
  if (request.templateId) {
    template = await CertificateTemplate.findOne({
      _id: request.templateId,
      status: 'active'
    });
  } else {
    template = await CertificateTemplate.findOne({
      certificateType: request.certificateType,
      status: 'active'
    });
  }

  if (!template) {
    const err = new Error(`No active certificate template found for type: ${request.certificateType}`);
    err.statusCode = 404;
    throw err;
  }

  if (!template.content || !template.content.trim()) {
    const err = new Error(`Template '${template.templateName || request.certificateType}' contains no HTML content`);
    err.statusCode = 400;
    throw err;
  }

  const certificateNumber = await generateCertificateNumber();
  const verificationCode = generateVerificationCode();

  // Populate placeholders with real values (supporting both PascalCase and camelCase)
  const internName = (intern.fullName || '').trim();
  const internCode = (intern.internCode || request.internCode || '').trim();
  const department = (intern.domain || '').trim();
  const certTypeStr = request.certificateType ? request.certificateType.replace(/_/g, ' ') : '';
  const startDateStr = formatDisplayDate(intern.startDate);
  const endDateStr = formatDisplayDate(intern.endDate);
  const issueDateStr = formatDisplayDate(new Date());

  const templatePayload = {
    InternName: internName,
    internName: internName,
    CertificateNumber: certificateNumber,
    certificateNumber: certificateNumber,
    Department: department,
    department: department,
    StartDate: startDateStr,
    startDate: startDateStr,
    EndDate: endDateStr,
    endDate: endDateStr,
    IssueDate: issueDateStr,
    issueDate: issueDateStr,
    InternCode: internCode,
    internCode: internCode,
    CertificateType: certTypeStr,
    certificateType: certTypeStr,
    VerificationCode: verificationCode,
    verificationCode: verificationCode
  };

  const renderTemplate = Handlebars.compile(template.content);
  const htmlContent = renderTemplate(templatePayload);

  // Persist the certificate with draft status
  const certificateDraft = await Certificate.create({
    certificateNumber,
    userId: intern._id,
    internCode: intern.internCode || request.internCode,
    templateId: template._id,
    certificateType: request.certificateType,
    domain: intern.domain || '',
    startDate: intern.startDate,
    endDate: intern.endDate,
    issuedDate: new Date(),
    status: 'draft',
    htmlContent,
    verificationCode,
    generatedBy: adminId
  });

  // Link generated certificate to request
  request.certificateId = certificateDraft._id;
  await request.save();

  return certificateDraft;
};

/**
 * Retrieves a Certificate draft by its Certificate ID.
 *
 * @param {string} certificateId
 * @returns {Promise<Certificate>}
 */
export const getDraftCertificateById = async (certificateId) => {
  if (!mongoose.Types.ObjectId.isValid(certificateId)) {
    const err = new Error('Invalid certificate ID format');
    err.statusCode = 400;
    throw err;
  }

  const draft = await Certificate.findById(certificateId)
    .populate('userId', 'fullName email internCode domain startDate endDate')
    .populate('templateId', 'templateName templateCode certificateType');

  if (!draft) {
    const err = new Error('Certificate draft not found');
    err.statusCode = 404;
    throw err;
  }

  return draft;
};

/**
 * Updates the HTML content of a draft Certificate.
 * Only allows modification while status is 'draft'.
 *
 * @param {string} certificateId
 * @param {string} updatedHtml
 * @returns {Promise<Certificate>}
 */
export const updateDraftHtmlContent = async (certificateId, updatedHtml) => {
  if (!mongoose.Types.ObjectId.isValid(certificateId)) {
    const err = new Error('Invalid certificate ID format');
    err.statusCode = 400;
    throw err;
  }

  if (typeof updatedHtml !== 'string' || !updatedHtml.trim()) {
    const err = new Error('HTML content must be a non-empty string');
    err.statusCode = 400;
    throw err;
  }

  const cert = await Certificate.findById(certificateId);
  if (!cert) {
    const err = new Error('Certificate draft not found');
    err.statusCode = 404;
    throw err;
  }

  if (cert.status !== 'draft') {
    const err = new Error(`Cannot edit certificate: status is '${cert.status}', only 'draft' is editable`);
    err.statusCode = 409;
    throw err;
  }

  cert.htmlContent = updatedHtml;
  await cert.save();

  return cert;
};
