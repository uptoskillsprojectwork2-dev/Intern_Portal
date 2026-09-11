import connectToDB from "../src/config/database.js";
import User from "../src/models/User.js";
import CertificateRequest from "../src/models/CertificateRequest.js";
import CertificateTemplate from "../src/models/CertificateTemplate.model.js";
import Certificate from "../src/models/Certificate.model.js";

async function inspectId() {
  const targetId = process.argv[2] || "6aa3fd74ac4c6c5765231a61";
  try {
    await connectToDB();
    console.log(`Inspecting ID: ${targetId} across collections...\n`);

    const user = await User.findById(targetId);
    if (user) console.log("Found in Collection [User]:", { id: user._id, fullName: user.fullName, email: user.email, role: user.role });

    const request = await CertificateRequest.findById(targetId);
    if (request) console.log("Found in Collection [CertificateRequest]:", { id: request._id, requestNumber: request.requestNumber, certificateType: request.certificateType, status: request.status });

    const template = await CertificateTemplate.findById(targetId);
    if (template) console.log("Found in Collection [CertificateTemplate]:", { id: template._id, name: template.name, certificateType: template.certificateType, isActive: template.isActive });

    const cert = await Certificate.findById(targetId);
    if (cert) console.log("Found in Collection [Certificate]:", { id: cert._id, status: cert.status, certificateType: cert.certificateType });

    if (!user && !request && !template && !cert) {
      console.log("No document found matching this ID in User, CertificateRequest, CertificateTemplate, or Certificate collections.");
      console.log("\nListing available requests in DB:");
      const allRequests = await CertificateRequest.find().limit(5);
      console.log(allRequests.map(r => ({ id: r._id, type: r.certificateType, status: r.status, user: r.userId })));
    }

    process.exit(0);
  } catch (err) {
    console.error("Error inspecting ID:", err);
    process.exit(1);
  }
}

inspectId();
