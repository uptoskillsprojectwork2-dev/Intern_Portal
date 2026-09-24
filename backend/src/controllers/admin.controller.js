<<<<<<< HEAD
import CertificateTemplate from '../models/CertificateTemplate.model.js';
import Certificate from '../models/Certificate.model.js';
import CertificateRequest from '../models/CertificateRequest.js';
import { createCertificateDraft, finalizeCertificate } from '../services/certificate.service.js';
import sendEmail from '../utils/sendEmail.js';
import '../models/User.js';

export const getMyInterns = async (req, res) => {
  try {
    const interns = await CertificateRequest.find({}).populate('internId');
    res.status(200).json({ success: true, data: interns });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPendingRequests = async (req, res) => {
  try {
    const pending = await CertificateRequest.find({ status: { $ne: 'approved' } }).populate('internId');
    res.status(200).json({ success: true, data: pending });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateCertificateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const request = await CertificateRequest.findByIdAndUpdate(id, { status }, { new: true });
    if (!request) {
      return res.status(404).json({ success: false, error: "Request not found" });
    }
    res.status(200).json({ success: true, data: request });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const createTemplate = async (req, res) => {
  try {
    const template = await CertificateTemplate.create({ ...req.body, createdBy: req.user?._id || req.body.createdBy });
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getAllTemplates = async (req, res) => {
  try {
    const templates = await CertificateTemplate.find({});
    res.status(200).json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateTemplate = async (req, res) => {
  try {
    const template = await CertificateTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const toggleTemplateActive = async (req, res) => {
  try {
    const template = await CertificateTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: "Template not found" });
    }
    template.isActive = !template.isActive;
    await template.save();
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
=======
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from "../models/User.js";
import Certificate from '../models/Certificate.js';
import CertificateRequest from '../models/CertificateRequest.js';
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
            password: internCode,
            internshipDetails: {
                teamLeader: tl?._id,
                teamleaderEmail: tl?.email?.toLowerCase(),
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

export async function getAllInterns(req, res) {
    try {
        const filter = { role: 'intern' };

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

        const intern = await User.findOne({ _id: id, role: 'intern' })
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
            $or: [
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
    const requests = await CertificateRequest.find({
      $or: [
        { status: 'processing' },
        { status: 'approved', certificateId: { $in: [null, undefined] } }
      ]
    })
      .populate('userId', 'fullName email internCode domain')
      .sort({ requestedAt: -1 });

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
>>>>>>> origin/main
  }
};

export const finalizeRequest = async (req, res) => {
  try {
<<<<<<< HEAD
    const request = await CertificateRequest.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });

    if (!request) {
      return res.status(404).json({ success: false, error: "Request not found" });
    }

    const draft = await createCertificateDraft(request._id);
    res.status(200).json({ success: true, data: { request, draft } });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
=======
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
      certificate = await createCertificateDraft(request._id);
    }

    res.json({ request, certificate });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message || 'Server error', error: err.message });
>>>>>>> origin/main
  }
};

export const getCertificateDraft = async (req, res) => {
  try {
<<<<<<< HEAD
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) {
      return res.status(404).json({ success: false, error: "Certificate draft not found" });
    }
    res.status(200).json({ success: true, data: certificate });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
=======
    const certificate = await fetchCertificateDraft(req.params.id);
    res.status(200).json({ certificate });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message || 'Server error' });
>>>>>>> origin/main
  }
};

export const updateCertificateDraft = async (req, res) => {
  try {
<<<<<<< HEAD
    const certificate = await Certificate.findByIdAndUpdate(req.params.id, { htmlContent: req.body.htmlContent }, { new: true });
    if (!certificate) {
      return res.status(404).json({ success: false, error: "Certificate draft not found" });
    }
    res.status(200).json({ success: true, data: certificate });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const finalizeAndSendCertificate = async (req, res) => {
  try {
    const { certificate, pdfBuffer } = await finalizeCertificate(req.params.id);
    const request = await CertificateRequest.findById(certificate.request).populate('internId');

    if (!request || !request.internId) {
      return res.status(404).json({ success: false, error: "Associated request or user not found" });
    }

    await sendEmail({
      to: request.internId.email,
      subject: 'Your Certificate is Ready',
      html: '<p>Please find your attached certificate.</p>',
      attachments: [{ filename: 'certificate.pdf', content: pdfBuffer }]
    });

    certificate.emailSentAt = new Date();
    await certificate.save();

    res.status(200).json({ success: true, data: certificate });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find({})
      .populate({
        path: 'request',
        populate: { path: 'internId' }
      })
      .populate('template');
    res.status(200).json({ success: true, data: certificates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const retryCertificateGeneration = async (req, res) => {
  try {
    const draft = await createCertificateDraft(req.params.id);
    res.status(201).json({ success: true, data: draft });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
=======
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
      .select('certificateNumber certificateType domain issuedDate status pdfPath internCode userId createdAt')
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
>>>>>>> origin/main
  }
};