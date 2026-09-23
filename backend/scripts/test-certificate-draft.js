import dotenv from "dotenv";
import mongoose from "mongoose";
import { createCertificateDraft } from "../src/services/certificate.service.js";
import "../src/models/User.js";
import "../src/models/CertificateRequest.js";
import "../src/models/CertificateTemplate.js";
import "../src/models/Certificate.js";

// Usage: node scripts/test-certificate-draft.js <approved-request-id>
dotenv.config();

const requestId = process.argv[2];
if (!requestId) {
  console.error("Usage: node scripts/test-certificate-draft.js <approved-request-id>");
  process.exit(1);
}

try {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not defined in env");

  await mongoose.connect(process.env.MONGO_URI);
  const certificate = await createCertificateDraft(requestId);

  console.log("Certificate draft created successfully.");
  console.log(JSON.stringify({
    id: certificate._id,
    requestId: certificate.requestId,
    userId: certificate.userId,
    templateId: certificate.templateId,
    status: certificate.status,
    htmlContent: certificate.htmlContent,
  }, null, 2));
} catch (error) {
  console.error(`Draft generation failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
