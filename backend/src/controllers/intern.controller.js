import User from '../models/User.js';
import CertificateRequest from '../models/CertificateRequest.js';
import Certificate from '../models/Certificate.js';
import bcrypt from 'bcryptjs';

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

const generateRequestNumber = async () => {
  const year = new Date().getFullYear();

  const lastRequest = await CertificateRequest
    .findOne({
      requestNumber: new RegExp(`^CERT-${year}-\\d+$`)
    })
    .sort({ requestNumber: -1 })
    .select('requestNumber');

  const lastNumber = lastRequest
    ? Number(lastRequest.requestNumber.split('-').pop())
    : 0;

  return `CERT-${year}-${String(lastNumber + 1).padStart(5, '0')}`;
};

export const submitCertificateRequest = async (req, res) => {
  try {
    const { certificateType, reason } = req.body;

    if (!certificateType || !ALLOWED_TYPES.includes(certificateType)) {
      return res.status(400).json({
        message: 'Valid certificate type is required'
      });
    }

    // Intern details are auto-filled from the logged-in user.
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    if (!user.startDate) {
      return res.status(404).json({
        message: 'No internship details found for this account'
      });
    }

    const existingPending = await CertificateRequest.findOne({
      userId: req.user.id,
      certificateType,
      status: {
        $in: ['pending', 'processing']
      }
    });

    if (existingPending) {
      return res.status(409).json({
        message:
          'You already have a request in progress for this certificate type'
      });
    }

    const requestNumber = await generateRequestNumber();

    const request = await CertificateRequest.create({
      requestNumber,
      userId: req.user.id,
      internCode: user.internCode,
      certificateType,
      reason
    });

    res.status(201).json({
      request
    });
  } catch (err) {
    console.error('Submit certificate request error:', err);

    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};

export const getMyRequests = async (req, res) => {
  try {
    const requests = await CertificateRequest
      .find({
        userId: req.user.id
      })
      .sort({
        requestedAt: -1
      });

    res.json({
      requests
    });
  } catch (err) {
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    // req.user is set by verifyToken middleware after decoding the JWT.
    const user = await User.findById(req.user.id)
      .select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json({
      user
    });
  } catch (err) {
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: 'New password must be at least 8 characters long'
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    const isCurrentPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordCorrect) {
      return res.status(401).json({
        message: 'Current password is incorrect'
      });
    }

    const isSamePassword = await bcrypt.compare(
      newPassword,
      user.password
    );

    if (isSamePassword) {
      return res.status(400).json({
        message:
          'New password must be different from the current password'
      });
    }

    user.password = newPassword;

    await user.save();

    return res.json({
      message: 'Password changed successfully'
    });
  } catch (err) {
    console.error('Change password error:', err);

    return res.status(500).json({
      message: 'Server error'
    });
  }
};

export const getCertificateForRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await CertificateRequest.findOne({
      _id: id,
      userId: req.user.id
    });

    if (!request) {
      return res.status(404).json({
        message: 'Certificate request not found'
      });
    }

    if (request.status !== 'completed') {
      return res.status(404).json({
        message: 'Certificate is not finalized yet'
      });
    }

    const certificate = await Certificate.findOne({
      requestId: request._id,
      userId: req.user.id,
      status: 'finalized'
    });

    if (!certificate) {
      return res.status(404).json({
        message: 'Finalized certificate not found'
      });
    }

    res.json({
      certificate: {
        id: certificate._id,
        requestId: certificate.requestId,
        status: certificate.status,
        fileUrl: certificate.fileUrl
      }
    });
  } catch (err) {
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};