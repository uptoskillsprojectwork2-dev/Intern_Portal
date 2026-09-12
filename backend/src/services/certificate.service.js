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