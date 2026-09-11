import Handlebars from "handlebars";
import CertificateRequest from "../models/CertificateRequest.js";
import CertificateTemplate from "../models/CertificateTemplate.model.js";
import Certificate from "../models/Certificate.model.js";
import User from "../models/User.js";

/**
 * Service to generate a Certificate draft by compiling a CertificateTemplate
 * with data from a CertificateRequest and User using Handlebars.
 * 
 * @param {string|ObjectId} requestId - ID of the CertificateRequest
 * @returns {Promise<Document>} Saved Certificate draft document
 */
export async function createCertificateDraft(requestId) {
  if (!requestId) {
    throw new Error("requestId is required to create a certificate draft");
  }

  // 1. Fetch request and populate user details
  const request = await CertificateRequest.findById(requestId).populate("userId");
  if (!request) {
    throw new Error(`CertificateRequest not found for ID: ${requestId}`);
  }

  const user = request.userId;
  if (!user) {
    throw new Error(`Associated user not found for CertificateRequest: ${requestId}`);
  }

  // 2. Fetch matching active template for the request's certificateType
  const template = await CertificateTemplate.findOne({
    certificateType: request.certificateType,
    $or: [{ isActive: true }, { status: "active" }]
  }).sort({ createdAt: -1 });

  if (!template) {
    throw new Error(`No active CertificateTemplate found for certificate type: "${request.certificateType}"`);
  }

  const rawHtml = template.htmlContent || template.content;
  if (!rawHtml) {
    throw new Error(`CertificateTemplate (ID: ${template._id}) has no HTML content`);
  }

  // 3. Prepare data payload for Handlebars template compilation
  const formatDate = (date) => (date ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "N/A");

  const templateData = {
    fullName: user.fullName || "",
    name: user.fullName || "",
    email: user.email || "",
    internCode: user.internCode || request.internCode || "",
    domain: user.domain || "",
    startDate: formatDate(user.startDate),
    endDate: formatDate(user.endDate),
    certificateType: request.certificateType,
    requestNumber: request.requestNumber || "",
    reason: request.reason || "",
    issuedDate: formatDate(new Date()),
    todayDate: formatDate(new Date())
  };

  // 4. Compile HTML template using Handlebars
  const compiledTemplate = Handlebars.compile(rawHtml);
  const mergedHtmlContent = compiledTemplate(templateData);

  // 5. Create and save Certificate document in 'draft' status
  const certificateDraft = await Certificate.create({
    requestId: request._id,
    userId: user._id,
    templateId: template._id,
    htmlContent: mergedHtmlContent,
    status: "draft",
    certificateType: request.certificateType,
    internCode: user.internCode || request.internCode,
    domain: user.domain,
    startDate: user.startDate,
    endDate: user.endDate,
    issuedDate: new Date()
  });

  return certificateDraft;
}

export default {
  createCertificateDraft
};
