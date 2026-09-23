import express from "express";
import multer from "multer";
import {
  registerValidator,
  teamLeaderValidator,
} from "../validators/auth.validator.js";

import {
  createIntern,
  createTeamLeader,
  getAllTeamLeaders,
  getInternsByTeamLeader,
  getForwardedRequests,
  finalizeRequest,
  createTemplate,
  uploadCertificateTemplatePdf,
  getAllTemplates,
  updateTemplate,
  toggleTemplateActive,
  generateCertificateDraft,
  getCertificateDraft,
  updateCertificateDraft,
  finalizeCertificateHandler,
  getAllCertificates,
  retryCertificateGeneration,
} from "../controllers/admin.controller.js";

import verifyAuth from "../middlewares/verifyAuth.js";
import requireAdmin from "../middlewares/requireAdmin.js";

const adminRouter = express.Router();

const upload = multer({
  dest: "uploads/template-pdfs/",
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }

    cb(null, true);
  },
});

// ======================================================
// INTERN AND TEAM LEADER MANAGEMENT
// ======================================================

adminRouter.post(
  "/create-intern",
  verifyAuth,
  requireAdmin,
  registerValidator,
  createIntern
);

adminRouter.post(
  "/create-tl",
  verifyAuth,
  requireAdmin,
  teamLeaderValidator,
  createTeamLeader
);

adminRouter.get(
  "/teamleaders",
  verifyAuth,
  requireAdmin,
  getAllTeamLeaders
);

adminRouter.get(
  "/teamleaders/:id/interns",
  verifyAuth,
  requireAdmin,
  getInternsByTeamLeader
);

// ======================================================
// CERTIFICATE REQUEST MANAGEMENT
// ======================================================

// Admin sees requests forwarded by team leader
adminRouter.get(
  "/forwarded-requests",
  verifyAuth,
  requireAdmin,
  getForwardedRequests
);

// Admin approves or rejects a forwarded request
adminRouter.patch(
  "/requests/:id/finalize",
  verifyAuth,
  requireAdmin,
  finalizeRequest
);

// ======================================================
// CERTIFICATE TEMPLATE MANAGEMENT
// ======================================================

// Create HTML certificate template
adminRouter.post(   
  "/templates",
  verifyAuth,
  requireAdmin,
  createTemplate
);

// Upload PDF certificate template
adminRouter.post(
  "/templates/upload-pdf",
  verifyAuth,
  requireAdmin,
  upload.single("pdf"),
  uploadCertificateTemplatePdf
);

// Get all certificate templates
adminRouter.get(
  "/templates",
  verifyAuth,
  requireAdmin,
  getAllTemplates
);

// Update certificate template
adminRouter.patch(
  "/templates/:id",
  verifyAuth,
  requireAdmin,
  updateTemplate
);

// Activate/deactivate certificate template
adminRouter.patch(
  "/templates/:id/toggle",
  verifyAuth,
  requireAdmin,
  toggleTemplateActive
);

// ======================================================
// CERTIFICATE DRAFT GENERATION
// ======================================================

// Day 2: Manual draft generation
// Generates certificate draft
adminRouter.post(
  "/certificates/draft/:requestId",
  verifyAuth,
  requireAdmin,
  generateCertificateDraft
);

// ======================================================
// DAY 3 - CERTIFICATE DRAFT FETCH / EDIT
// ======================================================

// Fetch certificate draft
adminRouter.get(
  "/certificates/:id",
  verifyAuth,
  requireAdmin,
  getCertificateDraft
);

// Update certificate draft HTML
adminRouter.patch(
  "/certificates/:id",
  verifyAuth,
  requireAdmin,
  updateCertificateDraft
);

// ======================================================
// DAY 4 - FINALIZE CERTIFICATE + EMAIL PDF
// ======================================================

adminRouter.post(
  "/certificates/:id/finalize",
  verifyAuth,
  requireAdmin,
  finalizeCertificateHandler
);

// ======================================================
// DAY 5 - CERTIFICATE OVERSIGHT
// ======================================================

// Get all generated certificates for Admin
adminRouter.get(
  "/certificates",
  verifyAuth,
  requireAdmin,
  getAllCertificates
);

// Retry certificate generation for an approved request
// that does not currently have a certificateId.
adminRouter.post(
  "/requests/:id/retry-generation",
  verifyAuth,
  requireAdmin,
  retryCertificateGeneration
);

export default adminRouter;