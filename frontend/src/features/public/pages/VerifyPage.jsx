import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { verifyCertificate } from '../services/verify.service';
import './VerifyPage.css';

/**
 * Format a date string into a human-readable format.
 */
const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Public certificate verification page.
 * Accessible at /verify/:verifyId — OUTSIDE ProtectedRoute.
 *
 * Designed phone-first (most visitors arrive by scanning a QR code).
 * Includes the UPTOSKILL logo and no login prompt.
 */
export default function VerifyPage() {
  const { verifyId } = useParams();

  const [data, setData] = useState(null);      // verification data from API
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);     // network / 500 error
  const [notFound, setNotFound] = useState(false);

  const fetchVerification = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    setData(null);

    try {
      const result = await verifyCertificate(verifyId);
      setData(result);
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        setError(
          err.response?.data?.message ||
          err.message ||
          'Unable to verify this certificate. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [verifyId]);

  useEffect(() => {
    if (verifyId) {
      fetchVerification();
    } else {
      setLoading(false);
      setNotFound(true);
    }
  }, [verifyId, fetchVerification]);

  /* ── Render states ─────────────────────────────── */

  const isValid = data && data.status === 'valid';
  const isRevoked = data && data.status === 'revoked';

  return (
    <div className="verify-page">
      {/* Logo */}
      <div className="verify-logo-area">
        <span className="verify-logo-text">UPTOSKILL</span>
        <span className="verify-subtitle">Certificate Verification</span>
      </div>

      {/* Card */}
      <div className="verify-card">
        {/* Loading skeleton */}
        {loading && (
          <div className="verify-skeleton" role="status" aria-label="Loading verification">
            <div className="verify-skeleton-line" />
            <div className="verify-skeleton-line" />
            <div className="verify-skeleton-line" />
            <div className="verify-skeleton-line" />
            <div className="verify-skeleton-line" />
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="verify-error" role="alert">
            <div className="verify-error-icon" aria-hidden="true">⚠️</div>
            <p>{error}</p>
            <button
              type="button"
              className="verify-retry-btn"
              onClick={fetchVerification}
            >
              ↻ Retry
            </button>
          </div>
        )}

        {/* Not found */}
        {!loading && !error && notFound && (
          <div className="verify-not-found">
            <div className="verify-not-found-icon" aria-hidden="true">🔍</div>
            <h3>Certificate Not Found</h3>
            <p>
              The certificate you're looking for does not exist or the link may be
              invalid. Please check the QR code and try again.
            </p>
          </div>
        )}

        {/* Valid certificate */}
        {!loading && !error && isValid && (
          <>
            <div className="verify-status-banner is-valid">
              <span className="verify-status-icon" aria-hidden="true">✅</span>
              <span>Verified — This certificate is valid</span>
            </div>

            <div className="verify-details">
              <div className="verify-detail-row">
                <span className="verify-detail-label">Recipient</span>
                <span className="verify-detail-value">{data.recipientName || '—'}</span>
              </div>

              <div className="verify-detail-row">
                <span className="verify-detail-label">Certificate</span>
                <span className="verify-detail-value">{data.certificateTitle || '—'}</span>
              </div>

              <div className="verify-detail-row">
                <span className="verify-detail-label">Domain</span>
                <span className="verify-detail-value">{data.domain || '—'}</span>
              </div>

              <div className="verify-detail-row">
                <span className="verify-detail-label">Issue Date</span>
                <span className="verify-detail-value">{formatDate(data.issuedAt)}</span>
              </div>

              <div className="verify-detail-row">
                <span className="verify-detail-label">Certificate Number</span>
                <span className="verify-detail-value monospace">{data.certificateNumber}</span>
              </div>
            </div>
          </>
        )}

        {/* Revoked certificate */}
        {!loading && !error && isRevoked && (
          <>
            <div className="verify-status-banner is-revoked">
              <span className="verify-status-icon" aria-hidden="true">🚫</span>
              <span>Revoked — This certificate is no longer valid</span>
            </div>

            <div className="verify-details">
              <div className="verify-detail-row">
                <span className="verify-detail-label">Recipient</span>
                <span className="verify-detail-value">{data.recipientName || '—'}</span>
              </div>

              <div className="verify-detail-row">
                <span className="verify-detail-label">Certificate</span>
                <span className="verify-detail-value">{data.certificateTitle || '—'}</span>
              </div>

              <div className="verify-detail-row">
                <span className="verify-detail-label">Certificate Number</span>
                <span className="verify-detail-value monospace">{data.certificateNumber}</span>
              </div>
            </div>

            <div className="verify-revoked-notice">
              This certificate was revoked on{' '}
              <strong>{formatDate(data.revokedAt)}</strong>.
              It is no longer recognized as valid by UPTOSKILL.
            </div>
          </>
        )}
      </div>

      <div className="verify-footer">
        © {new Date().getFullYear()} UPTOSKILL · Powered by the Intern Portal
      </div>
    </div>
  );
}
