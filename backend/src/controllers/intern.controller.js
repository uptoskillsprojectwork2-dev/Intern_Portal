import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from '../models/User.js';
import CertificateRequest from '../models/CertificateRequest.js';
import Certificate from '../models/Certificate.js';
import Counter from '../models/Counter.js';

const ALLOWED_TYPES = [
  'offer_letter', 'bonafide', 'ojt_certificate', 'experience_letter',
  'completion_certificate', 'intern_of_month', 'league_winner', 'custom'
];

const generateRequestNumber = async () => {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { _id: 'certRequest' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `CERT-${year}-${String(counter.seq).padStart(5, '0')}`;
};

export const submitCertificateRequest = async (req, res) => {
  try {
    const { certificateType, reason, metadata } = req.body;

    if (!certificateType || !ALLOWED_TYPES.includes(certificateType)) {
      return res.status(400).json({ message: 'Valid certificate type is required' });
    }

    // intern details auto-filled from the logged-in user — nothing typed by intern
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.startDate) {
      return res.status(404).json({ message: 'No internship details found for this account' });
    }

    // Eligibility validations
    const now = new Date();
    const hasEnded = user.endDate && new Date(user.endDate) < now;
    const isOngoing = user.internshipDetails?.status === 'ongoing' || !hasEnded;
    const isCompleted = user.internshipDetails?.status === 'completed' || hasEnded;

    if (certificateType === 'bonafide' && !isOngoing) {
      return res.status(400).json({
        message: 'Bonafide certificate is only available for internships currently in progress'
      });
    }

    if (certificateType === 'completion_certificate' && !isCompleted) {
      return res.status(400).json({
        message: 'Internship completion certificate is only available after completing your internship'
      });
    }

    if (certificateType === 'experience_letter' && !isCompleted) {
      return res.status(400).json({
        message: 'Experience letter is only available after completing your internship'
      });
    }

    const existingPending = await CertificateRequest.findOne({
      userId: req.user.id,
      certificateType,
      status: { $in: ['pending', 'processing'] }
    });
    if (existingPending) {
      return res.status(409).json({ message: 'You already have a request in progress for this certificate type' });
    }

    const requestNumber = await generateRequestNumber();

    // Sanitize metadata to Map of strings only, preventing prototype pollution
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

    res.status(201).json({ request });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getMyRequests = async (req, res) => {
  try {
    const requests = await CertificateRequest.find({ userId: req.user.id })
      .populate('certificateId', 'certificateNumber status pdfPath issuedDate')
      .sort({ requestedAt: -1 });

    // Sanitize requests to guarantee draft certificates are NEVER exposed to the intern
    const sanitizedRequests = requests.map((reqDoc) => {
      const plain = reqDoc.toObject();
      if (plain.certificateId && (plain.certificateId.status !== 'finalized' || plain.status !== 'completed')) {
        delete plain.certificateId;
      }
      return plain;
    });

    res.json({ requests: sanitizedRequests });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    // req.user is set by verifyToken middleware after decoding the JWT — { id, role }
    const user = await User.findById(req.user.id)
      .select('-password'); // never send password back, even hashed

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Fetches finalized certificate metadata for a specific CertificateRequest owned by the intern.
 * Enforces strict ownership, never exposes drafts or private internal fields.
 */
export const getCertificateForRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid request ID' });
    }

    const request = await CertificateRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Certificate request not found' });
    }

    // Strict ownership verification: cannot access another intern's request
    if (request.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You do not own this certificate request' });
    }

    if (!request.certificateId) {
      return res.status(404).json({ message: 'No certificate exists for this request' });
    }

    const certificate = await Certificate.findById(request.certificateId);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate record not found' });
    }

    // Secondary ownership verification
    if (certificate.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: Certificate does not belong to you' });
    }

    // Never expose draft certificates to the intern
    if (certificate.status !== 'finalized' || request.status !== 'completed') {
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
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Streams the finalized certificate PDF directly to the authenticated intern.
 * Validates ownership, checks file existence, and handles missing files with controlled errors.
 */
export const downloadCertificateForRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid request ID' });
    }

    const request = await CertificateRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Certificate request not found' });
    }

    if (request.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You do not own this certificate request' });
    }

    if (!request.certificateId) {
      return res.status(404).json({ message: 'No certificate exists for this request' });
    }

    const certificate = await Certificate.findById(request.certificateId);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate record not found' });
    }

    if (certificate.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: Certificate does not belong to you' });
    }

    if (certificate.status !== 'finalized' || request.status !== 'completed') {
      return res.status(400).json({ message: 'Certificate has not been finalized yet' });
    }

    if (!certificate.pdfPath) {
      return res.status(404).json({ message: 'Certificate PDF path is missing' });
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

