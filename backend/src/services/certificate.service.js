<<<<<<< HEAD
import Handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import CertificateTemplate from '../models/CertificateTemplate.model.js';
import Certificate from '../models/Certificate.model.js';
import CertificateRequest from '../models/CertificateRequest.js';
import '../models/User.js'; // Ensures the User model schema is registered in Mongoose

export async function createCertificateDraft(requestId) {
  const request = await CertificateRequest.findById(requestId).populate('internId');
  
  if (!request) throw new Error('Request not found');
  if (!request.internId) throw new Error('Associated intern user not found');

  console.log("POPULATED INTERN OBJECT:", request.internId);

  const template = await CertificateTemplate.findOne({ 
    certificateType: request.type, 
    isActive: true 
  });

  if (!template) {
    throw new Error(`No active certificate template found for type: ${request.type}`);
  }

  const templateDelegate = Handlebars.compile(template.htmlContent);
  const mergedHtml = templateDelegate({ 
    internId: request.internId, 
    request 
  });

  const certificate = await Certificate.create({
    request: request._id,
    user: request.internId._id,
    template: template._id,
    htmlContent: mergedHtml,
    status: 'draft'
  });

  return certificate;
}

export async function finalizeCertificate(certificateId) {
  const certificate = await Certificate.findById(certificateId);
  if (!certificate) throw new Error('Certificate not found');

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(certificate.htmlContent, { waitUntil: 'networkidle0' });
  
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();

  const fileUrl = `/uploads/certificates/${certificateId}.pdf`; 

  certificate.status = 'completed';
  certificate.fileUrl = fileUrl;
  await certificate.save();

  await CertificateRequest.findByIdAndUpdate(certificate.requestId, { status: 'completed' });

  return { certificate, pdfBuffer };
}
=======
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import Certificate from '../models/Certificate.js';
import CertificateRequest from '../models/CertificateRequest.js';
import CertificateTemplate from '../models/CertificateTemplate.js';
import { sendEmail } from '../utils/sendEmail.js';

const generateCertificateNumber = async () => {
  const year = new Date().getFullYear();
  let count = await Certificate.countDocuments();
  let candidate = `CERT-${year}-${String(count + 1).padStart(5, '0')}`;
  while (await Certificate.exists({ certificateNumber: candidate })) {
    count += 1;
    candidate = `CERT-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  return candidate;
};

const generateVerificationCode = () => {
  return `VER-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

/**
 * Creates a certificate draft for an approved CertificateRequest.
 * Enforces duplicate draft protection and uses the matching active CertificateTemplate.
 *
 * @param {string|mongoose.Types.ObjectId} requestId
 * @returns {Promise<Certificate>}
 */
export const createCertificateDraft = async (requestId) => {
  const request = await CertificateRequest.findById(requestId).populate('userId');
  if (!request) {
    const error = new Error('Certificate request not found');
    error.statusCode = 404;
    throw error;
  }

  // Duplicate draft protection: return existing certificate if one was already linked
  if (request.certificateId) {
    const existingCert = await Certificate.findById(request.certificateId);
    if (existingCert) {
      return existingCert;
    }
  }

  const user = request.userId;
  if (!user) {
    const error = new Error('Associated intern not found for this request');
    error.statusCode = 404;
    throw error;
  }

  // Must use the matching active CertificateTemplate (no fallback template)
  const normalizedType = request.certificateType === 'internship_completion_certificate'
    ? 'completion_certificate'
    : request.certificateType;

  const template = await CertificateTemplate.findOne({
    certificateType: { $in: [request.certificateType, normalizedType] },
    status: 'active'
  });

  if (!template) {
    const error = new Error(`No active certificate template found for type: ${request.certificateType}`);
    error.statusCode = 404;
    throw error;
  }

  if (!template.content) {
    const error = new Error(`Certificate template for type '${request.certificateType}' does not contain content`);
    error.statusCode = 400;
    throw error;
  }

  const certificateNumber = await generateCertificateNumber();
  const verificationCode = generateVerificationCode();

  const formattedCertType = (request.certificateType || '').replace(/_/g, ' ');

  // Extract custom request metadata safely if available
  const rawMeta = request.metadata instanceof Map
    ? Object.fromEntries(request.metadata)
    : (request.metadata || {});

  let durationStr = '';
  if (user.startDate && user.endDate) {
    const s = new Date(user.startDate);
    const e = new Date(user.endDate);
    const diffMonths = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24 * 30.4375)));
    durationStr = `${diffMonths} Month${diffMonths > 1 ? 's' : ''}`;
  }

  // Sanitize and support certificate-specific metadata
  const safeMeta = {};
  for (const [key, value] of Object.entries(rawMeta)) {
    if (typeof value === 'string' && value.trim()) {
      safeMeta[key] = value.trim();
      const pascal = key.charAt(0).toUpperCase() + key.slice(1);
      const camel = key.charAt(0).toLowerCase() + key.slice(1);
      safeMeta[pascal] = value.trim();
      safeMeta[camel] = value.trim();
    }
  }

  // Supplementary fields with safe defaults
  const supplementaryData = {
    // Bonafide
    CollegeName: safeMeta.CollegeName || safeMeta.collegeName || '',
    collegeName: safeMeta.CollegeName || safeMeta.collegeName || '',
    Purpose: safeMeta.Purpose || safeMeta.purpose || 'Academic Requirement',
    purpose: safeMeta.Purpose || safeMeta.purpose || 'Academic Requirement',
    InternshipTitle: safeMeta.InternshipTitle || safeMeta.internshipTitle || (user.domain ? `${user.domain} Intern` : 'Intern'),
    internshipTitle: safeMeta.InternshipTitle || safeMeta.internshipTitle || (user.domain ? `${user.domain} Intern` : 'Intern'),
    Duration: safeMeta.Duration || safeMeta.duration || durationStr,
    duration: safeMeta.Duration || safeMeta.duration || durationStr,
    OrganizationName: 'UptoSkills',
    organizationName: 'UptoSkills',
    Organization: 'UptoSkills',
    organization: 'UptoSkills',

    // Offer Letter
    InternshipRole: safeMeta.InternshipRole || safeMeta.internshipRole || (user.domain ? `${user.domain} Intern` : 'Intern'),
    internshipRole: safeMeta.InternshipRole || safeMeta.internshipRole || (user.domain ? `${user.domain} Intern` : 'Intern'),
    Stipend: safeMeta.Stipend || safeMeta.stipend || '',
    stipend: safeMeta.Stipend || safeMeta.stipend || '',
    ReportingManager: safeMeta.ReportingManager || safeMeta.reportingManager || '',
    reportingManager: safeMeta.ReportingManager || safeMeta.reportingManager || '',
    ManagerName: safeMeta.ManagerName || safeMeta.managerName || safeMeta.ReportingManager || safeMeta.reportingManager || '',
    managerName: safeMeta.ManagerName || safeMeta.managerName || safeMeta.ReportingManager || safeMeta.reportingManager || '',
    JoiningDate: safeMeta.JoiningDate || safeMeta.joiningDate || formatDate(user.startDate),
    joiningDate: safeMeta.JoiningDate || safeMeta.joiningDate || formatDate(user.startDate),
    JoiningGuidelines: safeMeta.JoiningGuidelines || safeMeta.joiningGuidelines || '',
    joiningGuidelines: safeMeta.JoiningGuidelines || safeMeta.joiningGuidelines || '',
    HRName: safeMeta.HRName || safeMeta.hrName || 'HR Team',
    hrName: safeMeta.HRName || safeMeta.hrName || 'HR Team',

    // OJT
    TrainingProgram: safeMeta.TrainingProgram || safeMeta.trainingProgram || (user.domain ? `${user.domain} Training Program` : 'On-the-Job Training Program'),
    trainingProgram: safeMeta.TrainingProgram || safeMeta.trainingProgram || (user.domain ? `${user.domain} Training Program` : 'On-the-Job Training Program'),
    TrainingStartDate: safeMeta.TrainingStartDate || safeMeta.trainingStartDate || formatDate(user.startDate),
    trainingStartDate: safeMeta.TrainingStartDate || safeMeta.trainingStartDate || formatDate(user.startDate),
    TrainingEndDate: safeMeta.TrainingEndDate || safeMeta.trainingEndDate || formatDate(user.endDate),
    trainingEndDate: safeMeta.TrainingEndDate || safeMeta.trainingEndDate || formatDate(user.endDate),
    MentorName: safeMeta.MentorName || safeMeta.mentorName || '',
    mentorName: safeMeta.MentorName || safeMeta.mentorName || '',
    PerformanceDetails: safeMeta.PerformanceDetails || safeMeta.performanceDetails || '',
    performanceDetails: safeMeta.PerformanceDetails || safeMeta.performanceDetails || '',

    // Intern of the Month
    AwardMonth: safeMeta.AwardMonth || safeMeta.awardMonth || '',
    awardMonth: safeMeta.AwardMonth || safeMeta.awardMonth || '',
    RecognitionCriteria: safeMeta.RecognitionCriteria || safeMeta.recognitionCriteria || '',
    recognitionCriteria: safeMeta.RecognitionCriteria || safeMeta.recognitionCriteria || '',

    // League Winner
    WinnerName: user.fullName || '',
    winnerName: user.fullName || '',
    EventName: safeMeta.EventName || safeMeta.eventName || '',
    eventName: safeMeta.EventName || safeMeta.eventName || '',
    Position: safeMeta.Position || safeMeta.position || '',
    position: safeMeta.Position || safeMeta.position || '',
    EventDate: safeMeta.EventDate || safeMeta.eventDate || formatDate(new Date()),
    eventDate: safeMeta.EventDate || safeMeta.eventDate || formatDate(new Date()),
    Place: safeMeta.Place || safeMeta.place || 'New Delhi',
    place: safeMeta.Place || safeMeta.place || 'New Delhi',

    ...safeMeta
  };

  // Protected trusted core fields — cannot be overridden by request metadata
  const trustedCoreData = {
    InternName: user.fullName || '',
    internName: user.fullName || '',
    fullName: user.fullName || '',
    name: user.fullName || '',
    CertificateNumber: certificateNumber,
    certificateNumber: certificateNumber,
    Department: user.domain || '',
    department: user.domain || '',
    domain: user.domain || '',
    StartDate: formatDate(user.startDate),
    startDate: formatDate(user.startDate),
    EndDate: formatDate(user.endDate),
    endDate: formatDate(user.endDate),
    IssueDate: formatDate(new Date()),
    issueDate: formatDate(new Date()),
    InternCode: user.internCode || '',
    internCode: user.internCode || '',
    CertificateType: formattedCertType,
    certificateType: formattedCertType,
    rawCertificateType: request.certificateType || '',
    VerificationCode: verificationCode,
    verificationCode: verificationCode
  };

  const templateData = {
    ...supplementaryData,
    ...trustedCoreData
  };

  const compiledTemplate = Handlebars.compile(template.content);
  const htmlContent = compiledTemplate(templateData);

  const certificate = await Certificate.create({
    certificateNumber,
    userId: user._id,
    internCode: user.internCode,
    templateId: template._id,
    certificateType: request.certificateType,
    domain: user.domain,
    startDate: user.startDate,
    endDate: user.endDate,
    issuedDate: new Date(),
    status: 'draft',
    htmlContent,
    verificationCode,
    generatedBy: request.reviewedBy
  });

  request.certificateId = certificate._id;
  await request.save();

  return certificate;
};

/**
 * Fetches a Certificate draft by its Certificate ID.
 *
 * @param {string} id - Certificate ID
 * @returns {Promise<Certificate>}
 */
export const getCertificateDraft = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error('Invalid certificate ID');
    error.statusCode = 400;
    throw error;
  }

  const certificate = await Certificate.findById(id).populate('userId', 'fullName email internCode domain');
  if (!certificate) {
    const error = new Error('Certificate draft not found');
    error.statusCode = 404;
    throw error;
  }

  return certificate;
};

/**
 * Updates the htmlContent of a draft Certificate.
 * Only allows editing if certificate.status is 'draft'.
 *
 * @param {string} id - Certificate ID
 * @param {string} htmlContent - Updated HTML string
 * @returns {Promise<Certificate>}
 */
export const updateCertificateDraft = async (id, htmlContent) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error('Invalid certificate ID');
    error.statusCode = 400;
    throw error;
  }

  if (typeof htmlContent !== 'string' || !htmlContent.trim()) {
    const error = new Error('htmlContent is required');
    error.statusCode = 400;
    throw error;
  }

  const certificate = await Certificate.findById(id);
  if (!certificate) {
    const error = new Error('Certificate draft not found');
    error.statusCode = 404;
    throw error;
  }

  if (certificate.status !== 'draft') {
    const error = new Error('Only draft certificates can be edited');
    error.statusCode = 400;
    throw error;
  }

  certificate.htmlContent = htmlContent;
  await certificate.save();

  return certificate;
};

/**
 * Renders HTML to a high-quality PDF buffer using Puppeteer.
 * Guarantees browser closure in a finally block.
 *
 * @param {string} htmlContent - Full HTML markup to render
 * @returns {Promise<Buffer>}
 */
export const renderCertificatePdf = async (htmlContent) => {
  if (!htmlContent || typeof htmlContent !== 'string' || !htmlContent.trim()) {
    const error = new Error('Certificate htmlContent is required for PDF rendering');
    error.statusCode = 400;
    throw error;
  }

  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, {
      waitUntil: ['load', 'networkidle0']
    });

    const pdfBytes = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });

    return Buffer.from(pdfBytes);
  } catch (err) {
    const error = new Error(`PDF rendering failed: ${err.message}`);
    error.statusCode = 500;
    throw error;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Safe disposal
      }
    }
  }
};

/**
 * Finalizes a Certificate draft:
 * 1. Validates status is draft and htmlContent exists
 * 2. Renders PDF with Puppeteer
 * 3. Persists PDF to local storage
 * 4. Sets Certificate.status = "finalized"
 * 5. Updates linked CertificateRequest.status = "completed"
 *
 * @param {string} certificateId
 * @returns {Promise<{certificate: Certificate, request: CertificateRequest, absolutePdfPath: string, fileName: string}>}
 */
export const finalizeCertificate = async (certificateId) => {
  if (!mongoose.Types.ObjectId.isValid(certificateId)) {
    const error = new Error('Invalid certificate ID');
    error.statusCode = 400;
    throw error;
  }

  const certificate = await Certificate.findById(certificateId).populate('userId', 'fullName email internCode domain');
  if (!certificate) {
    const error = new Error('Certificate not found');
    error.statusCode = 404;
    throw error;
  }

  if (certificate.status !== 'draft') {
    const error = new Error(`Cannot finalize certificate with status '${certificate.status}'. Only draft certificates can be finalized.`);
    error.statusCode = 409;
    throw error;
  }

  if (!certificate.htmlContent || !certificate.htmlContent.trim()) {
    const error = new Error('Certificate htmlContent is missing or empty');
    error.statusCode = 400;
    throw error;
  }

  // 1. Render PDF using Puppeteer
  const pdfBuffer = await renderCertificatePdf(certificate.htmlContent);

  // 2. Persist to storage (backend/uploads/certificates)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const uploadDir = path.resolve(__dirname, '../../uploads/certificates');
  fs.mkdirSync(uploadDir, { recursive: true });

  const sanitizedNum = certificate.certificateNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${sanitizedNum}.pdf`;
  const absolutePdfPath = path.join(uploadDir, fileName);
  const relativePdfPath = `uploads/certificates/${fileName}`;

  try {
    fs.writeFileSync(absolutePdfPath, pdfBuffer);
  } catch (fsErr) {
    const error = new Error(`Failed to persist certificate PDF: ${fsErr.message}`);
    error.statusCode = 500;
    throw error;
  }

  // 3. Mark Certificate as finalized and save pdfPath
  certificate.status = 'finalized';
  certificate.pdfPath = relativePdfPath;
  await certificate.save();

  // 4. Update linked CertificateRequest to completed
  const request = await CertificateRequest.findOne({ certificateId: certificate._id });
  if (request) {
    request.status = 'completed';
    await request.save();
  }

  return {
    certificate,
    request,
    absolutePdfPath,
    fileName
  };
};

/**
 * Sends the finalized certificate PDF as an email attachment to the intern.
 *
 * @param {Object} params
 * @param {Certificate} params.certificate
 * @param {string} params.absolutePdfPath
 * @param {User} params.user
 */
export const sendCertificateEmail = async ({ certificate, absolutePdfPath, user }) => {
  const recipientEmail = user?.email;
  if (!recipientEmail) {
    throw new Error('Associated intern email address not found on user record');
  }

  const certificateTypeFormatted = (certificate.certificateType || 'Internship').replace(/_/g, ' ');
  const subject = `Your ${certificateTypeFormatted} Certificate - UPTOSKILL (${certificate.certificateNumber})`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      <h2 style="color: #2563eb;">Congratulations, ${user.fullName || 'Intern'}!</h2>
      <p>We are pleased to inform you that your <strong>${certificateTypeFormatted}</strong> certificate has been officially reviewed and finalized.</p>
      <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 4px 0;"><strong>Certificate Number:</strong> ${certificate.certificateNumber}</p>
        <p style="margin: 4px 0;"><strong>Verification Code:</strong> ${certificate.verificationCode}</p>
        <p style="margin: 4px 0;"><strong>Issue Date:</strong> ${new Date(certificate.issuedDate || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <p>Your official digital certificate is attached to this email as a PDF document.</p>
      <p style="margin-top: 30px; font-size: 13px; color: #6b7280;">Best regards,<br/><strong>UPTOSKILL Certificate Desk</strong></p>
    </div>
  `;

  const fileName = `${certificate.certificateNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

  return sendEmail({
    to: recipientEmail,
    subject,
    html,
    attachments: [
      {
        filename: fileName,
        path: absolutePdfPath
      }
    ]
  });
};
>>>>>>> origin/main
