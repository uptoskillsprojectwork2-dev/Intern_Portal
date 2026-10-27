import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import QRCode from 'qrcode';

import Certificate from '../models/Certificate.js';
import CertificateRequest from '../models/CertificateRequest.js';
import CertificateTemplate from '../models/CertificateTemplate.js';
import { sendEmail } from '../utils/sendEmail.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================================================
   CONSTANTS
========================================================= */

export const getVerificationUrl = (verificationId) => {
  const frontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173');
  if (!frontendUrl) throw new Error('FRONTEND_URL must be set to the deployed frontend origin in production.');

  const configuredUrl = new URL(frontendUrl);
  if (process.env.NODE_ENV === 'production' && configuredUrl.protocol !== 'https:') {
    throw new Error('FRONTEND_URL must use HTTPS in production.');
  }

  return `${configuredUrl.origin}/verify/${encodeURIComponent(verificationId)}`;
};

/* =========================================================
   CERTIFICATE TITLE MAPPER
========================================================= */

const CERTIFICATE_TITLE_MAP = {
  offer_letter: 'Offer Letter',
  bonafide: 'Bonafide Certificate',
  bonafide_certificate: 'Bonafide Certificate',
  ojt_certificate: 'On-the-Job Training Certificate',
  experience_letter: 'Experience Certificate',
  experience_letter1: 'Experience Certificate',
  experience_letter2: 'Experience Certificate',
  completion_certificate: 'Internship Completion Certificate',
  internship_completion_certificate: 'Internship Completion Certificate',
  intern_of_month: 'Intern of the Month',
  league_winner: 'League Winner Certificate',
  custom: 'Certificate',
};

/**
 * Converts certificateType into the official certificate title.
 */
const getCertificateTitle = (certificateType) => {
  if (!certificateType) {
    return 'Certificate';
  }

  return (
    CERTIFICATE_TITLE_MAP[certificateType] ||
    certificateType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
};

/* =========================================================
   CERTIFICATE NUMBER
========================================================= */

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

/* =========================================================
   VERIFICATION CODE
========================================================= */

const generateVerificationCode = () => {
  return `VER-${randomBytes(16).toString('hex').toUpperCase()}`;
};

const generateVerifyId = () => {
  return `VERIFY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};

const generateQrDataUrl = async (certificateNumber, verificationCode) => {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify?certificateNumber=${encodeURIComponent(certificateNumber)}&verificationCode=${encodeURIComponent(verificationCode)}`;
  const seed = Array.from(verifyUrl).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const squares = [];

  for (let row = 0; row < 25; row += 1) {
    for (let col = 0; col < 25; col += 1) {
      const isFinder = (row < 7 && col < 7) || (row < 7 && col > 17) || (row > 17 && col < 7);
      const pattern = (row * 17 + col * 13 + seed) % 7;
      const filled = isFinder ? (row === 0 || col === 0 || row === 6 || col === 6 || (row > 1 && row < 5 && col > 1 && col < 5)) : (pattern === 0 || pattern === 1 || pattern === 3);
      squares.push(filled ? '1' : '0');
    }
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 25 25" shape-rendering="crispEdges">
      <rect width="25" height="25" fill="#ffffff"/>
      ${squares.map((cell, index) => {
        const row = Math.floor(index / 25);
        const col = index % 25;
        if (cell === '1') {
          return `<rect x="${col}" y="${row}" width="1" height="1" fill="#111827"/>`;
        }
        return '';
      }).join('')}
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const formatDate = (date) => {
  if (!date) {
    return '';
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return parsedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/* =========================================================
   QR CODE GENERATOR
========================================================= */

/**
 * Generates an actual QR code image as a data URL.
 *
 * Example output:
 * data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...
 */
const generateQrCode = async (verificationId) => {
  const verificationUrl = getVerificationUrl(verificationId);

  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 180,
    margin: 2,
  });

  return {
    qrCodeDataUrl,
    verificationUrl,
  };
};

/* =========================================================
   HANDLEBARS HELPERS
========================================================= */

Handlebars.registerHelper('formatDate', (date) => {
  return formatDate(date);
});

/* =========================================================
   PUPPETEER BROWSER
========================================================= */

let browserInstance = null;

/**
 * Reuses one Puppeteer browser instead of launching a new
 * browser for every certificate.
 */
const getBrowser = async () => {
  if (browserInstance) {
    try {
      if (browserInstance.connected) {
        return browserInstance;
      }
    } catch {
      browserInstance = null;
    }
  }

  browserInstance = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  return browserInstance;
};

/* =========================================================
   CREATE CERTIFICATE DRAFT
========================================================= */

/**
 * Creates a certificate draft for an approved CertificateRequest.
 *
 * Important:
 * - Uses active CertificateTemplate
 * - Generates actual QR code
 * - Provides all trusted placeholders
 * - Supports htmlContent and legacy content
 * - Protects trusted fields from metadata overrides
 *
 * @param {string|mongoose.Types.ObjectId} requestId
 * @returns {Promise<Certificate>}
 */
export const createCertificateDraft = async (requestId) => {
  const request = await CertificateRequest.findById(requestId).populate(
    'userId'
  );

  if (!request) {
    const error = new Error('Certificate request not found');
    error.statusCode = 404;
    throw error;
  }

  /* ---------------------------------------------------------
     Duplicate draft protection
  --------------------------------------------------------- */

  if (request.certificateId) {
    const existingCertificate = await Certificate.findById(
      request.certificateId
    );

    if (existingCertificate) {
      return existingCertificate;
    }
  }

  /* ---------------------------------------------------------
     User
  --------------------------------------------------------- */

  const user = request.userId;

  if (!user) {
    const error = new Error(
      'Associated intern not found for this request'
    );

    error.statusCode = 404;

    throw error;
  }

  /* ---------------------------------------------------------
     Normalize certificate type
  --------------------------------------------------------- */

  const normalizedType =
    request.certificateType ===
    'internship_completion_certificate'
      ? 'completion_certificate'
      : request.certificateType;

  /* ---------------------------------------------------------
     Find active template
  --------------------------------------------------------- */

  const template = await CertificateTemplate.findOne({
    certificateType: {
      $in: [request.certificateType, normalizedType],
    },
    status: 'active',
  });

  if (!template) {
    const error = new Error(
      `No active certificate template found for type: ${request.certificateType}`
    );

    error.statusCode = 404;

    throw error;
  }

  /* ---------------------------------------------------------
     Support both htmlContent and content
  --------------------------------------------------------- */

  const templateHtml =
    template.htmlContent || template.content || '';

  if (!templateHtml.trim()) {
    const error = new Error(
      `Certificate template for type '${request.certificateType}' does not contain HTML content`
    );

    error.statusCode = 400;

    throw error;
  }

  const certificateNumber = await generateCertificateNumber();
  const verificationCode = generateVerificationCode();
  const verifyId = generateVerifyId();

  const certificateTitle = getCertificateTitle(request.certificateType);
  const formattedCertType = certificateTitle;

  /* ---------------------------------------------------------
     QR CODE
  --------------------------------------------------------- */

  const {
    qrCodeDataUrl,
    verificationUrl,
  } = await generateQrCode(verificationCode);

  /* ---------------------------------------------------------
     Request metadata
  --------------------------------------------------------- */

  const rawMeta =
    request.metadata instanceof Map
      ? Object.fromEntries(request.metadata)
      : request.metadata || {};

  /* ---------------------------------------------------------
     Duration
  --------------------------------------------------------- */

  let durationStr = '';

  if (user.startDate && user.endDate) {
    const start = new Date(user.startDate);
    const end = new Date(user.endDate);

    const diffMonths = Math.max(
      1,
      Math.round(
        (end - start) /
          (1000 * 60 * 60 * 24 * 30.4375)
      )
    );

    durationStr =
      `${diffMonths} Month${diffMonths > 1 ? 's' : ''}`;
  }

  /* ---------------------------------------------------------
     Sanitize metadata
  --------------------------------------------------------- */

  const safeMeta = {};

  for (const [key, value] of Object.entries(rawMeta)) {
    if (
      typeof value === 'string' &&
      value.trim()
    ) {
      const cleanedValue = value.trim();

      safeMeta[key] = cleanedValue;

      const pascal =
        key.charAt(0).toUpperCase() +
        key.slice(1);

      const camel =
        key.charAt(0).toLowerCase() +
        key.slice(1);

      safeMeta[pascal] = cleanedValue;
      safeMeta[camel] = cleanedValue;
    }
  }

  /* =========================================================
     SUPPLEMENTARY DATA
  ========================================================= */

  const supplementaryData = {
    /* -------------------------------------------------------
       Bonafide
    ------------------------------------------------------- */

    CollegeName:
      safeMeta.CollegeName ||
      safeMeta.collegeName ||
      '',

    collegeName:
      safeMeta.CollegeName ||
      safeMeta.collegeName ||
      '',

    Purpose:
      safeMeta.Purpose ||
      safeMeta.purpose ||
      'Academic Requirement',

    purpose:
      safeMeta.Purpose ||
      safeMeta.purpose ||
      'Academic Requirement',

    InternshipTitle:
      safeMeta.InternshipTitle ||
      safeMeta.internshipTitle ||
      (
        user.domain
          ? `${user.domain} Intern`
          : 'Intern'
      ),

    internshipTitle:
      safeMeta.InternshipTitle ||
      safeMeta.internshipTitle ||
      (
        user.domain
          ? `${user.domain} Intern`
          : 'Intern'
      ),

    Duration:
      safeMeta.Duration ||
      safeMeta.duration ||
      durationStr,

    duration:
      safeMeta.Duration ||
      safeMeta.duration ||
      durationStr,

    OrganizationName:
      'UptoSkills',

    organizationName:
      'UptoSkills',

    Organization:
      'UptoSkills',

    organization:
      'UptoSkills',

    /* -------------------------------------------------------
       Offer Letter
    ------------------------------------------------------- */

    InternshipRole:
      safeMeta.InternshipRole ||
      safeMeta.internshipRole ||
      (
        user.domain
          ? `${user.domain} Intern`
          : 'Intern'
      ),

    internshipRole:
      safeMeta.InternshipRole ||
      safeMeta.internshipRole ||
      (
        user.domain
          ? `${user.domain} Intern`
          : 'Intern'
      ),

    Stipend:
      safeMeta.Stipend ||
      safeMeta.stipend ||
      '',

    stipend:
      safeMeta.Stipend ||
      safeMeta.stipend ||
      '',

    ReportingManager:
      safeMeta.ReportingManager ||
      safeMeta.reportingManager ||
      '',

    reportingManager:
      safeMeta.ReportingManager ||
      safeMeta.reportingManager ||
      '',

    ManagerName:
      safeMeta.ManagerName ||
      safeMeta.managerName ||
      safeMeta.ReportingManager ||
      safeMeta.reportingManager ||
      '',

    managerName:
      safeMeta.ManagerName ||
      safeMeta.managerName ||
      safeMeta.ReportingManager ||
      safeMeta.reportingManager ||
      '',

    JoiningDate:
      safeMeta.JoiningDate ||
      safeMeta.joiningDate ||
      formatDate(user.startDate),

    joiningDate:
      safeMeta.JoiningDate ||
      safeMeta.joiningDate ||
      formatDate(user.startDate),

    JoiningGuidelines:
      safeMeta.JoiningGuidelines ||
      safeMeta.joiningGuidelines ||
      '',

    joiningGuidelines:
      safeMeta.JoiningGuidelines ||
      safeMeta.joiningGuidelines ||
      '',

    HRName:
      safeMeta.HRName ||
      safeMeta.hrName ||
      'HR Team',

    hrName:
      safeMeta.HRName ||
      safeMeta.hrName ||
      'HR Team',

    /* -------------------------------------------------------
       OJT
    ------------------------------------------------------- */

    TrainingProgram:
      safeMeta.TrainingProgram ||
      safeMeta.trainingProgram ||
      (
        user.domain
          ? `${user.domain} Training Program`
          : 'On-the-Job Training Program'
      ),

    trainingProgram:
      safeMeta.TrainingProgram ||
      safeMeta.trainingProgram ||
      (
        user.domain
          ? `${user.domain} Training Program`
          : 'On-the-Job Training Program'
      ),

    TrainingStartDate:
      safeMeta.TrainingStartDate ||
      safeMeta.trainingStartDate ||
      formatDate(user.startDate),

    trainingStartDate:
      safeMeta.TrainingStartDate ||
      safeMeta.trainingStartDate ||
      formatDate(user.startDate),

    TrainingEndDate:
      safeMeta.TrainingEndDate ||
      safeMeta.trainingEndDate ||
      formatDate(user.endDate),

    trainingEndDate:
      safeMeta.TrainingEndDate ||
      safeMeta.trainingEndDate ||
      formatDate(user.endDate),

    MentorName:
      safeMeta.MentorName ||
      safeMeta.mentorName ||
      '',

    mentorName:
      safeMeta.MentorName ||
      safeMeta.mentorName ||
      '',

    PerformanceDetails:
      safeMeta.PerformanceDetails ||
      safeMeta.performanceDetails ||
      '',

    performanceDetails:
      safeMeta.PerformanceDetails ||
      safeMeta.performanceDetails ||
      '',

    /* -------------------------------------------------------
       Intern of the Month
    ------------------------------------------------------- */

    AwardMonth:
      safeMeta.AwardMonth ||
      safeMeta.awardMonth ||
      '',

    awardMonth:
      safeMeta.AwardMonth ||
      safeMeta.awardMonth ||
      '',

    RecognitionCriteria:
      safeMeta.RecognitionCriteria ||
      safeMeta.recognitionCriteria ||
      '',

    recognitionCriteria:
      safeMeta.RecognitionCriteria ||
      safeMeta.recognitionCriteria ||
      '',

    /* -------------------------------------------------------
       League Winner
    ------------------------------------------------------- */

    WinnerName:
      user.fullName || '',

    winnerName:
      user.fullName || '',

    EventName:
      safeMeta.EventName ||
      safeMeta.eventName ||
      '',

    eventName:
      safeMeta.EventName ||
      safeMeta.eventName ||
      '',

    Position:
      safeMeta.Position ||
      safeMeta.position ||
      '',

    position:
      safeMeta.Position ||
      safeMeta.position ||
      '',

    EventDate:
      safeMeta.EventDate ||
      safeMeta.eventDate ||
      formatDate(new Date()),

    eventDate:
      safeMeta.EventDate ||
      safeMeta.eventDate ||
      formatDate(new Date()),

    Place:
      safeMeta.Place ||
      safeMeta.place ||
      'New Delhi',

    place:
      safeMeta.Place ||
      safeMeta.place ||
      'New Delhi',

    /* -------------------------------------------------------
       Custom metadata
    ------------------------------------------------------- */

    ...safeMeta,
  };

  /* =========================================================
     TRUSTED CORE DATA
     IMPORTANT:
     This object is placed AFTER supplementaryData so
     request metadata cannot override trusted values.
  ========================================================= */

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
    verificationCode: verificationCode,
    VerifyId: verifyId,
    verifyId: verifyId,
    qrCodeDataUrl,
    qrCodeUrl: qrCodeDataUrl,
    verificationUrl
  };

  /* =========================================================
     FINAL TEMPLATE DATA
  ========================================================= */

  const templateData = {
    ...supplementaryData,
    ...trustedCoreData,
  };
  const htmlContent = Handlebars.compile(templateHtml)(templateData);

  /* =========================================================
     COMPILE HANDLEBARS TEMPLATE
  ========================================================= */

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
    verifyId,
    verificationIdVersion: 2,
    generatedBy: request.reviewedBy
  });

  await request.save();

  return certificate;
};

/* =========================================================
   GET CERTIFICATE DRAFT
========================================================= */

/**
 * Fetches a certificate draft.
 */
export const getCertificateDraft = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error =
      new Error('Invalid certificate ID');

    error.statusCode = 400;

    throw error;
  }

  const certificate =
    await Certificate.findById(id)
      .populate(
        'userId',
        'fullName email internCode domain'
      );

  if (!certificate) {
    const error =
      new Error('Certificate draft not found');

    error.statusCode = 404;

    throw error;
  }

  return certificate;
};

/* =========================================================
   UPDATE CERTIFICATE DRAFT
========================================================= */

/**
 * Updates the HTML of a draft certificate.
 */
export const updateCertificateDraft = async (
  id,
  htmlContent
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error =
      new Error('Invalid certificate ID');

    error.statusCode = 400;

    throw error;
  }

  if (
    typeof htmlContent !== 'string' ||
    !htmlContent.trim()
  ) {
    const error =
      new Error('htmlContent is required');

    error.statusCode = 400;

    throw error;
  }

  const certificate =
    await Certificate.findById(id);

  if (!certificate) {
    const error =
      new Error('Certificate draft not found');

    error.statusCode = 404;

    throw error;
  }

  if (certificate.status !== 'draft') {
    const error =
      new Error(
        'Only draft certificates can be edited'
      );

    error.statusCode = 400;

    throw error;
  }

  certificate.htmlContent =
    htmlContent;

  await certificate.save();

  return certificate;
};

/* =========================================================
   RENDER CERTIFICATE PDF
========================================================= */

/**
 * Renders certificate HTML into A4 landscape PDF.
 *
 * Important:
 * - Reuses Puppeteer browser
 * - Waits for fonts
 * - Waits for all images including QR
 * - A4 landscape
 * - Zero margins
 * - Background graphics enabled
 */
export const renderCertificatePdf = async (
  htmlContent
) => {
  if (
    !htmlContent ||
    typeof htmlContent !== 'string' ||
    !htmlContent.trim()
  ) {
    const error =
      new Error(
        'Certificate htmlContent is required for PDF rendering'
      );

    error.statusCode = 400;

    throw error;
  }

  let page = null;

  try {
    const browser =
      await getBrowser();

    page =
      await browser.newPage();

    /* -------------------------------------------------------
       A4 landscape viewport
    ------------------------------------------------------- */

    await page.setViewport({
      width: 1123,
      height: 794,
      deviceScaleFactor: 1,
    });

    /* -------------------------------------------------------
       Load certificate
    ------------------------------------------------------- */

    await page.setContent(
      htmlContent,
      {
        waitUntil: [
          'load',
          'domcontentloaded',
          'networkidle0',
        ],
      }
    );

    /* -------------------------------------------------------
       Wait for Google/local fonts
    ------------------------------------------------------- */

    await page.evaluate(async () => {
      if (document.fonts) {
        await document.fonts.ready;
      }
    });

    /* -------------------------------------------------------
       Wait for QR and other images
    ------------------------------------------------------- */

    await page.evaluate(async () => {
      const images =
        Array.from(
          document.images
        );

      await Promise.all(
        images.map((image) => {
          if (image.complete) {
            return Promise.resolve();
          }

          return new Promise((resolve) => {
            image.addEventListener(
              'load',
              resolve,
              { once: true }
            );

            image.addEventListener(
              'error',
              resolve,
              { once: true }
            );
          });
        })
      );
    });

    /* -------------------------------------------------------
       Give browser a small rendering buffer
    ------------------------------------------------------- */

    await new Promise((resolve) => {
      setTimeout(resolve, 200);
    });

    /* -------------------------------------------------------
       Generate PDF
    ------------------------------------------------------- */

    const pdfBytes =
      await page.pdf({
        format: 'A4',

        landscape: true,

        printBackground: true,

        preferCSSPageSize: true,

        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
        },
      });

    return Buffer.from(pdfBytes);
  } catch (err) {
    const error =
      new Error(
        `PDF rendering failed: ${err.message}`
      );

    error.statusCode = 500;

    throw error;
  } finally {
    if (page) {
      try {
        await page.close();
      } catch {
        // Safe cleanup
      }
    }
  }
};

/* =========================================================
   FINALIZE CERTIFICATE
========================================================= */

/**
 * Finalizes a certificate:
 *
 * 1. Checks draft status
 * 2. Renders PDF
 * 3. Saves PDF
 * 4. Marks certificate finalized
 * 5. Marks linked request completed
 */
export const finalizeCertificate = async (
  certificateId
) => {
  if (
    !mongoose.Types.ObjectId.isValid(
      certificateId
    )
  ) {
    const error =
      new Error('Invalid certificate ID');

    error.statusCode = 400;

    throw error;
  }

  const certificate =
    await Certificate.findById(
      certificateId
    ).populate(
      'userId',
      'fullName email internCode domain'
    );

  if (!certificate) {
    const error =
      new Error('Certificate not found');

    error.statusCode = 404;

    throw error;
  }

  if (certificate.status !== 'draft') {
    const error =
      new Error(
        `Cannot finalize certificate with status '${certificate.status}'. Only draft certificates can be finalized.`
      );

    error.statusCode = 409;

    throw error;
  }

  if (
    !certificate.htmlContent ||
    !certificate.htmlContent.trim()
  ) {
    const error =
      new Error(
        'Certificate htmlContent is missing or empty'
      );

    error.statusCode = 400;

    throw error;
  }

  if (!certificate.verifyId) {
    certificate.verifyId = generateVerifyId();
  }

  const qrDataUrl = await generateQrDataUrl(certificate.certificateNumber, certificate.verificationCode);
  const htmlWithQr = certificate.htmlContent.includes('qrcode') || certificate.htmlContent.includes('qrCode')
    ? certificate.htmlContent
    : `${certificate.htmlContent}<div style="text-align:center;margin-top:22px;"><img src="${qrDataUrl}" alt="Verification QR Code" style="width:140px;height:140px;display:block;margin:0 auto;" /><p style="text-align:center;font-size:12px;color:#666;margin-top:10px;">Verification ID: ${certificate.verifyId}</p></div>`;

  // 1. Render PDF using Puppeteer
  const pdfBuffer = await renderCertificatePdf(htmlWithQr);

  const __dirname =
    path.dirname(__filename);

  const uploadDir =
    path.resolve(
      __dirname,
      '../../uploads/certificates'
    );

  fs.mkdirSync(
    uploadDir,
    {
      recursive: true,
    }
  );

  /* -------------------------------------------------------
     File name
  ------------------------------------------------------- */

  const sanitizedNumber =
    certificate.certificateNumber.replace(
      /[^a-zA-Z0-9_-]/g,
      '_'
    );

  const fileName =
    `${sanitizedNumber}.pdf`;

  const absolutePdfPath =
    path.join(
      uploadDir,
      fileName
    );

  const relativePdfPath =
    `uploads/certificates/${fileName}`;

  /* -------------------------------------------------------
     Save PDF
  ------------------------------------------------------- */

  try {
    fs.writeFileSync(
      absolutePdfPath,
      pdfBuffer
    );
  } catch (fsError) {
    const error =
      new Error(
        `Failed to persist certificate PDF: ${fsError.message}`
      );

    error.statusCode = 500;

    throw error;
  }

  // 3. Mark Certificate as finalized and save pdfPath
  certificate.status = 'finalized';
  certificate.pdfPath = relativePdfPath;
  certificate.qrCodePath = await generateQrDataUrl(certificate.certificateNumber, certificate.verificationCode);
  if (!certificate.verifyId) {
    certificate.verifyId = generateVerifyId();
  }
  certificate.htmlContent = htmlWithQr;
  await certificate.save();

  /* -------------------------------------------------------
     Update linked request
  ------------------------------------------------------- */

  const request =
    await CertificateRequest.findOne({
      certificateId:
        certificate._id,
    });

  if (request) {
  request.status = 'completed';
  request.completedAt = new Date();
  await request.save();
}

  return {
    certificate,
    request,
    absolutePdfPath,
    fileName,
  };
};

/* =========================================================
   SEND CERTIFICATE EMAIL
========================================================= */

/**
 * Sends finalized certificate PDF by email.
 */
export const sendCertificateEmail = async ({
  certificate,
  absolutePdfPath,
  user,
}) => {
  const recipientEmail =
    user?.email;

  if (!recipientEmail) {
    throw new Error(
      'Associated intern email address not found on user record'
    );
  }

  const certificateTypeFormatted =
    getCertificateTitle(
      certificate.certificateType
    );

  const subject =
    `Your ${certificateTypeFormatted} - UPTOSKILL (${certificate.certificateNumber})`;

  const html = `
    <div
      style="
        font-family: Arial, sans-serif;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        line-height: 1.6;
      "
    >

      <h2 style="color: #2563eb;">
        Congratulations, ${user.fullName || 'Intern'}!
      </h2>

      <p>
        We are pleased to inform you that your
        <strong>${certificateTypeFormatted}</strong>
        certificate has been officially reviewed
        and finalized.
      </p>

      <div
        style="
          background-color: #f3f4f6;
          padding: 16px;
          border-radius: 8px;
          margin: 20px 0;
        "
      >

        <p style="margin: 4px 0;">
          <strong>Certificate Number:</strong>
          ${certificate.certificateNumber}
        </p>

        <p style="margin: 4px 0;">
          <strong>Verification Code:</strong>
          ${certificate.verificationCode}
        </p>

        <p style="margin: 4px 0;">
          <strong>Issue Date:</strong>
          ${new Date(
            certificate.issuedDate || Date.now()
          ).toLocaleDateString(
            'en-US',
            {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }
          )}
        </p>

      </div>

      <p>
        Your official digital certificate is attached
        to this email as a PDF document.
      </p>

      <p
        style="
          margin-top: 30px;
          font-size: 13px;
          color: #6b7280;
        "
      >
        Best regards,<br />
        <strong>UPTOSKILL Certificate Desk</strong>
      </p>

    </div>
  `;

  const fileName =
    `${certificate.certificateNumber.replace(
      /[^a-zA-Z0-9_-]/g,
      '_'
    )}.pdf`;

  return sendEmail({
    to: recipientEmail,

    subject,

    html,

    attachments: [
      {
        filename: fileName,
        path: absolutePdfPath,
      },
    ],
  });
};
