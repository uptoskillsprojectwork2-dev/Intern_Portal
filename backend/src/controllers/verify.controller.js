import Certificate from '../models/Certificate.js';

/**
 * Public certificate verification endpoint controller.
 * GET /api/verify/:verifyId
 *
 * Exposes strictly public verification data without authentication.
 * Returns consistent 404 shape for unknown and malformed IDs.
 */
export const verifyCertificate = async (req, res) => {
  const { verifyId } = req.params;

  // Validate format (alphanumeric unguessable string)
  if (!verifyId || typeof verifyId !== 'string' || verifyId.length < 6 || !/^[a-zA-Z0-9_-]+$/.test(verifyId)) {
    return res.status(404).json({ message: 'Certificate not found' });
  }

  try {
    const certificate = await Certificate.findOne({ verifyId })
      .populate('userId', 'fullName domain');

    if (!certificate || certificate.status !== 'finalized') {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    const isRevoked = Boolean(certificate.isRevoked || certificate.status === 'revoked');

    const response = {
      certificateNumber: certificate.certificateNumber,
      recipientName: certificate.recipientName || certificate.userId?.fullName || 'Intern',
      certificateTitle: certificate.certificateTitle || 'Certificate',
      domain: certificate.domain || certificate.userId?.domain || '',
      issuedAt: certificate.issuedAt || certificate.issuedDate || certificate.createdAt,
      status: isRevoked ? 'revoked' : 'valid'
    };

    if (isRevoked) {
      response.revokedAt = certificate.revokedAt || certificate.updatedAt;
    }

    return res.status(200).json(response);
  } catch (err) {
    return res.status(404).json({ message: 'Certificate not found' });
  }
};
