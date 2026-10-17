import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllCertificates,
  downloadAdminCertificate,
  revokeCertificate,
  unrevokeCertificate
} from '../services/admin.service';
import Toast from '../../../shared/components/Toast';
import './CertificatesOverview.css';

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default function CertificatesOverview() {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [toast, setToast] = useState(null);

  // Revoke modal state
  const [revokingCert, setRevokingCert] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeLoading, setRevokeLoading] = useState(false);

  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllCertificates();
      setCertificates(data.certificates || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load certificates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  // Keyboard accessibility for modal (Escape closes)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && revokingCert && !revokeLoading) {
        setRevokingCert(null);
        setRevokeReason('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revokingCert, revokeLoading]);

  const handleDownload = async (cert) => {
    if (!cert._id || downloadingId) return;

    setDownloadingId(cert._id);
    try {
      const safeName = `${(cert.certificateNumber || 'Certificate').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      await downloadAdminCertificate(cert._id, safeName);
      setToast({ type: 'success', message: `Downloaded ${cert.certificateNumber} successfully.` });
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Unable to download certificate PDF.'
      });
    } finally {
      setDownloadingId(null);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const openRevokeModal = (cert) => {
    setRevokingCert(cert);
    setRevokeReason('');
  };

  const closeRevokeModal = () => {
    if (revokeLoading) return;
    setRevokingCert(null);
    setRevokeReason('');
  };

  const handleRevokeSubmit = async (e) => {
    e.preventDefault();
    if (!revokingCert || !revokeReason.trim()) return;

    setRevokeLoading(true);
    try {
      await revokeCertificate(revokingCert._id, revokeReason.trim());
      setToast({
        type: 'success',
        message: `Certificate ${revokingCert.certificateNumber} revoked successfully.`
      });
      closeRevokeModal();
      fetchCertificates();
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to revoke certificate.'
      });
    } finally {
      setRevokeLoading(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const handleUnrevoke = async (cert) => {
    const confirm = window.confirm(
      `Are you sure you want to reinstate certificate ${cert.certificateNumber}?`
    );
    if (!confirm) return;

    try {
      await unrevokeCertificate(cert._id);
      setToast({
        type: 'success',
        message: `Certificate ${cert.certificateNumber} reinstated successfully.`
      });
      fetchCertificates();
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to reinstate certificate.'
      });
    } finally {
      setTimeout(() => setToast(null), 5000);
    }
  };

  return (
    <section className="certificates-overview-panel" aria-labelledby="cert-overview-title">
      <div className="certificates-overview-heading">
        <div>
          <p className="admin-eyebrow">AUDIT & COMPLIANCE</p>
          <h2 id="cert-overview-title">Issued Certificates Overview</h2>
          <p className="cert-overview-subtext">
            Oversight of all certificates generated, finalized, and verified across the organization.
          </p>
        </div>
        <div className="cert-overview-actions">
          <span className="cert-overview-count">{certificates.length} Total</span>
          <button
            type="button"
            className="cert-overview-refresh"
            onClick={fetchCertificates}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : <><i className="bi bi-arrow-clockwise"></i> Refresh</>}
          </button>
        </div>
      </div>

      {toast && (
        <div className="cert-overview-toast">
          <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
        </div>
      )}

      {loading && (
        <div className="cert-overview-state" role="status">
          <div className="cert-overview-spinner" aria-hidden="true" />
          <p>Loading certificate records…</p>
        </div>
      )}

      {!loading && error && (
        <div className="cert-overview-error" role="alert">
          <p><i className="bi bi-exclamation-triangle" style={{ marginRight: 6 }}></i>{error}</p>
          <button type="button" onClick={fetchCertificates}>Retry</button>
        </div>
      )}

      {!loading && !error && certificates.length === 0 && (
        <div className="cert-overview-empty">
          <div className="cert-empty-icon" aria-hidden="true">
            <i className="bi bi-award"></i>
          </div>
          <h3>No Certificates Generated Yet</h3>
          <p>When certificate drafts are approved and finalized, their official records will appear here.</p>
        </div>
      )}

      {!loading && !error && certificates.length > 0 && (
        <div className="cert-overview-table-wrap">
          <table className="cert-overview-table">
            <thead>
              <tr>
                <th>Certificate No.</th>
                <th>Intern Name</th>
                <th>Code</th>
                <th>Type</th>
                <th>Issued Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((cert) => {
                const isFinalized = cert.status === 'finalized';
                const isRevoked = Boolean(cert.isRevoked || cert.status === 'revoked');
                const hasPdf = Boolean(cert.pdfPath) && isFinalized;
                const isDownloading = downloadingId === cert._id;
                const intern = cert.userId || {};

                return (
                  <tr key={cert._id}>
                    <td>
                      <code className="cert-num-code">{cert.certificateNumber}</code>
                    </td>
                    <td>
                      <strong>{cert.recipientName || intern.fullName || '—'}</strong>
                    </td>
                    <td>
                      <span className="cert-intern-code">{cert.internCode || intern.internCode || '—'}</span>
                    </td>
                    <td>
                      <span className="cert-type-text">
                        {cert.certificateTitle || (cert.certificateType ? cert.certificateType.replace(/_/g, ' ') : '—')}
                      </span>
                    </td>
                    <td>{formatDate(cert.issuedAt || cert.issuedDate || cert.createdAt)}</td>
                    <td>
                      {isRevoked ? (
                        <span className="cert-status-tag is-revoked" title={cert.revokedReason ? `Reason: ${cert.revokedReason}` : 'Revoked'}>
                          REVOKED
                        </span>
                      ) : isFinalized ? (
                        <span className="cert-status-tag is-valid">
                          VALID
                        </span>
                      ) : (
                        <span className="cert-status-tag is-draft">
                          {cert.status ? cert.status.toUpperCase() : 'DRAFT'}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="cert-actions-cell">
                        {hasPdf && (
                          <button
                            type="button"
                            className="cert-pdf-btn"
                            onClick={() => handleDownload(cert)}
                            disabled={isDownloading}
                            title="Download official finalized PDF"
                          >
                            {isDownloading ? (
                              <>
                                <span className="cert-mini-spinner" aria-hidden="true" />
                                <span>Downloading…</span>
                              </>
                            ) : (
                              <span>📥 PDF</span>
                            )}
                          </button>
                        )}

                        {isFinalized && !isRevoked && (
                          <button
                            type="button"
                            className="cert-revoke-btn"
                            onClick={() => openRevokeModal(cert)}
                            title="Revoke certificate validity"
                          >
                            Revoke
                          </button>
                        )}

                        {isFinalized && isRevoked && (
                          <button
                            type="button"
                            className="cert-unrevoke-btn"
                            onClick={() => handleUnrevoke(cert)}
                            title="Reverse revocation"
                          >
                            Unrevoke
                          </button>
                        )}

                        {cert.verifyId && (
                          <a
                            href={`/verify/${cert.verifyId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cert-verify-link"
                            title="Open public verification page"
                          >
                            Verify ↗
                          </a>
                        )}

                        {cert.status === 'draft' && (
                          <button
                            type="button"
                            className="cert-review-link-btn"
                            onClick={() => navigate(`/admin/certificates/${cert._id}/review`)}
                            title="Open draft in review editor"
                          >
                            Review Draft →
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Revocation Confirmation Modal */}
      {revokingCert && (
        <div
          className="cert-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-modal-title"
          onClick={closeRevokeModal}
        >
          <div className="cert-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="cert-modal-header">
              <h3 id="revoke-modal-title" className="cert-modal-title">
                ⚠️ Revoke Certificate
              </h3>
              <button
                type="button"
                className="cert-modal-close"
                onClick={closeRevokeModal}
                disabled={revokeLoading}
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            <p className="cert-modal-subtext">
              You are revoking certificate <code className="cert-num-code">{revokingCert.certificateNumber}</code> issued to <strong>{revokingCert.recipientName || revokingCert.userId?.fullName || 'Intern'}</strong>. The public verification page will immediately flag this credential as revoked, and an alert will be sent to the intern.
            </p>

            <form onSubmit={handleRevokeSubmit}>
              <div className="cert-modal-field">
                <label htmlFor="revoke-reason">Reason for Revocation *</label>
                <textarea
                  id="revoke-reason"
                  className="cert-modal-textarea"
                  placeholder="State the reason for revocation (required)..."
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  required
                  rows={3}
                  autoFocus
                  disabled={revokeLoading}
                />
              </div>

              <div className="cert-modal-actions">
                <button
                  type="button"
                  className="cert-modal-cancel-btn"
                  onClick={closeRevokeModal}
                  disabled={revokeLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cert-modal-confirm-btn"
                  disabled={revokeLoading || !revokeReason.trim()}
                >
                  {revokeLoading ? 'Revoking…' : 'Confirm Revoke'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
