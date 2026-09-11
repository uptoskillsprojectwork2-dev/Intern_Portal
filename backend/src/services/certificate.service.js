import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import Certificate from '../models/Certificate.js';
import CertificateRequest from '../models/CertificateRequest.js';

/**
 * Resolves and ensures the persistent certificate storage directory exists.
 * @returns {string} Absolute path to uploads/certificates directory
 */
export const getCertificateStorageDir = () => {
  const uploadsDir = path.resolve(process.cwd(), 'uploads', 'certificates');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
};

/**
 * Renders HTML content into a PDF using Puppeteer with strict resource cleanup.
 * Uses A4 landscape format and preserves background graphics and styles.
 *
 * @param {string} htmlContent - Source HTML of the certificate
 * @param {string} outputPath - Absolute target path where PDF will be saved
 * @returns {Promise<string>} Saved file path
 */
export const renderHtmlToPdf = async (htmlContent, outputPath) => {
  if (!htmlContent || typeof htmlContent !== 'string' || !htmlContent.trim()) {
    const err = new Error('HTML content is required for PDF rendering');
    err.statusCode = 400;
    throw err;
  }

  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Set HTML and wait for fonts/assets to settle
    await page.setContent(htmlContent, {
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000
    });

    // Render A4 landscape PDF with backgrounds preserved
    await page.pdf({
      path: outputPath,
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px'
      }
    });

    return outputPath;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

/**
 * Finalizes a draft certificate:
 * 1. Validates ID and loads certificate.
 * 2. Confirms status is 'draft'.
 * 3. Uses stored edited htmlContent (does NOT regenerate from template).
 * 4. Renders HTML to PDF using Puppeteer.
 * 5. Persists PDF to uploads/certificates/.
 * 6. Only after successful file persistence: marks certificate 'finalized'.
 * 7. Updates associated CertificateRequest to 'completed'.
 *
 * @param {string|mongoose.Types.ObjectId} certificateId
 * @param {string|mongoose.Types.ObjectId} [adminId]
 * @returns {Promise<{ certificate: Object, request: Object, filePath: string }>}
 */
export const finalizeCertificate = async (certificateId, adminId = null) => {
  if (!certificateId) {
    const err = new Error('Certificate ID is required');
    err.statusCode = 400;
    throw err;
  }

  if (!mongoose.Types.ObjectId.isValid(certificateId)) {
    const err = new Error('Invalid certificate ID format');
    err.statusCode = 400;
    throw err;
  }

  // 1. Load the certificate
  const certificate = await Certificate.findById(certificateId).populate('userId');
  if (!certificate) {
    const err = new Error('Certificate not found');
    err.statusCode = 404;
    throw err;
  }

  // 2. Confirm it is currently a draft (Duplicate Finalization Protection)
  if (certificate.status !== 'draft') {
    const err = new Error(`Cannot finalize certificate: current status is '${certificate.status}', only 'draft' certificates can be finalized`);
    err.statusCode = 409;
    throw err;
  }

  // 3. Retrieve stored edited htmlContent (Source of truth from Day 3)
  const htmlContent = certificate.htmlContent;
  if (!htmlContent || !htmlContent.trim()) {
    const err = new Error('Certificate draft has no HTML content to render');
    err.statusCode = 400;
    throw err;
  }

  // 4. Prepare storage location and collision-safe filename
  const storageDir = getCertificateStorageDir();
  const safeCertNumber = (certificate.certificateNumber || 'CERT')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${safeCertNumber}_${Date.now()}.pdf`;
  const absolutePdfPath = path.join(storageDir, fileName);
  const relativePdfPath = path.join('uploads', 'certificates', fileName).replace(/\\/g, '/');

  // 5. Render and write PDF (Failure Safety)
  try {
    await renderHtmlToPdf(htmlContent, absolutePdfPath);

    // Verify file actually exists and has non-zero size
    const stat = fs.statSync(absolutePdfPath);
    if (stat.size === 0) {
      throw new Error('Generated PDF file is empty');
    }
  } catch (renderError) {
    // If a partial file was created, clean it up
    if (fs.existsSync(absolutePdfPath)) {
      try {
        fs.unlinkSync(absolutePdfPath);
      } catch {
        // ignore unlink error
      }
    }
    // Certificate remains 'draft', do not modify database
    const err = new Error(`PDF generation failed: ${renderError.message}`);
    err.statusCode = 500;
    throw err;
  }

  // 6. Only after the PDF has been successfully written to disk:
  // Transition status to finalized and save relative path
  certificate.pdfPath = relativePdfPath;
  certificate.status = 'finalized';
  certificate.issuedDate = new Date();
  if (adminId) {
    certificate.generatedBy = adminId;
  }
  await certificate.save();

  // 7. Update associated CertificateRequest to 'completed'
  let associatedRequest = await CertificateRequest.findOne({ certificateId: certificate._id });
  if (!associatedRequest && certificate.userId) {
    // Fallback lookup if not yet back-referenced
    associatedRequest = await CertificateRequest.findOne({
      userId: certificate.userId._id || certificate.userId,
      status: 'approved'
    });
  }

  if (associatedRequest) {
    associatedRequest.status = 'completed';
    if (!associatedRequest.certificateId) {
      associatedRequest.certificateId = certificate._id;
    }
    await associatedRequest.save();
  }

  return {
    certificate,
    request: associatedRequest,
    filePath: absolutePdfPath,
    relativePdfPath
  };
};
