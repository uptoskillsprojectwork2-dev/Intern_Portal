import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { verifyCertificate } from '../services/verify.service';
import { IconBrandLogo } from '../../shared/components/Icons';
import ThemeToggle from '../../shared/components/ThemeToggle';
import './VerifyPage.css';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

export default function VerifyPage({ theme, onToggleTheme }) {
  const { verifyId } = useParams();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'valid' | 'revoked' | 'not_found' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  const loadVerification = useCallback(async () => {
    if (!verifyId) {
      setStatus('not_found');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const result = await verifyCertificate(verifyId);
      setData(result);
      if (result.status === 'revoked') {
        setStatus('revoked');
      } else {
        setStatus('valid');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setStatus('not_found');
      } else if (err.response?.status === 429) {
        setStatus('error');
        setErrorMessage('Too many requests. Please wait a minute and try again.');
      } else {
        setStatus('error');
        setErrorMessage(
          err.response?.data?.message || err.message || 'Unable to connect to verification service'
        );
      }
    }
  }, [verifyId]);

  useEffect(() => {
    loadVerification();
  }, [loadVerification]);

  return (
    <div className="verify-container">
      {/* Top Bar with Brand and Theme Toggle */}
      <header className="verify-header">
        <div className="verify-brand">
          <div className="verify-brand-icon">
            <IconBrandLogo size={24} color="#fff" />
          </div>
          <div>
            <span className="verify-brand-name">UptoSkills</span>
            <span className="verify-brand-sub">Credential Verification</span>
          </div>
        </div>

        {onToggleTheme && (
          <div className="verify-theme-toggle">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        )}
      </header>

      {/* Main Verification Card */}
      <main className="verify-card-shell">
        {status === 'loading' && (
          <div className="verify-card skeleton-card" aria-busy="true" aria-label="Verifying certificate">
            <div className="skeleton-badge" />
            <div className="skeleton-title" />
            <div className="skeleton-sub" />
            <div className="skeleton-rows">
              <div className="skeleton-row" />
              <div className="skeleton-row" />
              <div className="skeleton-row" />
              <div className="skeleton-row" />
            </div>
            <p className="verify-loading-text">Verifying certificate authenticity…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="verify-card error-card" role="alert">
            <div className="verify-status-icon error-icon">⚠️</div>
            <h2>Verification Unavailable</h2>
            <p className="verify-desc">{errorMessage || 'A temporary connection issue occurred while verifying this certificate.'}</p>
            <button
              type="button"
              className="verify-retry-btn"
              onClick={loadVerification}
            >
              Retry Verification
            </button>
          </div>
        )}

        {status === 'not_found' && (
          <div className="verify-card not-found-card" role="region" aria-label="Certificate Not Found">
            <div className="verify-status-icon not-found-icon">❓</div>
            <span className="verify-pill not-found-pill">Not Found</span>
            <h2>Certificate Not Found</h2>
            <p className="verify-desc">
              We could not find an official certificate associated with verification ID:
            </p>
            <div className="verify-id-box">{verifyId || '—'}</div>
            <p className="verify-help-text">
              Please ensure you scanned the authentic QR code or double-check the URL. If you believe this is an error, contact UptoSkills administrator support.
            </p>
          </div>
        )}

        {status === 'revoked' && (
          <div className="verify-card revoked-card" role="region" aria-label="Certificate Revoked">
            <div className="verify-status-icon revoked-icon">✕</div>
            <span className="verify-pill revoked-pill">Certificate Revoked</span>
            <h2 className="verify-revoked-title">This Certificate Is No Longer Valid</h2>
            <p className="verify-revoked-notice">
              This credential has been officially revoked by UptoSkills and cannot be used as proof of completion.
            </p>

            <div className="verify-details-table">
              <div className="verify-detail-row">
                <span className="verify-detail-label">Certificate No.</span>
                <span className="verify-detail-value cert-code">{data?.certificateNumber || '—'}</span>
              </div>
              <div className="verify-detail-row">
                <span className="verify-detail-label">Recipient</span>
                <span className="verify-detail-value">{data?.recipientName || '—'}</span>
              </div>
              <div className="verify-detail-row">
                <span className="verify-detail-label">Certificate Title</span>
                <span className="verify-detail-value">{data?.certificateTitle || '—'}</span>
              </div>
              <div className="verify-detail-row">
                <span className="verify-detail-label">Domain / Track</span>
                <span className="verify-detail-value">{data?.domain || '—'}</span>
              </div>
              {data?.revokedAt && (
                <div className="verify-detail-row highlight-revoked">
                  <span className="verify-detail-label">Date Revoked</span>
                  <span className="verify-detail-value revoked-date">{formatDate(data.revokedAt)}</span>
                </div>
              )}
            </div>

            <div className="verify-footer-badge">
              <span className="verify-shield-icon">🛡️</span> UptoSkills Security &amp; Compliance Verified
            </div>
          </div>
        )}

        {status === 'valid' && (
          <div className="verify-card valid-card" role="region" aria-label="Certificate Valid">
            <div className="verify-status-icon valid-icon">✓</div>
            <span className="verify-pill valid-pill">Official Verified Credential</span>
            <h2 className="verify-valid-title">Certificate is Genuine &amp; Valid</h2>
            <p className="verify-valid-sub">
              This certificate was officially issued by UptoSkills and verified against registry records.
            </p>

            <div className="verify-details-table">
              <div className="verify-detail-row">
                <span className="verify-detail-label">Certificate No.</span>
                <span className="verify-detail-value cert-code">{data?.certificateNumber || '—'}</span>
              </div>
              <div className="verify-detail-row">
                <span className="verify-detail-label">Recipient Name</span>
                <span className="verify-detail-value cert-recipient">{data?.recipientName || '—'}</span>
              </div>
              <div className="verify-detail-row">
                <span className="verify-detail-label">Certificate Title</span>
                <span className="verify-detail-value">{data?.certificateTitle || '—'}</span>
              </div>
              <div className="verify-detail-row">
                <span className="verify-detail-label">Domain / Department</span>
                <span className="verify-detail-value">{data?.domain || '—'}</span>
              </div>
              <div className="verify-detail-row">
                <span className="verify-detail-label">Date of Issue</span>
                <span className="verify-detail-value">{formatDate(data?.issuedAt)}</span>
              </div>
              <div className="verify-detail-row">
                <span className="verify-detail-label">Verification Status</span>
                <span className="verify-detail-value cert-valid-status">Active &amp; Authentic</span>
              </div>
            </div>

            <div className="verify-footer-badge">
              <span className="verify-shield-icon">🛡️</span> Cryptographically Verified • UptoSkills Registry
            </div>
          </div>
        )}
      </main>

      <footer className="verify-page-footer">
        <p>&copy; {new Date().getFullYear()} UptoSkills Talent &amp; Internship Management System.</p>
        <p className="verify-disclaimer">This public verification interface operates without requiring an account login.</p>
      </footer>
    </div>
  );
}
