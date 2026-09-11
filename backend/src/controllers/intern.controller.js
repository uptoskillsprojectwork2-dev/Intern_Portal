import User from '../models/User.js';
import CertificateRequest from '../models/CertificateRequest.js';
import Certificate from '../models/Certificate.js';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

const ALLOWED_TYPES = [
  'offer_letter', 'bonafide', 'ojt_certificate', 'experience_letter',
  'completion_certificate', 'intern_of_month', 'league_winner', 'custom'
];



const generateRequestNumber = async () => {
  const year = new Date().getFullYear();
  const count = await CertificateRequest.countDocuments();
  return `CERT-${year}-${String(count + 1).padStart(5, '0')}`;
};



export const submitCertificateRequest = async (req, res) => {
  try {
    const { certificateType, reason } = req.body;

    if (!certificateType || !ALLOWED_TYPES.includes(certificateType)) {
      return res.status(400).json({ message: 'Valid certificate type is required' });
    }

    // intern details auto-filled from the logged-in user — nothing typed by intern
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.startDate) {
      return res.status(404).json({ message: 'No internship details found for this account' });
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

    const request = await CertificateRequest.create({
      requestNumber,
      userId: req.user.id,
      internCode: user.internCode,
      certificateType,
      reason
    });

    res.status(201).json({ request });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};




export const getMyRequests = async (req, res) => {
  try {
    const requests = await CertificateRequest.find({ userId: req.user.id }).sort({ requestedAt: -1 });
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};




export const getProfile = async (req, res) => {
  try {
    // req.user is set by verifyToken middleware after decoding the JWT — { id, role }
    const user = await User.findById(req.user.id)
      .select('-password') // never send password back, even hashed

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getCertificateForRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid request ID format' });
    }

    const request = await CertificateRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Certificate request not found' });
    }

    // Ownership check: must belong to the logged-in intern
    if (request.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Access denied: You do not own this certificate request' });
    }

    if (!request.certificateId) {
      return res.status(404).json({ message: 'No certificate associated with this request' });
    }

    const certificate = await Certificate.findById(request.certificateId)
      .select('-htmlContent')
      .populate('templateId', 'templateName certificateType');

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    // Draft certificates must NOT be exposed to interns
    if (certificate.status === 'draft') {
      return res.status(400).json({
        message: 'Certificate is currently in draft review and has not yet been finalized'
      });
    }

    return res.status(200).json({
      success: true,
      certificate: {
        _id: certificate._id,
        certificateNumber: certificate.certificateNumber,
        internCode: certificate.internCode,
        certificateType: certificate.certificateType,
        domain: certificate.domain,
        startDate: certificate.startDate,
        endDate: certificate.endDate,
        issuedDate: certificate.issuedDate,
        status: certificate.status,
        verificationCode: certificate.verificationCode,
        pdfPath: certificate.pdfPath
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const downloadCertificateForRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid request ID format' });
    }

    const request = await CertificateRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Certificate request not found' });
    }

    // Ownership check
    if (request.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Access denied: You do not own this certificate request' });
    }

    if (!request.certificateId) {
      return res.status(404).json({ message: 'No certificate found for this request' });
    }

    const certificate = await Certificate.findById(request.certificateId);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    // Only finalized or issued certificates can be downloaded
    if (certificate.status === 'draft') {
      return res.status(400).json({
        message: 'Certificate is still in draft review and cannot be downloaded'
      });
    }

    if (!certificate.pdfPath) {
      return res.status(404).json({ message: 'Certificate PDF has not been generated yet' });
    }

    // Safe path resolution: prevent path traversal attacks
    const safePdfPath = path.resolve(process.cwd(), certificate.pdfPath);

    // Ensure the resolved path resides within uploads
    if (!safePdfPath.startsWith(path.resolve(process.cwd(), 'uploads'))) {
      return res.status(403).json({ message: 'Invalid file path' });
    }

    if (!fs.existsSync(safePdfPath)) {
      return res.status(404).json({ message: 'Certificate PDF file not found on server' });
    }

    const downloadFileName = `${certificate.certificateNumber || 'certificate'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    return res.download(safePdfPath, downloadFileName);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
