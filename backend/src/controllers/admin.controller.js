import User from "../models/User.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { generateInternCode } from "../utils/generateInternCode.js";
import CertificateRequest from '../models/CertificateRequest.js';
import {
  generateDraftForRequest,
  getDraftCertificateById,
  updateDraftHtmlContent
} from '../services/certificateDraft.service.js';

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
    return res.status(statusCode).json({ message: err.message || 'Server error' });
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
    return res.status(statusCode).json({ message: err.message || 'Server error' });
  }
};