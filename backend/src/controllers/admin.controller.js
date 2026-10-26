import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from "../models/User.js";
import Certificate from '../models/Certificate.js';
import CertificateRequest from '../models/CertificateRequest.js';
import CertificateTemplate from '../models/CertificateTemplate.js';
import RetentionPolicy from '../models/RetentionPolicy.js';
import Handlebars from 'handlebars';
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { generateInternCode } from "../utils/generateInternCode.js";
import {
  createCertificateDraft,
  getCertificateDraft as fetchCertificateDraft,
  updateCertificateDraft as modifyCertificateDraft,
  finalizeCertificate as finalizeCertificateService,
  sendCertificateEmail
} from '../services/certificate.service.js';
import { logAudit } from '../utils/auditLogger.js';
import { invalidateAnalyticsCache } from '../utils/redisCache.js';
import { logAction } from '../utils/logAction.js';
import {
  USER_CREATED,
  REQUEST_APPROVED,
  REQUEST_REJECTED,
  TEMPLATE_CREATED,
  TEMPLATE_UPDATED,
  RETENTION_POLICY_UPDATED,
  INTERN_RESTORED,
  CERTIFICATE_REVOKED,
  CERTIFICATE_UNREVOKED,
} from '../utils/auditActions.js';
import {
  notify,
  REQUEST_APPROVED as NOTIF_REQUEST_APPROVED,
  REQUEST_REJECTED as NOTIF_REQUEST_REJECTED,
  CERTIFICATE_SENT as NOTIF_CERTIFICATE_SENT,
  CERTIFICATE_REVOKED as NOTIF_CERTIFICATE_REVOKED,
} from '../services/notification.service.js';

dotenv.config();

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
            teamleaderEmail,
            teamLeaderId
        } = req.body;

        const isUserExists = await User.findOne({ email: email.toLowerCase() });

        if (isUserExists) {
            return res.status(409).json({
                message: "user already exists"
            })
        };

        let tl = null;
        if (teamLeaderId) {
            if (!mongoose.Types.ObjectId.isValid(teamLeaderId)) {
                return res.status(400).json({ message: 'Invalid teamLeaderId format' });
            }
            tl = await User.findOne({ _id: teamLeaderId, role: 'teamleader' });
            if (!tl) return res.status(400).json({ message: 'No team leader found with this ID' });
        } else if (teamleaderEmail) {
            tl = await User.findOne({ email: teamleaderEmail.toLowerCase(), role: 'teamleader' });
            if (!tl) return res.status(400).json({ message: 'No team leader found with this email' });
        }

        const internCode = await generateInternCode();

        const user = await User.create({
            fullName,
            email: email.toLowerCase(),
            mobileNo,
            internCode,
            domain,
            startDate,
            endDate,
            role: "intern",
            internshipDetails: {
                teamLeader: tl?._id,
                teamLeaderId: tl?._id,
                teamleaderEmail: tl?.email?.toLowerCase(),
                status: 'upcoming',
                createdBy: req.user.id
            }
        });


        logAction({ req, actor: { id: req.user.id, role: 'admin' }, action: USER_CREATED, targetType: 'User', targetId: user._id, meta: { role: 'intern', email: user.email, fullName } });

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

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? (process.env.COOKIE_SAME_SITE || 'none') : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        logAction({ req, actor: { id: req.user.id, role: 'admin' }, action: USER_CREATED, targetType: 'User', targetId: user._id, meta: { role: 'teamleader', email: user.email, fullName } });

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

export async function getAllInterns(req, res) {
    try {
        const filter = { role: 'intern', isArchived: { $ne: true } };

        if (req.query.search) {
            const s = req.query.search.trim();
            filter.$and = [
                {
                    $or: [
                        { fullName: { $regex: s, $options: 'i' } },
                        { email: { $regex: s, $options: 'i' } },
                        { internCode: { $regex: s, $options: 'i' } },
                        { domain: { $regex: s, $options: 'i' } }
                    ]
                }
            ];
        }

        if (req.query.domain) {
            filter.domain = req.query.domain;
        }

        if (req.query.status) {
            filter['internshipDetails.status'] = req.query.status;
        }

        if (req.query.teamLeaderId) {
            if (mongoose.Types.ObjectId.isValid(req.query.teamLeaderId)) {
                filter.$or = [
                    { 'internshipDetails.teamLeaderId': req.query.teamLeaderId },
                    { 'internshipDetails.teamLeader': req.query.teamLeaderId },
                    { 'internshipDetails.teamleaderEmail': req.query.teamLeaderId.toLowerCase() }
                ];
            } else {
                filter['internshipDetails.teamleaderEmail'] = req.query.teamLeaderId.toLowerCase();
            }
        }

        const interns = await User.find(filter)
            .select('-password -resetPasswordToken -resetPasswordExpires')
            .populate('internshipDetails.teamLeader', 'fullName email mobileNo')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: 'Interns fetched successfully',
            interns,
            total: interns.length
        });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
}

export async function getInternById(req, res) {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid intern ID format' });
        }

        const intern = await User.findOne({ _id: id, role: 'intern', isArchived: { $ne: true } })
            .select('-password -resetPasswordToken -resetPasswordExpires')
            .populate('internshipDetails.teamLeader', 'fullName email mobileNo');

        if (!intern) {
            return res.status(404).json({ message: 'Intern not found' });
        }

        const requests = await CertificateRequest.find({ userId: intern._id }).sort({ requestedAt: -1 });
        const certificates = await Certificate.find({ userId: intern._id, status: 'finalized' })
            .select('-htmlContent')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: 'Intern fetched successfully',
            intern,
            requests,
            certificates
        });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
}

export async function updateIntern(req, res) {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid intern ID format' });
        }

        if (
            req.body.role !== undefined ||
            req.body.password !== undefined ||
            req.body.email !== undefined ||
            req.body.internCode !== undefined
        ) {
            return res.status(403).json({ message: 'Cannot modify role, email, password, or intern code via this endpoint' });
        }

        const intern = await User.findOne({ _id: id, role: 'intern' });
        if (!intern) {
            return res.status(404).json({ message: 'Intern not found' });
        }

        const {
            fullName,
            mobileNo,
            domain,
            startDate,
            endDate,
            collegeName,
            degree,
            internshipTitle,
            mentor,
            performanceRemarks,
            status
        } = req.body;

        const effectiveStart = startDate !== undefined ? new Date(startDate) : intern.startDate;
        const effectiveEnd = endDate !== undefined ? new Date(endDate) : intern.endDate;
        if (effectiveStart && effectiveEnd && effectiveStart > effectiveEnd) {
            return res.status(400).json({ message: 'Start date cannot be after end date' });
        }

        if (status !== undefined && !['upcoming', 'ongoing', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value. Must be upcoming, ongoing, completed, or cancelled' });
        }

        const changes = {};
        if (fullName !== undefined) { changes.fullName = { from: intern.fullName, to: fullName }; intern.fullName = fullName; }
        if (mobileNo !== undefined) { changes.mobileNo = { from: intern.mobileNo, to: mobileNo }; intern.mobileNo = mobileNo; }
        if (domain !== undefined) { changes.domain = { from: intern.domain, to: domain }; intern.domain = domain; }
        if (startDate !== undefined) { changes.startDate = { from: intern.startDate, to: startDate }; intern.startDate = startDate; }
        if (endDate !== undefined) { changes.endDate = { from: intern.endDate, to: endDate }; intern.endDate = endDate; }

        if (!intern.internshipDetails) intern.internshipDetails = {};
        if (collegeName !== undefined) { changes.collegeName = { from: intern.internshipDetails.collegeName, to: collegeName }; intern.internshipDetails.collegeName = collegeName; }
        if (degree !== undefined) { changes.degree = { from: intern.internshipDetails.degree, to: degree }; intern.internshipDetails.degree = degree; }
        if (internshipTitle !== undefined) { changes.internshipTitle = { from: intern.internshipDetails.internshipTitle, to: internshipTitle }; intern.internshipDetails.internshipTitle = internshipTitle; }
        if (mentor !== undefined) { changes.mentor = { from: intern.internshipDetails.mentor, to: mentor }; intern.internshipDetails.mentor = mentor; }
        if (performanceRemarks !== undefined) { changes.performanceRemarks = { from: intern.internshipDetails.performanceRemarks, to: performanceRemarks }; intern.internshipDetails.performanceRemarks = performanceRemarks; }
        if (status !== undefined) { changes.status = { from: intern.internshipDetails.status, to: status }; intern.internshipDetails.status = status; }

        await intern.save();

        await logAudit({
            userId: req.user.id,
            action: 'UPDATE_INTERN_BY_ADMIN',
            entityType: 'User',
            entityId: intern._id,
            description: changes,
            req
        });

        const sanitizedIntern = await User.findById(intern._id)
            .select('-password -resetPasswordToken -resetPasswordExpires')
            .populate('internshipDetails.teamLeader', 'fullName email mobileNo');

        return res.status(200).json({
            message: 'Intern updated successfully',
            intern: sanitizedIntern
        });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
}

export async function assignInternTeamLeader(req, res) {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid intern ID format' });
        }

        const intern = await User.findOne({ _id: id, role: 'intern' });
        if (!intern) {
            return res.status(404).json({ message: 'Intern not found' });
        }

        const { teamLeaderId } = req.body;
        if (!teamLeaderId) {
            return res.status(400).json({ message: 'teamLeaderId is required' });
        }

        if (!mongoose.Types.ObjectId.isValid(teamLeaderId)) {
            return res.status(400).json({ message: 'Invalid teamLeaderId format' });
        }

        const tl = await User.findOne({ _id: teamLeaderId, role: 'teamleader' });
        if (!tl) {
            return res.status(404).json({ message: 'Team leader not found' });
        }

        if (!intern.internshipDetails) intern.internshipDetails = {};
        const prevTlId = intern.internshipDetails.teamLeader;
        const prevTlEmail = intern.internshipDetails.teamleaderEmail;

        intern.internshipDetails.teamLeader = tl._id;
        intern.internshipDetails.teamleaderEmail = tl.email.toLowerCase();
        await intern.save();

        await logAudit({
            userId: req.user.id,
            action: prevTlId ? 'REASSIGN_INTERN_TEAM_LEADER' : 'ASSIGN_INTERN_TEAM_LEADER',
            entityType: 'User',
            entityId: intern._id,
            description: {
                previousTeamLeaderId: prevTlId,
                previousTeamLeaderEmail: prevTlEmail,
                newTeamLeaderId: tl._id,
                newTeamLeaderEmail: tl.email.toLowerCase()
            },
            req
        });

        const sanitizedIntern = await User.findById(intern._id)
            .select('-password -resetPasswordToken -resetPasswordExpires')
            .populate('internshipDetails.teamLeader', 'fullName email mobileNo');

        return res.status(200).json({
            message: 'Team leader assigned successfully',
            intern: sanitizedIntern
        });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
}

export async function getAllTeamLeaders(req, res) {
    try {
        const filter = { role: 'teamleader' };
        if (req.query.search) {
            const s = req.query.search.trim();
            filter.$or = [
                { fullName: { $regex: s, $options: 'i' } },
                { email: { $regex: s, $options: 'i' } },
                { mobileNo: { $regex: s, $options: 'i' } }
            ];
        }

        const teamLeaders = await User.find(filter)
            .select('fullName email mobileNo startDate endDate createdAt')
            .sort({ fullName: 1 });

        const populated = await Promise.all(
            teamLeaders.map(async (tl) => {
                const count = await User.countDocuments({
                    role: 'intern',
                    $or: [
                        { 'internshipDetails.teamLeader': tl._id },
                        { 'internshipDetails.teamleaderEmail': tl.email.toLowerCase() }
                    ]
                });
                return {
                    ...tl.toObject(),
                    assignedInternCount: count
                };
            })
        );

        return res.status(200).json({ teamLeaders: populated });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
}

export async function getTeamLeaderById(req, res) {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid team leader ID format' });
        }

        const teamLeader = await User.findOne({ _id: id, role: 'teamleader' })
            .select('fullName email mobileNo startDate endDate createdAt');

        if (!teamLeader) {
            return res.status(404).json({ message: 'Team leader not found' });
        }

        const assignedInterns = await User.find({
            role: 'intern',
            $or: [
                { 'internshipDetails.teamLeaderId': teamLeader._id },
                { 'internshipDetails.teamLeader': teamLeader._id },
                { 'internshipDetails.teamleaderEmail': teamLeader.email.toLowerCase() }
            ]
        })
            .select('fullName email internCode domain startDate endDate internshipDetails.status')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            teamLeader: {
                ...teamLeader.toObject(),
                assignedInternCount: assignedInterns.length
            },
            assignedInterns
        });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
}

export async function updateTeamLeader(req, res) {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid team leader ID format' });
        }

        if (req.body.role !== undefined || req.body.password !== undefined || req.body.email !== undefined) {
            return res.status(403).json({ message: 'Cannot modify role, email, or credentials via this endpoint' });
        }

        const teamLeader = await User.findOne({ _id: id, role: 'teamleader' });
        if (!teamLeader) {
            return res.status(404).json({ message: 'Team leader not found' });
        }

        const { fullName, mobileNo, startDate, endDate } = req.body;
        const effectiveStart = startDate !== undefined ? new Date(startDate) : teamLeader.startDate;
        const effectiveEnd = endDate !== undefined ? new Date(endDate) : teamLeader.endDate;
        if (effectiveStart && effectiveEnd && effectiveStart > effectiveEnd) {
            return res.status(400).json({ message: 'Start date cannot be after end date' });
        }

        const changes = {};
        if (fullName !== undefined) { changes.fullName = { from: teamLeader.fullName, to: fullName }; teamLeader.fullName = fullName; }
        if (mobileNo !== undefined) { changes.mobileNo = { from: teamLeader.mobileNo, to: mobileNo }; teamLeader.mobileNo = mobileNo; }
        if (startDate !== undefined) { changes.startDate = { from: teamLeader.startDate, to: startDate }; teamLeader.startDate = startDate; }
        if (endDate !== undefined) { changes.endDate = { from: teamLeader.endDate, to: endDate }; teamLeader.endDate = endDate; }

        await teamLeader.save();

        await logAudit({
            userId: req.user.id,
            action: 'UPDATE_TEAM_LEADER_BY_ADMIN',
            entityType: 'User',
            entityId: teamLeader._id,
            description: changes,
            req
        });

        const sanitized = await User.findById(teamLeader._id).select('fullName email mobileNo startDate endDate role createdAt');

        return res.status(200).json({
            message: 'Team leader updated successfully',
            teamLeader: sanitized
        });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
}

export async function getInternsByTeamLeader(req, res) {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid team leader ID format' });
        }
        const teamLeader = await User.findOne({
            _id: req.params.id,
            role: 'teamleader'
        }).select('fullName email');

        if (!teamLeader) {
            return res.status(404).json({ message: 'Team leader not found' });
        }

        const interns = await User.find({
            role: 'intern',
            isArchived: { $ne: true },
            $or: [
                { 'internshipDetails.teamLeaderId': teamLeader._id },
                { 'internshipDetails.teamLeader': teamLeader._id },
                { 'internshipDetails.teamleaderEmail': teamLeader.email.toLowerCase() }
            ]
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


// Admin sees requests TL has forwarded, plus approved requests missing certificateId for recovery
export const getForwardedRequests = async (req, res) => {
  try {
    const { status = 'forwarded' } = req.query;
    let query = {};

    if (status === 'pending') {
      query = { status: 'pending' };
    } else if (status === 'all') {
      query = {};
    } else if (status === 'processing') {
      query = { status: 'processing' };
    } else {
      // Default: processing + approved awaiting certificate recovery
      query = {
        $or: [
          { status: 'processing' },
          { status: 'approved', certificateId: { $in: [null, undefined] } }
        ]
      };
    }

    const [requests, pendingCount, forwardedCount, totalCount] = await Promise.all([
      CertificateRequest.find(query)
        .populate('userId', 'fullName email internCode domain')
        .populate('forwardedBy', 'fullName email')
        .populate('reviewedBy', 'fullName email')
        .sort({ requestedAt: -1 }),
      CertificateRequest.countDocuments({ status: 'pending' }),
      CertificateRequest.countDocuments({
        $or: [
          { status: 'processing' },
          { status: 'approved', certificateId: { $in: [null, undefined] } }
        ]
      }),
      CertificateRequest.countDocuments({}),
    ]);

    res.json({
      requests,
      counts: {
        forwarded: forwardedCount,
        pending: pendingCount,
        all: totalCount,
      }
    });
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

    if (!['processing', 'pending'].includes(request.status)) {
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
      certificate = await createCertificateDraft(request._id);
    }

    await invalidateAnalyticsCache();

    if (action === 'approve') {
      logAction({ req, actor: { id: req.user.id, role: 'admin' }, action: REQUEST_APPROVED, targetType: 'CertificateRequest', targetId: request._id, meta: { requestId: request._id } });

      // Trigger 4: Request approved -> notify intern (in-app and email)
      await notify(request.userId, NOTIF_REQUEST_APPROVED, {
        title: 'Certificate Request Approved',
        message: `Your certificate request (${request.requestNumber || 'Request'}) has been approved by the Admin.`,
        requestId: request._id,
        email: true,
      });
    } else {
      logAction({ req, actor: { id: req.user.id, role: 'admin' }, action: REQUEST_REJECTED, targetType: 'CertificateRequest', targetId: request._id, meta: { requestId: request._id, rejectionReason } });

      // Trigger 3: Request rejected by Admin -> notify intern (in-app and email)
      await notify(request.userId, NOTIF_REQUEST_REJECTED, {
        title: 'Certificate Request Rejected',
        message: `Your certificate request (${request.requestNumber || 'Request'}) was rejected by the Admin. Reason: ${rejectionReason}`,
        requestId: request._id,
        email: true,
      });
    }

    res.json({ request, certificate });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message || 'Server error', error: err.message });
  }
};

export const getCertificateDraft = async (req, res) => {
  try {
    const certificate = await fetchCertificateDraft(req.params.id);
    res.status(200).json({ certificate });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message || 'Server error' });
  }
};

export const updateCertificateDraft = async (req, res) => {
  try {
    const { htmlContent } = req.body;
    const certificate = await modifyCertificateDraft(req.params.id, htmlContent);
    res.status(200).json({ message: 'Draft saved successfully', certificate });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message || 'Server error' });
  }
};

export const finalizeCertificate = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Finalize certificate and render PDF
    const { certificate, request, absolutePdfPath } = await finalizeCertificateService(id);
    await invalidateAnalyticsCache();

    // 2. Send email with PDF attachment
    let emailSent = false;
    let emailError = null;

    try {
      await sendCertificateEmail({
        certificate,
        absolutePdfPath,
        user: certificate.userId
      });
      emailSent = true;
    } catch (mailErr) {
      emailError = mailErr.message || 'Email delivery failed';
    }

    // Trigger 5: Certificate finalized and sent -> notify intern (in-app only)
    await notify(certificate.userId?._id || certificate.userId, NOTIF_CERTIFICATE_SENT, {
      title: 'Certificate Issued',
      message: `Your certificate (${certificate.certificateNumber || 'Certificate'}) has been finalized and issued.`,
      requestId: request?._id,
      email: false,
    });

    if (emailError) {
      return res.status(207).json({
        message: 'Certificate finalized and PDF generated successfully, but email delivery could not be completed.',
        certificate,
        request,
        emailSent: false,
        emailError
      });
    }

    return res.status(200).json({
      message: 'Certificate finalized, PDF generated, and email sent successfully.',
      certificate,
      request,
      emailSent: true
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ message: err.message || 'Server error', error: err.message });
  }
};

/**
 * Day 5 Admin Overview: Retrieves all certificates with safe intern details.
 */
export const getAllCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find()
      .populate('userId', 'fullName email internCode domain')
      .select('certificateNumber verifyId certificateType domain issuedDate status pdfPath internCode userId createdAt isRevoked revokedAt revokedReason recipientName certificateTitle')
      .sort({ createdAt: -1 });

    return res.status(200).json({ certificates });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Day 5 Retry Generation: Recovers an approved CertificateRequest that lacks a certificate.
 * Reuses createCertificateDraft without duplicate generation or auto-finalization.
 */
export const retryCertificateGeneration = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid request ID' });
    }

    const request = await CertificateRequest.findById(id).populate('userId', 'fullName email internCode domain');
    if (!request) {
      return res.status(404).json({ message: 'Certificate request not found' });
    }

    // Eligibility validation: request must be approved
    if (request.status !== 'approved') {
      return res.status(400).json({
        message: `Request with status '${request.status}' is not eligible for retry. Only approved requests can be retried.`
      });
    }

    // Duplicate check: if certificateId is already present and valid
    if (request.certificateId) {
      const existingCert = await Certificate.findById(request.certificateId);
      if (existingCert) {
        return res.status(409).json({
          message: 'A certificate is already linked to this request',
          certificate: existingCert,
          request
        });
      }
    }

    // Re-use existing createCertificateDraft service
    const certificate = await createCertificateDraft(request._id);
    await invalidateAnalyticsCache();

    return res.status(200).json({
      message: 'Certificate draft generated successfully',
      certificate,
      request
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ message: err.statusCode ? err.message : 'Internal server error' });
  }
};

/**
 * Day 5 Admin PDF Download: Securely streams the finalized certificate PDF for admin audit.
 */
export const downloadCertificatePdf = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid certificate ID' });
    }

    const certificate = await Certificate.findById(id);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    if (!certificate.pdfPath || certificate.status !== 'finalized') {
      return res.status(400).json({ message: 'PDF has not been finalized or generated for this certificate' });
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const absolutePath = path.resolve(__dirname, '../../', certificate.pdfPath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: 'Certificate PDF file is unavailable on server' });
    }

    const safeFileName = `${(certificate.certificateNumber || 'Certificate').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    return res.download(absolutePath, safeFileName);
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const REQUIRED_TEMPLATE_PLACEHOLDERS = [
  "{{fullName}}",
  "{{internCode}}",
  "{{domain}}",
  "{{startDate}}",
  "{{endDate}}",
  "{{issueDate}}",
  "{{requestNumber}}",
  "{{certificateTitle}}",
  "{{qrCodeUrl}}"
];

function validateTemplateContent(content) {
  if (!content || typeof content !== "string") {
    return {
      valid: false,
      message: "Template HTML content is required"
    };
  }

  if (!content.includes("{{fullName}}")) {
    return {
      valid: false,
      message: "Template must contain {{fullName}}"
    };
  }

  const openTokens = (content.match(/\{\{/g) || []).length;
  const closeTokens = (content.match(/\}\}/g) || []).length;
  if (openTokens !== closeTokens) {
    return {
      valid: false,
      message: 'Template contains unbalanced {{ and }} placeholder brackets',
    };
  }

  try {
    Handlebars.precompile(content);
  } catch (error) {
    return {
      valid: false,
      message: `Invalid template syntax: ${error.message}`
    };
  }

  const placeholders = [
    ...new Set(content.match(/\{\{[^{}]+\}\}/g) || [])
  ];

  return {
    valid: true,
    placeholders
  };
}
export const getTemplatePlaceholders = async (req, res) => {
  return res.status(200).json({
    placeholders: REQUIRED_TEMPLATE_PLACEHOLDERS
  });
};

// Certificate Template Management
export const createCertificateTemplate = async (req, res) => {
  try {
    const {
      templateCode,
      templateName,
      certificateType,
      title,
      description,
      content,
      htmlContent,
      logoPath,
      backgroundPath,
      signaturePath,
      status
    } = req.body;

    const templateHtml = htmlContent || content;

    const validation = validateTemplateContent(templateHtml);

    if (!validation.valid) {
      return res.status(400).json({
        message: validation.message
      });
    }

    if (!templateCode || !templateName || !certificateType || !title) {
      return res.status(400).json({
        message:
          "templateCode, templateName, certificateType and title are required"
      });
    }

    const existingTemplate = await CertificateTemplate.findOne({
      templateCode: templateCode.trim()
    });

    if (existingTemplate) {
      return res.status(409).json({
        message: "A template with this templateCode already exists"
      });
    }

    const template = await CertificateTemplate.create({
      templateCode: templateCode.trim(),
      templateName: templateName.trim(),
      certificateType: certificateType.trim(),
      title: title.trim(),
      description: description?.trim() || "",
      content: templateHtml,
      htmlContent: templateHtml,
      placeholders: validation.placeholders,
      logoPath,
      backgroundPath,
      signaturePath,
      status: status || "draft",
      version: 1,
      createdBy: req.user.id
    });

    logAction({ req, actor: { id: req.user.id, role: 'admin' }, action: TEMPLATE_CREATED, targetType: 'CertificateTemplate', targetId: template._id, meta: { templateCode: template.templateCode, certificateType: template.certificateType } });

    return res.status(201).json({
      message: "Certificate template created successfully",
      template
    });
  } catch (error) {
    console.error("Create certificate template error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "A template with this templateCode already exists"
      });
    }

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

export const updateCertificateTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid template ID"
      });
    }

    const template = await CertificateTemplate.findById(id);

    if (!template) {
      return res.status(404).json({
        message: "Certificate template not found"
      });
    }

    const {
      templateCode,
      templateName,
      certificateType,
      title,
      description,
      content,
      htmlContent,
      logoPath,
      backgroundPath,
      signaturePath,
      status
    } = req.body;

    const templateHtml =
      htmlContent !== undefined
        ? htmlContent
        : content !== undefined
          ? content
          : template.content;

    const validation = validateTemplateContent(templateHtml);

    if (!validation.valid) {
      return res.status(400).json({
        message: validation.message
      });
    }

    if (
      templateCode !== undefined &&
      templateCode.trim() !== template.templateCode
    ) {
      const duplicate = await CertificateTemplate.findOne({
        templateCode: templateCode.trim(),
        _id: { $ne: id }
      });

      if (duplicate) {
        return res.status(409).json({
          message: "A template with this templateCode already exists"
        });
      }
    }

    template.templateCode =
      templateCode !== undefined
        ? templateCode.trim()
        : template.templateCode;

    template.templateName =
      templateName !== undefined
        ? templateName.trim()
        : template.templateName;

    template.certificateType =
      certificateType !== undefined
        ? certificateType.trim()
        : template.certificateType;

    template.title =
      title !== undefined
        ? title.trim()
        : template.title;

    template.description =
      description !== undefined
        ? description.trim()
        : template.description;

    template.content = templateHtml;
    template.htmlContent = templateHtml;
    template.placeholders = validation.placeholders;

    if (logoPath !== undefined) {
      template.logoPath = logoPath;
    }

    if (backgroundPath !== undefined) {
      template.backgroundPath = backgroundPath;
    }

    if (signaturePath !== undefined) {
      template.signaturePath = signaturePath;
    }

    if (status !== undefined) {
      template.status = status;
    }

    template.version = (template.version || 1) + 1;

    await template.save();

    logAction({ req, actor: { id: req.user.id, role: 'admin' }, action: TEMPLATE_UPDATED, targetType: 'CertificateTemplate', targetId: template._id, meta: { templateCode: template.templateCode, version: template.version } });

    return res.status(200).json({
      message: "Certificate template updated successfully",
      template
    });
  } catch (error) {
    console.error("Update certificate template error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "A template with this templateCode already exists"
      });
    }

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

export const getCertificateTemplates = async (req, res) => {
  try {
    const templates = await CertificateTemplate.find()
      .sort({ createdAt: -1 });

    return res.status(200).json({
      templates
    });
  } catch (error) {
    console.error("Get certificate templates error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

const DEFAULT_RETENTION_POLICY = { graceDays: 30, purgeDays: 90 };

export const getRetentionPolicy = async (req, res) => {
  try {
    const policy = await RetentionPolicy.findOneAndUpdate(
      { policyKey: 'intern' },
      { $setOnInsert: { policyKey: 'intern', ...DEFAULT_RETENTION_POLICY } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json({ policy });
  } catch (error) {
    console.error('Get retention policy error:', error);
    return res.status(500).json({ message: 'Unable to load retention policy.' });
  }
};

export const updateRetentionPolicy = async (req, res) => {
  const graceDays = Number(req.body.graceDays);
  const purgeDays = Number(req.body.purgeDays);

  if (!Number.isInteger(graceDays) || graceDays < 1 ||
      !Number.isInteger(purgeDays) || purgeDays <= graceDays) {
    return res.status(400).json({
      message: 'Grace days must be at least 1, and purge days must be greater than grace days.',
    });
  }

  try {
    const policy = await RetentionPolicy.findOneAndUpdate(
      { policyKey: 'intern' },
      {
        $set: {
          policyKey: 'intern',
          graceDays,
          purgeDays,
          updatedBy: req.user.id,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    console.log(`[retention] policy updated by admin ${req.user.id}: grace=${graceDays}, purge=${purgeDays}`);
    logAction({ req, actor: { id: req.user.id, role: 'admin' }, action: RETENTION_POLICY_UPDATED, targetType: 'RetentionPolicy', targetId: policy._id, meta: { graceDays, purgeDays } });
    return res.status(200).json({ message: 'Retention policy saved.', policy });
  } catch (error) {
    console.error('Update retention policy error:', error);
    return res.status(500).json({ message: 'Unable to save retention policy.' });
  }
};

export const getArchivedInterns = async (req, res) => {
  try {
    const policy = await RetentionPolicy.findOne({ policyKey: 'intern' }).lean();
    const purgeDays = policy?.purgeDays ?? DEFAULT_RETENTION_POLICY.purgeDays;
    const interns = await User.find({
      role: 'intern',
      isArchived: true,
      personalDataPurged: { $ne: true },
    })
      .select('fullName email internCode domain endDate archivedAt')
      .sort({ archivedAt: -1 })
      .lean();

    const now = Date.now();
    const archivedInterns = interns.map((intern) => ({
      ...intern,
      daysLeftBeforePurge: Math.max(0, Math.ceil(
        (new Date(intern.archivedAt).getTime() + purgeDays * 86400000 - now) / 86400000
      )),
    }));

    return res.status(200).json({ interns: archivedInterns, purgeDays });
  } catch (error) {
    console.error('Get archived interns error:', error);
    return res.status(500).json({ message: 'Unable to load archived interns.' });
  }
};

export const restoreArchivedIntern = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid intern ID.' });
  }

  try {
    const intern = await User.findOne({
      _id: req.params.id,
      role: 'intern',
      isArchived: true,
      personalDataPurged: { $ne: true },
    });

    if (!intern) {
      return res.status(404).json({
        message: 'Archived intern not found or personal data has already been purged.',
      });
    }

    intern.isArchived = false;
    intern.archivedAt = null;
    intern.archiveWarningSentAt = null;
    intern.archiveRestoredAt = new Date();
    await intern.save();
    console.log(`[retention] admin ${req.user.id} restored intern ${intern._id}`);
    logAction({ req, actor: { id: req.user.id, role: 'admin' }, action: INTERN_RESTORED, targetType: 'User', targetId: intern._id, meta: { email: intern.email, internCode: intern.internCode } });
    return res.status(200).json({ message: 'Intern restored.', intern: {
      _id: intern._id,
      fullName: intern.fullName,
      internCode: intern.internCode,
      email: intern.email,
      isArchived: intern.isArchived,
    } });
  } catch (error) {
    console.error('Restore archived intern error:', error);
    return res.status(500).json({ message: 'Unable to restore intern.' });
  }
};

/* =========================================================
   REVOKE CERTIFICATE
========================================================= */

/**
 * PATCH /api/admin/certificates/:id/revoke
 * Sets isRevoked, revokedAt, revokedBy, revokedReason.
 * Logs CERTIFICATE_REVOKED and notifies the intern.
 */
export const revokeCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid certificate ID' });
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ message: 'A revocation reason is required.' });
    }

    const certificate = await Certificate.findById(id);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    if (certificate.status !== 'finalized') {
      return res.status(400).json({
        message: `Only finalized certificates can be revoked. Current status: ${certificate.status}`,
      });
    }

    if (certificate.isRevoked) {
      return res.status(409).json({ message: 'Certificate is already revoked.' });
    }

    certificate.isRevoked = true;
    certificate.revokedAt = new Date();
    certificate.revokedBy = req.user.id;
    certificate.revokedReason = reason.trim();
    await certificate.save();

    // Audit log
    logAction({
      req,
      actor: { id: req.user.id, role: 'admin' },
      action: CERTIFICATE_REVOKED,
      targetType: 'Certificate',
      targetId: certificate._id,
      meta: {
        certificateNumber: certificate.certificateNumber,
        reason: reason.trim(),
        userId: certificate.userId,
      },
    });

    // Notify intern
    await notify(certificate.userId, NOTIF_CERTIFICATE_REVOKED, {
      title: 'Certificate Revoked',
      message: `Your certificate (${certificate.certificateNumber}) has been revoked. Reason: ${reason.trim()}`,
      email: true,
    });

    return res.status(200).json({
      message: 'Certificate revoked successfully.',
      certificate: {
        _id: certificate._id,
        certificateNumber: certificate.certificateNumber,
        isRevoked: certificate.isRevoked,
        revokedAt: certificate.revokedAt,
        revokedReason: certificate.revokedReason,
      },
    });
  } catch (err) {
    console.error('Revoke certificate error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/* =========================================================
   UNREVOKE CERTIFICATE
========================================================= */

/**
 * PATCH /api/admin/certificates/:id/unrevoke
 * Reverses a mistaken revocation.
 */
export const unrevokeCertificate = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid certificate ID' });
    }

    const certificate = await Certificate.findById(id);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    if (!certificate.isRevoked) {
      return res.status(409).json({ message: 'Certificate is not currently revoked.' });
    }

    certificate.isRevoked = false;
    certificate.revokedAt = null;
    certificate.revokedBy = null;
    certificate.revokedReason = null;
    await certificate.save();

    // Audit log
    logAction({
      req,
      actor: { id: req.user.id, role: 'admin' },
      action: CERTIFICATE_UNREVOKED,
      targetType: 'Certificate',
      targetId: certificate._id,
      meta: {
        certificateNumber: certificate.certificateNumber,
        userId: certificate.userId,
      },
    });

    return res.status(200).json({
      message: 'Certificate revocation reversed successfully.',
      certificate: {
        _id: certificate._id,
        certificateNumber: certificate.certificateNumber,
        isRevoked: certificate.isRevoked,
      },
    });
  } catch (err) {
    console.error('Unrevoke certificate error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/* =========================================================
   PUBLIC CERTIFICATE VERIFICATION
========================================================= */

/**
 * GET /api/verify/:verifyId   (NO authentication)
 *
 * Returns ONLY safe public fields. Never returns email,
 * mobile number, intern code, or internal Mongo _ids.
 * Uses snapshot fields so verification survives user data purge.
 */
export const verifyCertificatePublic = async (req, res) => {
  try {
    const { verifyId } = req.params;

    // Treat short / missing IDs and non-existent certificates the same way.
    if (!verifyId || verifyId.length < 8) {
      return res.status(404).json({ message: 'Certificate not found.' });
    }

    const certificate = await Certificate.findOne({ verifyId }).lean();

    if (!certificate || certificate.status === 'draft') {
      return res.status(404).json({ message: 'Certificate not found.' });
    }

    const responseData = {
      certificateNumber: certificate.certificateNumber,
      recipientName: certificate.recipientName || '',
      certificateTitle: certificate.certificateTitle || '',
      domain: certificate.domain || '',
      issuedAt: certificate.issuedDate || certificate.finalizedAt || null,
      status: certificate.isRevoked ? 'revoked' : 'valid',
    };

    if (certificate.isRevoked) {
      responseData.revokedAt = certificate.revokedAt;
    }

    return res.status(200).json(responseData);
  } catch (err) {
    console.error('Verify certificate error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
