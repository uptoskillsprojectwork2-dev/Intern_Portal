import User from "../models/User.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { query, validationResult } from "express-validator";
import { generateInternCode } from "../utils/generateInternCode.js";
import CertificateRequest from '../models/CertificateRequest.js';
import {
  clearAnalyticsCache,
  exportAnalytics,
  getCertificateTypesAnalytics,
  getDomainsAnalytics,
  getOverviewAnalytics,
  getPipelineAnalytics,
  getRequestsTrendAnalytics,
  getStuckRequestsAnalytics,
  getTeamLeaderPerformanceAnalytics,
  getTurnaroundAnalytics,
  getUpcomingCompletionsAnalytics,
} from '../services/adminAnalytics.service.js';

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
    await clearAnalyticsCache();
    res.json({ request });

    // certificate generation trigger goes here later, once status === 'approved'
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const validateAnalyticsRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const analyticsQueryValidator = [
  query('from').optional().isISO8601().withMessage('from must be a valid ISO date'),
  query('to').optional().isISO8601().withMessage('to must be a valid ISO date'),
  query('range').optional().isIn(['7d', '30d', '6m']).withMessage('range must be 7d, 30d, or 6m'),
  query('groupBy').optional().isIn(['day', 'week', 'month']).withMessage('groupBy must be day, week, or month'),
  query('overdueDays').optional().isInt({ min: 1 }).withMessage('overdueDays must be a positive integer'),
  query('domain').optional().trim().isString().withMessage('domain must be a string'),
  query('teamLeader').optional().trim().isString().withMessage('teamLeader must be a string'),
  validateAnalyticsRequest,
];

export const getAdminAnalyticsOverview = async (req, res) => {
  try {
    const data = await getOverviewAnalytics(req.query);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Invalid analytics query' });
  }
};

export const getAdminAnalyticsRequestsTrend = async (req, res) => {
  try {
    const data = await getRequestsTrendAnalytics(req.query);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Invalid analytics query' });
  }
};

export const getAdminAnalyticsCertificateTypes = async (req, res) => {
  try {
    const data = await getCertificateTypesAnalytics(req.query);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Invalid analytics query' });
  }
};

export const getAdminAnalyticsTurnaround = async (req, res) => {
  try {
    const data = await getTurnaroundAnalytics(req.query);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Invalid analytics query' });
  }
};

export const getAdminAnalyticsTeamLeaders = async (req, res) => {
  try {
    const data = await getTeamLeaderPerformanceAnalytics(req.query);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Invalid analytics query' });
  }
};

export const getAdminAnalyticsDomains = async (req, res) => {
  try {
    const data = await getDomainsAnalytics(req.query);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Invalid analytics query' });
  }
};

export const getAdminAnalyticsPipeline = async (req, res) => {
  try {
    const data = await getPipelineAnalytics(req.query);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Invalid analytics query' });
  }
};

export const getAdminAnalyticsUpcomingCompletions = async (req, res) => {
  try {
    const data = await getUpcomingCompletionsAnalytics(req.query);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Invalid analytics query' });
  }
};

export const getAdminAnalyticsStuckRequests = async (req, res) => {
  try {
    const data = await getStuckRequestsAnalytics(req.query);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Invalid analytics query' });
  }
};

export const exportAdminAnalytics = async (req, res) => {
  try {
    const { type = 'overview', format = 'xlsx' } = req.query;
    const allowedTypes = ['overview', 'requests-trend', 'certificate-types', 'turnaround', 'team-leaders', 'domains', 'pipeline'];

    if (!allowedTypes.includes(String(type))) {
      return res.status(400).json({ message: 'Unsupported analytics export type' });
    }

    const allowedFormats = ['csv', 'xlsx'];
    if (!allowedFormats.includes(String(format).toLowerCase())) {
      return res.status(400).json({ message: 'Unsupported export format. Use csv or xlsx.' });
    }

    const result = await exportAnalytics({
      type: String(type),
      format: String(format).toLowerCase(),
      query: req.query,
      userId: req.user?.id,
    });

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    return res.send(result.buffer);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Analytics export failed' });
  }
};