import Certificate from '../models/Certificate.js';

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const verifyPublicCertificate = async (req, res) => {
  try {
    const rawVerificationId = String(req.params.verificationId || req.params.certificateNumber || '').trim();

    if (!rawVerificationId || rawVerificationId.length > 80) {
      return res.status(400).json({
        valid: false,
        message: 'Verification ID is required.'
      });
    }

    const certificate = await Certificate.findOne({
      $or: [
        { verificationCode: { $regex: `^${escapeRegExp(rawVerificationId)}$`, $options: 'i' } },
        // Only pre-v2 certificates accept their printed legacy number. New certificates require the random ID.
        { verificationIdVersion: { $lt: 2 }, certificateNumber: { $regex: `^${escapeRegExp(rawVerificationId)}$`, $options: 'i' } },
        { verificationIdVersion: { $exists: false }, certificateNumber: { $regex: `^${escapeRegExp(rawVerificationId)}$`, $options: 'i' } },
      ],
    })
      .select('certificateNumber verificationCode certificateType issuedDate finalizedAt status domain userId revokedAt revocationReason')
      .populate('userId', 'fullName')
      .lean();

    if (!certificate) {
      return res.status(404).json({
        valid: false,
        message: 'Certificate not found or not yet published.',
      });
    }

    const isIssued = ['finalized', 'issued'].includes(certificate.status);
    if (!isIssued) {
      const isRevoked = certificate.status === 'revoked';
      if (!isRevoked) {
        return res.status(404).json({ valid: false, message: 'Certificate not found or not yet published.' });
      }
      return res.status(200).json({
        valid: false,
        message: 'This certificate has been revoked.',
        certificate: {
          certificateNumber: certificate.certificateNumber,
          status: certificate.status,
          ...(isRevoked && certificate.revokedAt ? { revokedAt: certificate.revokedAt, revocationReason: certificate.revocationReason } : {}),
        },
      });
    }

    return res.status(200).json({
      valid: true,
      certificate: {
        certificateNumber: certificate.certificateNumber,
        certificateType: certificate.certificateType,
        issuedDate: certificate.issuedDate,
        status: certificate.status,
        domain: certificate.domain,
        internName: certificate.userId?.fullName || 'Not disclosed',
      },
    });
  } catch (error) {
    console.error('Public certificate verification error:', error);
    return res.status(500).json({
      valid: false,
      message: 'Unable to verify certificate at this time.',
    });
  }
};
