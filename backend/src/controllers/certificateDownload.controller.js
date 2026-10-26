import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Certificate from "../models/Certificate.js";
import CertificateRequest from "../models/CertificateRequest.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const downloadCertificateAuthenticated = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Try finding by Certificate _id first, then by CertificateRequest _id
    let certificate = await Certificate.findById(id);
    let request = null;

    if (!certificate) {
      request = await CertificateRequest.findById(id);
      if (request && request.certificateId) {
        certificate = await Certificate.findById(request.certificateId);
      }
    } else {
      request = await CertificateRequest.findOne({ certificateId: certificate._id });
    }

    if (!certificate) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    // Authorization check: Admin has full access; Intern must be the owner
    const isAdmin = req.user.role === "admin";
    const isOwner = req.user.role === "intern" && (
      (certificate.userId && certificate.userId.toString() === req.user.id) ||
      (request && request.userId && request.userId.toString() === req.user.id)
    );

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Access denied: Certificate does not belong to you" });
    }

    // Must be finalized
    if (certificate.status !== "finalized") {
      return res.status(400).json({ message: "Certificate has not been finalized yet" });
    }

    if (!certificate.pdfPath) {
      return res.status(404).json({ message: "Certificate PDF path is missing" });
    }

    const absolutePath = path.resolve(__dirname, "../../", certificate.pdfPath);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: "Certificate PDF file is unavailable on server" });
    }

    const safeFileName = `${(certificate.certificateNumber || "Certificate").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
    return res.download(absolutePath, safeFileName);
  } catch (err) {
    next(err);
  }
};
