import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllCertificates,
  downloadAdminCertificate,
  revokeCertificate,
  unrevokeCertificate,
} from '../services/admin.service';
import Toast from '../../../shared/components/Toast';
import './CertificatesOverview.css';

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
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
  const [revokeModalCert, setRevokeModalCert] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeError, setRevokeError] = useState(null);
  const [revoking, setRevoking] = useState(false);

  // Unrevoke confirmation state
  const [unrevokeModalCert, setUnrevokeModalCert] = useState(null);
  const [unrevoking, setUnrevoking] = useState(false);

  // Modal accessibility refs
  const modalRef = useRef(null);
  const reasonInputRef = useRef(null);

  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllCertificates();
      setCertificates(data.certificates || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to load certificates'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    getAllCertificates()
      .then((data) => {
        if (isMounted) {
          setCertificates(data.certificates || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err.response?.data?.message ||
              err.message ||
              'Failed to load certificates'
          );
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /* ── Keyboard accessibility & focus trap for modals ── */
  useEffect(() => {
    if (!revokeModalCert && !unrevokeModalCert) return;

    // Focus initial input
    if (revokeModalCert) {
      setTimeout(() => reasonInputRef.current?.focus(), 50);
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (revokeModalCert && !revoking) {
          closeRevokeModal();
        }
        if (unrevokeModalCert && !unrevoking) {
          setUnrevokeModalCert(null);
        }
        return;
      }

      // Focus trap within modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [revokeModalCert, unrevokeModalCert, revoking, unrevoking]);

  /* ── PDF Download handler ────────────────────────── */
  const handleDownload = async (cert) => {
    if (!cert._id || downloadingId) return;

    setDownloadingId(cert._id);
    try {
      const safeName = `${(cert.certificateNumber || 'Certificate').replace(
        /[^a-zA-Z0-9_-]/g,
        '_'
      )}.pdf`;
      await downloadAdminCertificate(cert._id, safeName);
      setToast({
        type: 'success',
        message: `Downloaded ${cert.certificateNumber} successfully.`,
      });
    } catch (err) {
      setToast({
        type: 'error',
        message:
          err.response?.data?.message ||
          err.message ||
          'Unable to download certificate PDF.',
      });
    } finally {
      setDownloadingId(null);
      setTimeout(() => setToast(null), 5000);
    }
  };

  /* ── Revoke Handlers ─────────────────────────────── */
  const openRevokeModal = (cert) => {
    setRevokeModalCert(cert);
    setRevokeReason('');
    setRevokeError(null);
  };

  const closeRevokeModal = () => {
    setRevokeModalCert(null);
    setRevokeReason('');
    setRevokeError(null);
  };

  const handleRevokeSubmit = async (e) => {
    e.preventDefault();
    if (!revokeModalCert || revoking) return;

    const trimmedReason = revokeReason.trim();
    if (!trimmedReason) {
      setRevokeError('A reason for revocation is required.');
      reasonInputRef.current?.focus();
      return;
    }

    setRevoking(true);
    setRevokeError(null);

    try {
      const result = await revokeCertificate(
        revokeModalCert._id,
        trimmedReason
      );

      // Refresh the row locally in state
      setCertificates((prev) =>
        prev.map((c) =>
          c._id === revokeModalCert._id
            ? {
                ...c,
                ...(result.certificate || {}),
                isRevoked: true,
                revokedAt: result.certificate?.revokedAt || new Date().toISOString(),
                revokedReason: trimmedReason,
              }
            : c
        )
      );

      setToast({
        type: 'success',
        message: `Certificate ${revokeModalCert.certificateNumber} has been revoked.`,
      });

      closeRevokeModal();
    } catch (err) {
      setRevokeError(
        err.response?.data?.message ||
          err.message ||
          'Failed to revoke certificate.'
      );
      setToast({
        type: 'error',
        message:
          err.response?.data?.message ||
          err.message ||
          'Failed to revoke certificate.',
      });
    } finally {
      setRevoking(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  /* ── Unrevoke Handlers ───────────────────────────── */
  const openUnrevokeModal = (cert) => {
    setUnrevokeModalCert(cert);
  };

  const handleUnrevokeSubmit = async () => {
    if (!unrevokeModalCert || unrevoking) return;

    setUnrevoking(true);
    try {
      const result = await unrevokeCertificate(unrevokeModalCert._id);

      // Refresh the row locally in state
      setCertificates((prev) =>
        prev.map((c) =>
          c._id === unrevokeModalCert._id
            ? {
                ...c,
                ...(result.certificate || {}),
                isRevoked: false,
                revokedAt: null,
                revokedReason: null,
              }
            : c
        )
      );

      setToast({
        type: 'success',
        message: `Certificate ${unrevokeModalCert.certificateNumber} restored to valid status.`,
      });

      setUnrevokeModalCert(null);
    } catch (err) {
      setToast({
        type: 'error',
        message:
          err.response?.data?.message ||
          err.message ||
          'Failed to restore certificate.',
      });
    } finally {
      setUnrevoking(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  return (
    <section
      className="certificates-overview-panel"
      aria-labelledby="cert-overview-title"
    >
      <div className="certificates-overview-heading">
        <div>
          <p className="admin-eyebrow">AUDIT & COMPLIANCE</p>
          <h2 id="cert-overview-title">Issued Certificates Overview</h2>
          <p className="cert-overview-subtext">
            Oversight of all certificates generated and finalized across the
            organization with live verification and revocation controls.
          </p>
        </div>
        <div className="cert-overview-actions">
          <span className="cert-overview-count">
            {certificates.length} Total
          </span>
          <button
            type="button"
            className="cert-overview-refresh"
            onClick={fetchCertificates}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {toast && (
        <div className="cert-overview-toast">
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
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
          <p>⚠️ {error}</p>
          <button type="button" onClick={fetchCertificates}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && certificates.length === 0 && (
        <div className="cert-overview-empty">
          <div className="cert-empty-icon" aria-hidden="true">
            📜
          </div>
          <h3>No Certificates Generated Yet</h3>
          <p>
            When certificate drafts are approved and finalized, their official
            records will appear here.
          </p>
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
                const isRevoked = Boolean(cert.isRevoked);
                const hasPdf = Boolean(cert.pdfPath) && isFinalized;
                const isDownloading = downloadingId === cert._id;
                const intern = cert.userId || {};

                return (
                  <tr
                    key={cert._id}
                    className={isRevoked ? 'cert-row-revoked' : ''}
                  >
                    <td>
                      <code className="cert-num-code">
                        {cert.certificateNumber}
                      </code>
                    </td>
                    <td>
                      <strong>
                        {intern.fullName || cert.recipientName || '—'}
                      </strong>
                    </td>
                    <td>
                      <span className="cert-intern-code">
                        {cert.internCode || intern.internCode || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="cert-type-text">
                        {cert.certificateType
                          ? cert.certificateType.replace(/_/g, ' ')
                          : '—'}
                      </span>
                    </td>
                    <td>
                      {formatDate(cert.issuedDate || cert.createdAt)}
                    </td>
                    <td>
                      {/* Status badge: Valid or Revoked for finalized, Draft otherwise */}
                      {isFinalized ? (
                        isRevoked ? (
                          <span
                            className="cert-status-tag is-revoked"
                            title={
                              cert.revokedReason
                                ? `Revoked on ${formatDate(
                                    cert.revokedAt
                                  )}: ${cert.revokedReason}`
                                : 'Revoked'
                            }
                          >
                            REVOKED
                          </span>
                        ) : (
                          <span className="cert-status-tag is-valid">
                            VALID
                          </span>
                        )
                      ) : (
                        <span className="cert-status-tag is-draft">
                          {cert.status ? cert.status.toUpperCase() : 'DRAFT'}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="cert-actions-cluster">
                        {/* Download PDF button */}
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
                                <span
                                  className="cert-mini-spinner"
                                  aria-hidden="true"
                                />
                                <span>Downloading…</span>
                              </>
                            ) : (
                              <span>📥 PDF</span>
                            )}
                          </button>
                        )}

                        {/* Review Draft button */}
                        {cert.status === 'draft' && (
                          <button
                            type="button"
                            className="cert-review-link-btn"
                            onClick={() =>
                              navigate(
                                `/admin/certificates/${cert._id}/review`
                              )
                            }
                            title="Open draft in review editor"
                          >
                            Review Draft →
                          </button>
                        )}

                        {/* Public verify page link */}
                        {cert.verifyId && (
                          <a
                            href={`/verify/${cert.verifyId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cert-verify-link-btn"
                            title="Open public verification page"
                          >
                            Verify ↗
                          </a>
                        )}

                        {/* Revoke button (finalized & not revoked) */}
                        {isFinalized && !isRevoked && (
                          <button
                            type="button"
                            className="cert-revoke-btn"
                            onClick={() => openRevokeModal(cert)}
                            title="Revoke this certificate"
                          >
                            Revoke
                          </button>
                        )}

                        {/* Unrevoke button (finalized & revoked) */}
                        {isFinalized && isRevoked && (
                          <button
                            type="button"
                            className="cert-unrevoke-btn"
                            onClick={() => openUnrevokeModal(cert)}
                            title="Restore this certificate to valid status"
                          >
                            Unrevoke
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

      {/* ── Revoke Confirmation Modal (Keyboard accessible) ── */}
      {revokeModalCert && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-modal-title"
          onClick={closeRevokeModal}
        >
          <div
            className="admin-modal-card revoke-modal-card"
            onClick={(e) => e.stopPropagation()}
            ref={modalRef}
          >
            <h3 id="revoke-modal-title">Revoke Certificate</h3>
            <p>
              Are you sure you want to revoke certificate{' '}
              <strong>{revokeModalCert.certificateNumber}</strong> issued to{' '}
              <strong>
                {revokeModalCert.userId?.fullName ||
                  revokeModalCert.recipientName ||
                  'Intern'}
              </strong>
              ?
            </p>

            <div className="admin-alert-box error" style={{ margin: '0 0 16px' }}>
              ⚠️ <strong>Warning:</strong> Revoking this certificate marks it as
              invalid immediately. Anyone scanning the QR code or visiting the
              public verification page will see that this certificate has been
              revoked. An in-app notification will be sent to the intern.
            </div>

            <form onSubmit={handleRevokeSubmit}>
              <div className="admin-form-group">
                <label htmlFor="revoke-reason">
                  Revocation Reason <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <textarea
                  id="revoke-reason"
                  ref={reasonInputRef}
                  rows={3}
                  value={revokeReason}
                  onChange={(e) => {
                    setRevokeReason(e.target.value);
                    if (revokeError) setRevokeError(null);
                  }}
                  placeholder="e.g. Issued by mistake, disciplinary action, data mismatch, etc."
                  required
                  disabled={revoking}
                />
                {revokeError && (
                  <span
                    className="cert-field-error"
                    style={{
                      color: 'var(--error)',
                      fontSize: '12px',
                      marginTop: '4px',
                    }}
                  >
                    {revokeError}
                  </span>
                )}
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="cert-cancel-btn"
                  onClick={closeRevokeModal}
                  disabled={revoking}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cert-confirm-revoke-btn"
                  disabled={revoking || !revokeReason.trim()}
                >
                  {revoking ? 'Revoking…' : 'Confirm Revoke'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Unrevoke Confirmation Modal ── */}
      {unrevokeModalCert && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unrevoke-modal-title"
          onClick={() => setUnrevokeModalCert(null)}
        >
          <div
            className="admin-modal-card revoke-modal-card"
            onClick={(e) => e.stopPropagation()}
            ref={modalRef}
          >
            <h3 id="unrevoke-modal-title">Unrevoke Certificate</h3>
            <p>
              Restore certificate{' '}
              <strong>{unrevokeModalCert.certificateNumber}</strong> issued to{' '}
              <strong>
                {unrevokeModalCert.userId?.fullName ||
                  unrevokeModalCert.recipientName ||
                  'Intern'}
              </strong>{' '}
              to valid status?
            </p>
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
              This reverses the revocation. Scanning the QR code or visiting the
              public verification link will once again show this certificate as
              valid.
            </p>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="cert-cancel-btn"
                onClick={() => setUnrevokeModalCert(null)}
                disabled={unrevoking}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cert-confirm-unrevoke-btn"
                onClick={handleUnrevokeSubmit}
                disabled={unrevoking}
              >
                {unrevoking ? 'Restoring…' : 'Restore Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
