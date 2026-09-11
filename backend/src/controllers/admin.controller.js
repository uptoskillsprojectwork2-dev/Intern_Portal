import User from "../models/User.js";
import Certificate from "../models/Certificate.js";
import CertificateRequest from '../models/CertificateRequest.js';
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { generateInternCode } from "../utils/generateInternCode.js";
import {
  generateDraftForRequest,
  getDraftCertificateById,
  updateDraftHtmlContent
} from '../services/certificateDraft.service.js';
import {
  finalizeCertificate as finalizeCertService
} from '../services/certificate.service.js';
import { sendEmail } from '../utils/sendEmail.js';

dotenv.config()

export async function createIntern(req, res) {
    try {
        // Intern codes are used as initial passwords and hashed by the User model.
        const {
            fullName,
            email,
            mobileNo,
            domain,
            startDate,
            endDate,
            teamleaderEmail
        } = req.body;

        const isUserExists = await User.findOne({ email });

        if (isUserExists) {
            return res.status(409).json({
                message: "user already exists"
            })
        };

        if (teamleaderEmail) {
            const tl = await User.findOne({ email: teamleaderEmail.toLowerCase(), role: 'teamleader' });
            if (!tl) return res.status(400).json({ message: 'No team leader found with this email' });
        }

        const internCode = await generateInternCode();

        const user = await User.create({
            fullName,
            email,
            mobileNo,
            internCode,
            domain,
            startDate,
            endDate,
            role: "intern",
            password: internCode,
            internshipDetails: {
                teamleaderEmail: teamleaderEmail?.toLowerCase(),
                status: 'upcoming',
                createdBy: req.user.id
            }
        });


        res.status(200).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                email: user.email
            }
        })
    } catch (err) {
        res.status(500).json({
            message: "internal server error"
        })

    }
}

export async function createTeamLeader(req, res) {
    try {
        // Team leader passwords are hashed by the User model before persistence.
        const {
            fullName,
            email,
            mobileNo,
            startDate,
            endDate,
            password,
        } = req.body;

        const isUserExists = await User.findOne({ email });

        if (isUserExists) {
            return res.status(409).json({
                message: "user already exists"
            });
        }

        const user = await User.create({
            fullName,
            email,
            mobileNo,
            startDate,
            endDate,
            role: "teamleader",
            password
        });

        const token = jwt.sign({
            id: user._id,
            email: email
        }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.cookie("token", token);

        res.status(201).json({
            message: "Team leader created successfully",
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({
            message: "internal server error"
        })
    }
}

export async function getAllTeamLeaders(req, res) {
    try {
        const teamLeaders = await User.find({ role: 'teamleader' })
            .select('fullName email mobileNo')
            .sort({ fullName: 1 });

        return res.status(200).json({ teamLeaders });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
}

export async function getInternsByTeamLeader(req, res) {
    try {
        const teamLeader = await User.findOne({
            _id: req.params.id,
            role: 'teamleader'
        }).select('fullName email');

        if (!teamLeader) {
            return res.status(404).json({ message: 'Team leader not found' });
        }

        const interns = await User.find({
            role: 'intern',
            'internshipDetails.teamleaderEmail': teamLeader.email.toLowerCase()
        })
            .select('fullName email internCode domain startDate endDate internshipDetails.status');

        return res.status(200).json({
            teamLeader: {
                fullName: teamLeader.fullName,
                email: teamLeader.email
            },
            interns
        });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
}


// Admin only sees requests TL has already forwarded
export const getForwardedRequests = async (req, res) => {
  try {
    const requests = await CertificateRequest.find({ status: 'processing' })
      .populate('userId', 'fullName email internCode domain')
      .sort({ requestedAt: -1 });

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const finalizeRequest = async (req, res) => {
  try {
    const { action, rejectionReason } = req.body; // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'action must be "approve" or "reject"' });
    }

    const request = await CertificateRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (request.status !== 'processing') {
      return res.status(409).json({ message: 'This request is not awaiting admin decision' });
    }

    if (action === 'reject' && !rejectionReason) {
      return res.status(400).json({ message: 'rejectionReason is required when rejecting' });
    }

    request.status = action === 'approve' ? 'approved' : 'rejected';
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    if (action === 'reject') request.rejectionReason = rejectionReason;

    await request.save();

    let certificate = null;
    if (action === 'approve') {
      certificate = await generateDraftForRequest(request, req.user.id);
    }

    return res.status(200).json({
      message: action === 'approve' ? 'Request approved and draft generated' : 'Request rejected',
      request,
      certificate
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({ message: err.message || 'Server error' });
  }
};

export const getCertificateDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const certificate = await getDraftCertificateById(id);
    return res.status(200).json({ success: true, certificate });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: err.message || 'Server error' });
  }
};

export const updateCertificateDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const { htmlContent } = req.body;
    const certificate = await updateDraftHtmlContent(id, htmlContent);
    return res.status(200).json({
      success: true,
      message: 'Certificate draft updated successfully',
      certificate
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: err.message || 'Server error' });
  }
};

export const finalizeCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    const { certificate, request, filePath } = await finalizeCertService(id, adminId);

    let emailStatus = 'pending';
    let emailError = null;

    const recipientEmail = certificate.userId?.email;
    const recipientName = certificate.userId?.fullName || 'Intern';

    if (recipientEmail) {
      try {
        await sendEmail({
          to: recipientEmail,
          subject: `Your Certificate: ${certificate.certificateNumber}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <h2>Congratulations, ${recipientName}!</h2>
              <p>Your certificate <strong>${certificate.certificateNumber}</strong> has been finalized and issued.</p>
              <p>Please find your certificate attached as a PDF document.</p>
              <br/>
              <p>Best regards,<br/>UPTOSKILL Team</p>
            </div>
          `,
          attachments: [
            {
              filename: `${certificate.certificateNumber}.pdf`,
              path: filePath
            }
          ]
        });
        emailStatus = 'sent';
      } catch (err) {
        emailStatus = 'failed';
        emailError = err.message;
      }
    } else {
      emailStatus = 'skipped_no_email';
    }

    if (emailStatus === 'failed') {
      return res.status(207).json({
        success: true,
        partialSuccess: true,
        message: 'Certificate finalized and PDF generated successfully, but email dispatch failed.',
        certificate,
        request,
        email: {
          status: 'failed',
          error: emailError
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Certificate finalized and PDF generated successfully',
      certificate,
      request,
      email: {
        status: emailStatus
      }
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Server error'
    });
  }
};

export const getAllCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find()
      .select('-htmlContent')
      .populate('userId', 'fullName email internCode domain')
      .populate('templateId', 'templateName certificateType')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      certificates
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

export const downloadCertificatePdf = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid certificate ID format' });
    }

    const certificate = await Certificate.findById(id);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    if (certificate.status === 'draft') {
      return res.status(400).json({
        message: 'Draft certificates do not have a finalized PDF available for download'
      });
    }

    if (!certificate.pdfPath) {
      return res.status(404).json({ message: 'Certificate PDF file path not found' });
    }

    const uploadsBaseDir = path.resolve(process.cwd(), 'uploads');
    const safePdfPath = path.resolve(process.cwd(), certificate.pdfPath);

    const relative = path.relative(uploadsBaseDir, safePdfPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return res.status(403).json({ message: 'Invalid file path' });
    }

    if (!fs.existsSync(safePdfPath)) {
      return res.status(404).json({ message: 'Certificate PDF file not found on disk' });
    }

    const safeCertNum = (certificate.certificateNumber || 'certificate').replace(/[^a-zA-Z0-9_-]/g, '_');
    const downloadFileName = `${safeCertNum}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    return res.download(safePdfPath, downloadFileName);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Server error'
    });
  }
};

export const retryCertificateGeneration = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid request ID format' });
    }

    const request = await CertificateRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Certificate request not found' });
    }

    // Workflow invariant: ONLY for an approved request
    if (request.status !== 'approved') {
      return res.status(400).json({
        message: `Retry generation is only permitted for 'approved' requests. Current status is '${request.status}'`
      });
    }

    // Invariant: request must NOT already have a certificate
    if (request.certificateId) {
      return res.status(409).json({
        message: 'A certificate is already associated with this request. Duplicate generation prevented.'
      });
    }

    // Generate new draft certificate using Day 3 draft generator
    const draft = await generateDraftForRequest(request, req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Draft certificate regenerated successfully',
      certificate: draft,
      request
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Server error'
    });
  }
};