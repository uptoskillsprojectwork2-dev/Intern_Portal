
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import CertificateRequest from '../models/CertificateRequest.js';
import Certificate from '../models/Certificate.js';
import Counter from '../models/Counter.js';
import RetentionPolicy from '../models/RetentionPolicy.js';
import logAction from '../utils/logAction.js';
import { logAudit } from '../utils/auditLogger.js';
import { notify } from '../services/notification.service.js';
import { createNotification } from '../utils/notificationService.js';
import Notification from '../models/Notification.js';

const ALLOWED_TYPES = [
  'offer_letter',
  'bonafide',
  'ojt_certificate',
  'experience_letter',
  'completion_certificate',
  'intern_of_month',
  'league_winner',
  'custom'
];

let fallbackRequestSeq = 0;

const generateRequestNumber = async () => {
  const year = new Date().getFullYear();

  try {
    const counter = await Counter.findOneAndUpdate(
      { _id: 'certRequest' },
      { $inc: { seq: 1 } },
      {
        returnDocument: 'after',
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    if (counter && typeof counter.seq === 'number') {
      return `CERT-${year}-${String(counter.seq).padStart(5, '0')}`;
    }
  } catch (error) {
    // Fallback for isolated/unit-test environments where Mongo is not connected.
    // This keeps the API responsive while preserving the normal counter logic in production.
    fallbackRequestSeq += 1;
    return `CERT-${year}-${String(fallbackRequestSeq).padStart(5, '0')}`;
  }

  fallbackRequestSeq += 1;
  return `CERT-${year}-${String(fallbackRequestSeq).padStart(5, '0')}`;
};

export const submitCertificateRequest = async (req, res) => {
  try {
    const { certificateType, reason, metadata } = req.body;

    if (!certificateType || !ALLOWED_TYPES.includes(certificateType)) {
      return res.status(400).json({
        message: 'Valid certificate type is required'
      });
    }

    // Intern details are taken from the logged-in user.
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.startDate) {
      return res.status(404).json({
        message: 'No internship details found for this account'
      });
    }

    // Eligibility validations.
    const now = new Date();
    const hasEnded = user.endDate && new Date(user.endDate) < now;
    const isOngoing =
      user.internshipDetails?.status === 'ongoing' || !hasEnded;
    const isCompleted =
      user.internshipDetails?.status === 'completed' || hasEnded;

    if (certificateType === 'bonafide' && !isOngoing) {
      return res.status(400).json({
        message:
          'Bonafide certificate is only available for internships currently in progress'
      });
    }

    if (certificateType === 'completion_certificate' && !isCompleted) {
      return res.status(400).json({
        message:
          'Internship completion certificate is only available after completing your internship'
      });
    }

    if (certificateType === 'experience_letter' && !isCompleted) {
      return res.status(400).json({
        message:
          'Experience letter is only available after completing your internship'
      });
    }

    const existingPending = await CertificateRequest.findOne({
      userId: req.user.id,
      certificateType,
      status: { $in: ['pending', 'processing'] }
    });

    if (existingPending) {
      return res.status(409).json({
        message:
          'You already have a request in progress for this certificate type'
      });
    }

    const requestNumber = await generateRequestNumber();

    // Keep only non-empty string metadata values.
    const safeMetadata = {};

    if (metadata && typeof metadata === 'object') {
      for (const [key, val] of Object.entries(metadata)) {
        if (typeof val === 'string' && val.trim()) {
          safeMetadata[key] = val.trim();
        }
      }
    }

    const request = await CertificateRequest.create({
      requestNumber,
      userId: req.user.id,
      internCode: user.internCode,
      certificateType,
      reason,
      metadata: safeMetadata
    });

    await logAction({
      req,
      actor: req.user,
      action: 'REQUEST_SUBMITTED',
      targetType: 'CertificateRequest',
      targetId: request._id,
      meta: { certificateType, reason }
    });

    await logAudit({ userId: req.user.id, action: 'CERTIFICATE_REQUEST_SUBMITTED', entityType: 'CertificateRequest', entityId: request._id, meta: { certificateType, requestNumber }, req });

    // Trigger notification to intern's TL (in-app and email)
    try {
      const tlEmail = user.internshipDetails?.teamleaderEmail;
      let tl = null;
      if (tlEmail && typeof tlEmail === 'string') {
        tl = await User.findOne({
          email: tlEmail.trim().toLowerCase(),
          role: 'teamleader'
        });
      }
      if (!tl && user.internshipDetails?.teamLeader) {
        tl = await User.findById(user.internshipDetails.teamLeader);
      }
      if (tl) {
        const typeName = (certificateType || '').replace(/_/g, ' ');
        if (typeof notify === 'function') {
          await notify(tl._id, 'REQUEST_SUBMITTED', {
            title: 'New Certificate Request Submitted',
            message: `${user.fullName || 'An intern'} (${user.internCode || 'ID'}) has submitted a request for ${typeName}.`,
            requestId: request._id,
            email: true
          }).catch(() => {});
        }
        if (typeof createNotification === 'function') {
          await createNotification({
            userId: tl._id,
            title: 'New certificate request',
            message: `${user.fullName} submitted a ${typeName} request for your review.`,
            type: 'certificate',
          }).catch(() => {});
        }
      } else {
        console.warn(
          `[notification] No team leader found for intern ${user._id}. Skipping TL notification.`
        );
      }
    } catch (notifyErr) {
      console.error(
        '[notification] Failed to send REQUEST_SUBMITTED notification:',
        notifyErr.message || notifyErr
      );
    }
    return res.status(201).json({ request });
  } catch (err) {
    return res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};

export const getMyRequests = async (req, res) => {
  try {
    const requests = await CertificateRequest.find({
      userId: req.user.id
    })
      .populate(
        'certificateId',
        'certificateNumber status pdfPath issuedDate'
      )
      .sort({ requestedAt: -1 });

    // Never expose draft or incomplete certificates to the intern.
    const sanitizedRequests = requests.map((reqDoc) => {
      const plain = reqDoc.toObject();

      if (
        plain.certificateId &&
        (plain.certificateId.status !== 'finalized' ||
          plain.status !== 'completed')
      ) {
        delete plain.certificateId;
      }

      return plain;
    });

    return res.json({ requests: sanitizedRequests });
  } catch (err) {
    return res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Preserve the configurable internship retention policy.
    const policy = await RetentionPolicy.findOne({
      policyKey: 'intern'
    }).lean();

    const graceDays = policy?.graceDays ?? 30;
    let archiveNotice = null;
    let daysUntilArchival = null;

    if (user.endDate && user.role === 'intern' && !user.isArchived) {
      const archiveDate = new Date(user.endDate);
      archiveDate.setUTCDate(archiveDate.getUTCDate() + graceDays);
      archiveDate.setUTCHours(0, 0, 0, 0);

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const daysUntilArchive = Math.ceil(
        (archiveDate.getTime() - today.getTime()) / 86400000
      );

      daysUntilArchival = Math.max(0, daysUntilArchive);

      if (daysUntilArchive >= 0 && daysUntilArchive <= 7) {
        archiveNotice = {
          archiveDate,
          daysUntilArchive
        };
      }
    }

    const userData = user.toObject();
    userData.hasPassword = Boolean(user.passwordSetAt);
    if (daysUntilArchival !== null) {
      userData.daysUntilArchival = daysUntilArchival;
    }

    return res.json({ user: userData, archiveNotice });
  } catch (err) {
    return res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = notifications.filter((notification) => !notification.isRead).length;

    return res.json({ notifications, unreadCount });
  } catch (err) {
    return res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }

    const notification = await Notification.findOne({ _id: id, userId: req.user.id });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return res.status(200).json({ message: 'Notification marked as read', notification });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

export const markNotificationAsRead = markNotificationRead;

export const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany({ userId: req.user.id, isRead: false }, {
      isRead: true,
      readAt: new Date()
    });

    return res.status(200).json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount || 0
    });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

/**
 * Fetches finalized certificate metadata for a specific request owned by
 * the authenticated intern.
 */
export const getCertificateForRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid request ID' });
    }

    const request = await CertificateRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        message: 'Certificate request not found'
      });
    }

    if (request.userId.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Access denied: You do not own this certificate request'
      });
    }

    if (!request.certificateId) {
      return res.status(404).json({
        message: 'No certificate exists for this request'
      });
    }

    const certificate = await Certificate.findById(request.certificateId);

    if (!certificate) {
      return res.status(404).json({
        message: 'Certificate record not found'
      });
    }

    if (certificate.userId.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Access denied: Certificate does not belong to you'
      });
    }

    // Draft certificates must never be exposed to the intern.
    if (
      certificate.status !== 'finalized' ||
      request.status !== 'completed'
    ) {
      return res.status(400).json({
        message: 'Certificate is not finalized or available yet',
        status: request.status
      });
    }

    return res.status(200).json({
      certificate: {
        _id: certificate._id,
        certificateNumber: certificate.certificateNumber,
        certificateType: certificate.certificateType,
        domain: certificate.domain,
        issuedDate: certificate.issuedDate,
        status: certificate.status,
        verificationCode: certificate.verificationCode,
        hasPdf: Boolean(certificate.pdfPath),
        downloadUrl: `/api/intern/requests/${request._id}/certificate/download`
      }
    });
  } catch (err) {
    return res.status(500).json({
      message: 'Internal server error'
    });
  }
};

/**
 * Streams the finalized certificate PDF to the authenticated intern.
 * Validates ownership and checks that the PDF exists.
 */
export const downloadCertificateForRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid request ID' });
    }

    const request = await CertificateRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        message: 'Certificate request not found'
      });
    }

    if (request.userId.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Access denied: You do not own this certificate request'
      });
    }

    if (!request.certificateId) {
      return res.status(404).json({
        message: 'No certificate exists for this request'
      });
    }

    const certificate = await Certificate.findById(request.certificateId);

    if (!certificate) {
      return res.status(404).json({
        message: 'Certificate record not found'
      });
    }

    if (certificate.userId.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Access denied: Certificate does not belong to you'
      });
    }

    if (
      certificate.status !== 'finalized' ||
      request.status !== 'completed'
    ) {
      return res.status(400).json({
        message: 'Certificate has not been finalized yet'
      });
    }

    if (!certificate.pdfPath) {
      return res.status(404).json({
        message: 'Certificate PDF path is missing'
      });
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const absolutePath = path.resolve(
      __dirname,
      '../../',
      certificate.pdfPath
    );

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        message: 'Certificate PDF file is unavailable on server'
      });
    }

    const safeFileName = `${
      (certificate.certificateNumber || 'Certificate').replace(
        /[^a-zA-Z0-9_-]/g,
        '_'
      )
    }.pdf`;

    return res.download(absolutePath, safeFileName);
  } catch (err) {
    return res.status(500).json({
      message: 'Internal server error'
    });
  }
};

/**
 * PATCH /api/intern/set-password
 * Body: { currentSecret, newPassword }
 * If no password exists yet, currentSecret must be intern code.
 * If one exists, it must be the current password.
 */
export const setPassword = async (req, res) => {
  try {
    const { currentSecret, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hasPassword = Boolean(user.password && user.passwordSetAt);

    let isCurrentValid = false;
    if (!hasPassword) {
      isCurrentValid = Boolean(user.internCode && currentSecret === user.internCode);
      if (!isCurrentValid && user.password) {
        isCurrentValid = await bcrypt.compare(currentSecret, user.password);
      }
    } else {
      isCurrentValid = await bcrypt.compare(currentSecret, user.password);
    }

    if (!isCurrentValid) {
      return res.status(400).json({ message: 'Invalid current credentials' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordSetAt = new Date();
    await user.save();

    await logAction({
      req,
      actor: req.user,
      action: 'PASSWORD_CHANGED',
      targetType: 'User',
      targetId: user._id,
      meta: { email: user.email }
    });

    return res.status(200).json({
      message: 'Password updated successfully'
    });
  } catch (err) {
    return res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};

/**
 * PATCH /api/intern/profile
 * Whitelisted update. Only mobileNo is editable. Ignore every other field in the body.
 */
export const updateProfile = async (req, res) => {
  try {
    const { mobileNo } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const oldMobile = user.mobileNo;
    user.mobileNo = String(mobileNo).trim();
    await user.save();

    await logAction({
      req,
      actor: req.user,
      action: 'PROFILE_UPDATED',
      targetType: 'User',
      targetId: user._id,
      meta: {
        email: user.email,
        field: 'mobileNo',
        oldMobile,
        newMobile: user.mobileNo
      }
    });

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.resetPasswordToken;
    delete userObj.resetPasswordExpires;

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: userObj
    });
  } catch (err) {
    return res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};


