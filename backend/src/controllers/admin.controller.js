import User from "../models/User.js";
import dotenv from "dotenv";
import { generateInternCode } from "../utils/generateInternCode.js";
import CertificateRequest from "../models/CertificateRequest.js";
import CertificateTemplate from "../models/CertificateTemplate.js";
import Certificate from "../models/Certificate.js";
import {
  createCertificateDraft,
  finalizeCertificate,
} from "../services/certificate.service.js";
import { sendEmail } from "../utils/sendEmail.js";

dotenv.config();

// ======================================================
// INTERN MANAGEMENT
// ======================================================

export async function createIntern(req, res) {
  try {
    const {
      fullName,
      email,
      mobileNo,
      domain,
      startDate,
      endDate,
      teamleaderEmail,
    } = req.body;

    const normalizedEmail = email?.trim().toLowerCase();

    if (
      !fullName?.trim() ||
      !normalizedEmail ||
      !mobileNo?.trim() ||
      !domain?.trim() ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({
        message: "Required intern details are missing",
      });
    }

    const isUserExists = await User.findOne({
      email: normalizedEmail,
    });

    if (isUserExists) {
      return res.status(409).json({
        message: "user already exists",
      });
    }

    let normalizedTeamleaderEmail;

    if (teamleaderEmail?.trim()) {
      normalizedTeamleaderEmail =
        teamleaderEmail.trim().toLowerCase();

      const tl = await User.findOne({
        email: normalizedTeamleaderEmail,
        role: "teamleader",
      });

      if (!tl) {
        return res.status(400).json({
          message: "No team leader found with this email",
        });
      }
    }

    const internCode = await generateInternCode();
    const temporaryPassword = internCode;

    const user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      mobileNo: mobileNo.trim(),
      internCode,
      domain: domain.trim(),
      startDate,
      endDate,
      role: "intern",
      password: temporaryPassword,

      internshipDetails: {
        teamleaderEmail: normalizedTeamleaderEmail,
        status: "upcoming",
        createdBy: req.user.id,
      },
    });

    return res.status(201).json({
      message: "User registered successfully",
      temporaryPassword,

      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        internCode: user.internCode,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Create intern error:", err);

    return res.status(500).json({
      message: "internal server error",
    });
  }
}

// ======================================================
// TEAM LEADER MANAGEMENT
// ======================================================

export async function createTeamLeader(req, res) {
  try {
    const {
      fullName,
      email,
      mobileNo,
      startDate,
      endDate,
      password,
    } = req.body;

    const normalizedEmail = email?.trim().toLowerCase();

    if (
      !fullName?.trim() ||
      !normalizedEmail ||
      !mobileNo?.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Required team leader details are missing",
      });
    }

    const isUserExists = await User.findOne({
      email: normalizedEmail,
    });

    if (isUserExists) {
      return res.status(409).json({
        message: "user already exists",
      });
    }

    const user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      mobileNo: mobileNo.trim(),
      startDate,
      endDate,
      role: "teamleader",
      password,
    });

    return res.status(201).json({
      message: "Team leader created successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Create team leader error:", err);

    return res.status(500).json({
      message: "internal server error",
    });
  }
}

export async function getAllTeamLeaders(req, res) {
  try {
    const teamLeaders = await User.find({
      role: "teamleader",
    })
      .select("fullName email mobileNo")
      .sort({ fullName: 1 });

    return res.status(200).json({
      teamLeaders,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
}

export async function getInternsByTeamLeader(req, res) {
  try {
    const teamLeader = await User.findOne({
      _id: req.params.id,
      role: "teamleader",
    }).select("fullName email");

    if (!teamLeader) {
      return res.status(404).json({
        message: "Team leader not found",
      });
    }

    const interns = await User.find({
      role: "intern",
      "internshipDetails.teamleaderEmail":
        teamLeader.email.toLowerCase(),
    }).select(
      "fullName email internCode domain startDate endDate internshipDetails.status"
    );

    return res.status(200).json({
      teamLeader: {
        fullName: teamLeader.fullName,
        email: teamLeader.email,
      },
      interns,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
}

// ======================================================
// CERTIFICATE REQUEST MANAGEMENT
// ======================================================

export const getForwardedRequests = async (req, res) => {
  try {
    const requests = await CertificateRequest.find({
      $or: [
        {
          status: "processing",
        },
        {
          status: "approved",
          certificateId: { $exists: false },
        },
        {
          status: "approved",
          certificateId: null,
        },
      ],
    })
      .populate(
        "userId",
        "fullName email internCode domain"
      )
      .sort({ requestedAt: -1 });

    return res.json({
      requests,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// ======================================================
// DAY 3 / DAY 4 - APPROVAL + AUTOMATIC DRAFT
// ======================================================

export const finalizeRequest = async (req, res) => {
  try {
    const { action, rejectionReason } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        message: 'action must be "approve" or "reject"',
      });
    }

    const request = await CertificateRequest.findById(
      req.params.id
    );

    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    if (request.status !== "processing") {
      return res.status(409).json({
        message: "This request is not awaiting admin decision",
      });
    }

    if (action === "reject" && !rejectionReason) {
      return res.status(400).json({
        message: "rejectionReason is required when rejecting",
      });
    }

    request.status =
      action === "approve" ? "approved" : "rejected";

    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();

    if (action === "reject") {
      request.rejectionReason = rejectionReason;
    }

    await request.save();

    if (action === "approve") {
      try {
        await createCertificateDraft(request._id);
      } catch (draftError) {
        return res.status(500).json({
          message:
            "Request approved, but certificate draft generation failed",
          error: draftError.message,
        });
      }
    }

    return res.json({
      request,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// ======================================================
// DAY 3 - CERTIFICATE DRAFT FETCH
// ======================================================

export const getCertificateDraft = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate(
        "userId",
        "fullName email internCode domain startDate endDate"
      )
      .populate(
        "templateId",
        "name certificateType isActive"
      )
      .populate(
        "requestId",
        "requestNumber certificateType status reason"
      );

    if (!certificate) {
      return res.status(404).json({
        message: "Certificate draft not found",
      });
    }

    if (certificate.status !== "draft") {
      return res.status(409).json({
        message: "Certificate is not in draft status",
      });
    }

    return res.status(200).json({
      certificate,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// ======================================================
// DAY 3 - UPDATE CERTIFICATE DRAFT
// ======================================================

export const updateCertificateDraft = async (req, res) => {
  try {
    const { htmlContent } = req.body;

    if (
      typeof htmlContent !== "string" ||
      !htmlContent.trim()
    ) {
      return res.status(400).json({
        message: "htmlContent is required",
      });
    }

    const certificate = await Certificate.findById(
      req.params.id
    );

    if (!certificate) {
      return res.status(404).json({
        message: "Certificate draft not found",
      });
    }

    if (certificate.status !== "draft") {
      return res.status(409).json({
        message: "Only draft certificates can be edited",
      });
    }

    certificate.htmlContent = htmlContent;

    await certificate.save();

    return res.status(200).json({
      certificate,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// ======================================================
// DAY 4 - FINALIZE CERTIFICATE + EMAIL PDF
// ======================================================

export const finalizeCertificateHandler = async (req, res) => {
  try {
    const result = await finalizeCertificate(req.params.id);

    const emailResult = await sendEmail({
      to: result.user.email,
      subject: "Your UPTOSKILL Certificate",
      html: `
        <p>Hi ${result.user.fullName},</p>

        <p>
          Your certificate has been finalized successfully.
        </p>

        <p>
          Please find your certificate attached to this email.
        </p>

        <p>
          Regards,<br />
          UPTOSKILL
        </p>
      `,
      attachments: [
        {
          filename: `certificate-${result.certificate._id}.pdf`,
          path: result.pdfPath,
          contentType: "application/pdf",
        },
      ],
    });

    result.certificate.emailSentAt = new Date();

    await result.certificate.save();

    return res.status(200).json({
      message:
        "Certificate finalized and email sent successfully",
      certificate: result.certificate,
      request: result.request,
      emailMessageId: emailResult?.messageId,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Unable to finalize certificate",
      error: err.message,
    });
  }
};

// ======================================================
// CERTIFICATE TEMPLATE MANAGEMENT
// ======================================================

export const createTemplate = async (req, res) => {
  try {
    const {
      name,
      certificateType,
      htmlContent = "",
      templateType = "html",
      pdfPath = "",
      pdfUrl = "",
      isActive = true,
    } = req.body;

    if (!name?.trim() || !certificateType?.trim()) {
      return res.status(400).json({
        message: "name and certificateType are required",
      });
    }

    if (!["html", "pdf"].includes(templateType)) {
      return res.status(400).json({
        message: "templateType must be either html or pdf",
      });
    }

    if (
      templateType === "html" &&
      !htmlContent?.trim()
    ) {
      return res.status(400).json({
        message:
          "htmlContent is required for HTML templates",
      });
    }

    if (
      templateType === "pdf" &&
      !pdfPath?.trim()
    ) {
      return res.status(400).json({
        message:
          "pdfPath is required for PDF templates",
      });
    }

    const active = Boolean(isActive);

    if (active) {
      await CertificateTemplate.updateMany(
        {
          certificateType: certificateType.trim(),
        },
        {
          $set: {
            isActive: false,
          },
        }
      );
    }

    const template = await CertificateTemplate.create({
      name: name.trim(),
      certificateType: certificateType.trim(),
      htmlContent:
        templateType === "html"
          ? htmlContent
          : "",
      templateType,
      pdfPath:
        templateType === "pdf"
          ? pdfPath
          : "",
      pdfUrl:
        templateType === "pdf"
          ? pdfUrl
          : "",
      isActive: active,
      createdBy: req.user.id,
    });

    return res.status(201).json({
      template,
    });
  } catch (err) {
    console.error("Create template error:", err);

    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// ======================================================
// PDF TEMPLATE UPLOAD
// ======================================================

export const uploadCertificateTemplatePdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "PDF file is required",
      });
    }

    const {
      name,
      certificateType,
      isActive = true,
    } = req.body;

    if (!name?.trim() || !certificateType?.trim()) {
      return res.status(400).json({
        message: "name and certificateType are required",
      });
    }

    const active = Boolean(isActive);

    if (active) {
      await CertificateTemplate.updateMany(
        {
          certificateType: certificateType.trim(),
        },
        {
          $set: {
            isActive: false,
          },
        }
      );
    }

    const template = await CertificateTemplate.create({
      name: name.trim(),
      certificateType: certificateType.trim(),
      templateType: "pdf",
      htmlContent: "",
      pdfPath: req.file.path,
      pdfUrl: `/uploads/template-pdfs/${req.file.filename}`,
      isActive: active,
      createdBy: req.user.id,
    });

    return res.status(201).json({
      message:
        "PDF certificate template uploaded successfully",
      template,
    });
  } catch (err) {
    console.error(
      "Upload PDF template error:",
      err
    );

    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const getAllTemplates = async (req, res) => {
  try {
    const templates = await CertificateTemplate.find()
      .populate("createdBy", "fullName email")
      .sort({
        certificateType: 1,
        updatedAt: -1,
      });

    return res.status(200).json({
      templates,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const updateTemplate = async (req, res) => {
  try {
    const {
      name,
      certificateType,
      htmlContent,
      isActive,
    } = req.body;

    const template = await CertificateTemplate.findById(
      req.params.id
    );

    if (!template) {
      return res.status(404).json({
        message: "Template not found",
      });
    }

    const nextType =
      certificateType?.trim() ||
      template.certificateType;

    if (isActive === true) {
      await CertificateTemplate.updateMany(
        {
          certificateType: nextType,
          _id: {
            $ne: template._id,
          },
        },
        {
          $set: {
            isActive: false,
          },
        }
      );
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          message: "name cannot be empty",
        });
      }

      template.name = name.trim();
    }

    if (certificateType !== undefined) {
      if (!certificateType.trim()) {
        return res.status(400).json({
          message:
            "certificateType cannot be empty",
        });
      }

      template.certificateType =
        certificateType.trim();
    }

    if (htmlContent !== undefined) {
      if (!htmlContent.trim()) {
        return res.status(400).json({
          message:
            "htmlContent cannot be empty",
        });
      }

      template.htmlContent = htmlContent;
    }

    if (isActive !== undefined) {
      template.isActive =
        Boolean(isActive);
    }

    await template.save();

    return res.status(200).json({
      template,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const toggleTemplateActive = async (
  req,
  res
) => {
  try {
    const template =
      await CertificateTemplate.findById(
        req.params.id
      );

    if (!template) {
      return res.status(404).json({
        message: "Template not found",
      });
    }

    const nextActive =
      !template.isActive;

    if (nextActive) {
      await CertificateTemplate.updateMany(
        {
          certificateType:
            template.certificateType,
          _id: {
            $ne: template._id,
          },
        },
        {
          $set: {
            isActive: false,
          },
        }
      );
    }

    template.isActive =
      nextActive;

    await template.save();

    return res.status(200).json({
      template,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// ======================================================
// DAY 2 - MANUAL DRAFT GENERATION
// ======================================================

export const generateCertificateDraft =
  async (req, res) => {
    try {
      const certificate =
        await createCertificateDraft(
          req.params.requestId
        );

      return res.status(201).json({
        certificate,
      });
    } catch (err) {
      const message =
        err.message ||
        "Unable to generate certificate draft";

      const status =
        message.includes("not found")
          ? 404
          : 400;

      return res.status(status).json({
        message,
      });
    }
  };

// ======================================================
// DAY 5 - CERTIFICATE OVERSIGHT
// ======================================================

export const getAllCertificates =
  async (req, res) => {
    try {
      const certificates =
        await Certificate.find()
          .populate(
            "userId",
            "fullName email internCode domain"
          )
          .populate(
            "requestId",
            "requestNumber certificateType status requestedAt"
          )
          .populate(
            "templateId",
            "name certificateType"
          )
          .sort({
            createdAt: -1,
          });

      return res.status(200).json({
        certificates,
      });
    } catch (err) {
      return res.status(500).json({
        message: "Server error",
        error: err.message,
      });
    }
  };

export const retryCertificateGeneration =
  async (req, res) => {
    try {
      const request =
        await CertificateRequest.findById(
          req.params.id
        );

      if (!request) {
        return res.status(404).json({
          message: "Request not found",
        });
      }

      if (request.status !== "approved") {
        return res.status(409).json({
          message:
            "Retry generation is only available for approved requests",
        });
      }

      if (request.certificateId) {
        return res.status(409).json({
          message:
            "A certificate has already been generated for this request",
        });
      }

      const certificate =
        await createCertificateDraft(
          request._id
        );

      return res.status(201).json({
        message:
          "Certificate draft generated successfully",
        certificate,
      });
    } catch (err) {
      return res.status(500).json({
        message:
          "Unable to retry certificate generation",
        error: err.message,
      });
    }
  };