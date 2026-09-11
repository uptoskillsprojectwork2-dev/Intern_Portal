import connectToDB from "../src/config/database.js";
import User from "../src/models/User.js";
import CertificateRequest from "../src/models/CertificateRequest.js";
import CertificateTemplate from "../src/models/CertificateTemplate.model.js";
import { createCertificateDraft } from "../src/services/certificate.service.js";

async function testWithTemplateId() {
  const templateId = process.argv[2] || "6aa3fd74ac4c6c5765231a61";
  try {
    await connectToDB();
    console.log(`Connected to MongoDB. Testing draft generation using Template ID: ${templateId}...`);

    // 1. Fetch template
    const template = await CertificateTemplate.findById(templateId);
    if (!template) {
      console.error(`CertificateTemplate not found for ID: ${templateId}`);
      process.exit(1);
    }

    console.log("Template Found:");
    console.log("- Name:", template.name || template.templateName);
    console.log("- Certificate Type:", template.certificateType);
    console.log("- Is Active:", template.isActive);

    // 2. Find or create user
    let user = await User.findOne({ role: "intern" });
    if (!user) {
      user = await User.create({
        fullName: "Alex Rivera",
        email: "alex.rivera@uptoskills.com",
        internCode: "UPT2026-ALEX",
        domain: "Backend Engineering",
        startDate: new Date("2026-02-01"),
        endDate: new Date("2026-08-01"),
        role: "intern",
        password: "password123"
      });
      console.log("Created intern user:", user.email);
    } else {
      console.log("Using existing user:", user.fullName, `(${user.email})`);
    }

    // 3. Create request for this template's certificateType
    const request = await CertificateRequest.create({
      requestNumber: `REQ-EXP-${Date.now()}`,
      userId: user._id,
      internCode: user.internCode || "UPT2026-ALEX",
      certificateType: template.certificateType,
      reason: "Experience letter request",
      status: "approved"
    });

    console.log("Created CertificateRequest ID:", request._id);

    // 4. Generate draft certificate
    console.log("\nExecuting createCertificateDraft(request._id)...");
    const draft = await createCertificateDraft(request._id);

    console.log("\n=======================================================");
    console.log("✅ DRAFT CERTIFICATE GENERATED SUCCESSFULLY!");
    console.log("=======================================================");
    console.log("Draft Certificate ID :", draft._id);
    console.log("Status               :", draft.status);
    console.log("Template Used        :", draft.templateId);
    console.log("Certificate Type     :", draft.certificateType);
    console.log("\n---------------- MERGED HTML OUTPUT ----------------\n");
    console.log(draft.htmlContent);
    console.log("\n=======================================================\n");

    process.exit(0);
  } catch (err) {
    console.error("Error generating draft:", err);
    process.exit(1);
  }
}

testWithTemplateId();
