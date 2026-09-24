import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Handlebars from 'handlebars';

Handlebars.registerHelper('json', (value) => JSON.stringify(value ?? ''));
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

const formatDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return '';

  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  const anchor = new Date(start);
  anchor.setMonth(anchor.getMonth() + Math.max(months, 0));
  const days = Math.max(0, Math.round((end - anchor) / 86400000));

  if (months > 0 && days > 0) return `${months} Months ${days} Days`;
  if (months > 0) return months === 1 ? '1 Month' : `${months} Months`;
  return days === 1 ? '1 Day' : `${days} Days`;
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
  const template = await CertificateTemplate.findOne({
    certificateType: request.certificateType,
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

  const issueDate = new Date();
  const startDate = formatDate(user.startDate);
  const endDate = formatDate(user.endDate);
  const duration = formatDuration(user.startDate, user.endDate);
  const domain = user.domain || '';
  const teamLeader = user.internshipDetails?.teamleaderEmail || '';
  const organizationName = 'UptoSkills';
  const position = domain ? `${domain} Intern` : 'Intern';
  const verificationURL = `https://uptoskills.com/verify/${encodeURIComponent(verificationCode)}`;
  const templateData = {
    InternName: user.fullName || '',
    internName: user.fullName || '',
    fullName: user.fullName || '',
    name: user.fullName || '',
    CertificateNumber: certificateNumber,
    certificateNumber: certificateNumber,
    OfferNumber: certificateNumber,
    ReferenceID: certificateNumber,
    Department: domain,
    DepartmentName: domain,
    department: domain,
    domain,
    Domain: domain,
    ProgramName: domain,
    AcademicYear: user.startDate && user.endDate ? `${new Date(user.startDate).getFullYear()}-${new Date(user.endDate).getFullYear()}` : '',
    Purpose: 'Internship / Academic Purpose',
    Position: position,
    InternPosition: position,
    startDate,
    StartDate: startDate,
    endDate,
    EndDate: endDate,
    Duration: duration,
    duration,
    IssueDate: formatDate(issueDate),
    issueDate: formatDate(issueDate),
    InternCode: user.internCode || '',
    internCode: user.internCode || '',
    CertificateType: formattedCertType,
    certificateType: formattedCertType,
    rawCertificateType: request.certificateType || '',
    VerificationCode: verificationCode,
    verificationCode: verificationCode,
    VerificationURL: verificationURL,
    OrganizationName: organizationName,
    organizationName,
    Place: '',
    place: '',
    MentorName: '',
    mentorName: '',
    HRName: '',
    hrName: '',
    HRSignature: '',
    hrSignature: '',
    ManagerName: teamLeader,
    ReportingManager: teamLeader,
    reportingManager: teamLeader,
    WorkMode: '',
    Mode: '',
    Location: '',
    Stipend: '',
    AuthorizedName: '',
    AuthorizedPersonName: '',
    AuthorizedPerson: '',
    AuthorizedPosition: '',
    Designation: '',
    AuthorizedSignature: '',
    CompanyEmail: '',
    CompanyPhone: '',
    CompanyWebsite: 'uptoskills.com',
    CompanyAddress: '',
    LeagueName: '',
    Organizer: organizationName,
    Month: issueDate.toLocaleDateString('en-US', { month: 'long' }),
    Year: String(issueDate.getFullYear()),
    signatureOrganization: organizationName,
    termsOrganization: organizationName,
    closingOrganization: organizationName
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
