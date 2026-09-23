import Handlebars from "handlebars";
import Certificate from "../models/Certificate.js";
import CertificateRequest from "../models/CertificateRequest.js";
import CertificateTemplate from "../models/CertificateTemplate.js";
import User from "../models/User.js";
import puppeteer from "puppeteer";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const formatDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const buildTemplateData = ({ request, user }) => ({
  requestId: request._id.toString(),
  requestNumber: request.requestNumber,
  certificateType: request.certificateType,
  reason: request.reason || "",
  fullName: user.fullName,
  name: user.fullName,
  email: user.email,
  mobileNo: user.mobileNo || "",
  internCode: user.internCode || request.internCode || "",
  domain: user.domain || "",
  startDate: formatDate(user.startDate),
  endDate: formatDate(user.endDate),
  startDateRaw: user.startDate || "",
  endDateRaw: user.endDate || "",
});


/**
 * Day 2:
 * Creates or refreshes the draft certificate for an approved request.
 */
export const createCertificateDraft = async (requestId) => {
  if (!requestId) {
    throw new Error("requestId is required");
  }

  const request = await CertificateRequest.findById(requestId);

  if (!request) {
    throw new Error("Certificate request not found");
  }

  if (request.status !== "approved") {
    throw new Error(
      "Certificate draft can only be generated for an approved request"
    );
  }

  const user = await User.findById(request.userId);

  if (!user) {
    throw new Error("Intern/user not found for certificate request");
  }

  const template = await CertificateTemplate.findOne({
    certificateType: request.certificateType,
    isActive: true,
  }).sort({
    updatedAt: -1,
    createdAt: -1,
  });

  if (!template) {
    throw new Error(
      `No active certificate template found for ${request.certificateType}`
    );
  }

  const data = buildTemplateData({
    request,
    user,
  });

  const compile = Handlebars.compile(
    template.htmlContent,
    {
      strict: false,
    }
  );

  const htmlContent = compile(data);

  const certificate = await Certificate.findOneAndUpdate(
    {
      requestId: request._id,
    },
    {
      requestId: request._id,
      userId: user._id,
      templateId: template._id,
      htmlContent,
      status: "draft",
      certificateType: request.certificateType,
      internCode: user.internCode || request.internCode,
      domain: user.domain,
      startDate: user.startDate,
      endDate: user.endDate,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  if (
    !request.certificateId ||
    request.certificateId.toString() !== certificate._id.toString()
  ) {
    request.certificateId = certificate._id;
    await request.save();
  }

  return certificate;
};


/**
 * Day 4:
 * Renders the edited certificate draft to PDF and finalizes it.
 */
export const finalizeCertificate = async (certificateId) => {
  if (!certificateId) {
    throw new Error("certificateId is required");
  }

  const certificate = await Certificate.findById(certificateId);

  if (!certificate) {
    throw new Error("Certificate draft not found");
  }

  if (certificate.status !== "draft") {
    throw new Error("Only draft certificates can be finalized");
  }

  if (!certificate.htmlContent?.trim()) {
    throw new Error("Certificate HTML content is empty");
  }

  const request = await CertificateRequest.findById(
    certificate.requestId
  );

  if (!request) {
    throw new Error(
      "Certificate request not found for this certificate"
    );
  }

  const user = await User.findById(certificate.userId);

  if (!user) {
    throw new Error(
      "Intern/user not found for this certificate"
    );
  }

  const certificatesDirectory = path.join(
    __dirname,
    "../../uploads/certificates"
  );

  await fs.mkdir(certificatesDirectory, {
    recursive: true,
  });

  const filename = `certificate-${certificate._id}.pdf`;

  const pdfPath = path.join(
    certificatesDirectory,
    filename
  );

  const browser = await puppeteer.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    await page.setContent(
      certificate.htmlContent,
      {
        waitUntil: "networkidle0",
      }
    );

    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "15mm",
        bottom: "20mm",
        left: "15mm",
      },
    });
  } finally {
    await browser.close();
  }

  const fileUrl = `/uploads/certificates/${filename}`;

  certificate.fileUrl = fileUrl;
  certificate.pdfPath = pdfPath;
  certificate.status = "finalized";

  await certificate.save();

  request.status = "completed";
  request.certificateId = certificate._id;

  await request.save();

  return {
    certificate,
    user,
    request,
    pdfPath,
    fileUrl,
  };
};


export default {
  createCertificateDraft,
  finalizeCertificate,
};