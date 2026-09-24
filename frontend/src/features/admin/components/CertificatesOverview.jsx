import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllCertificates, downloadAdminCertificate } from '../services/admin.service';
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
          setError(err.response?.data?.message || err.message || 'Failed to load certificates');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

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

  return (
    <section className="certificates-overview-panel" aria-labelledby="cert-overview-title">
      <div className="certificates-overview-heading">
        <div>
          <p className="admin-eyebrow">AUDIT & COMPLIANCE</p>
          <h2 id="cert-overview-title">Issued Certificates Overview</h2>
          <p className="cert-overview-subtext">
            Oversight of all certificates generated and finalized across the organization.
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
            {loading ? 'Refreshing…' : '↻ Refresh'}
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
          <p>⚠ {error}</p>
          <button type="button" onClick={fetchCertificates}>Retry</button>
        </div>
      )}

      {!loading && !error && certificates.length === 0 && (
        <div className="cert-overview-empty">
          <div className="cert-empty-icon" aria-hidden="true">📜</div>
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
                <th>PDF Action</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((cert) => {
                const isFinalized = cert.status === 'finalized';
                const hasPdf = Boolean(cert.pdfPath) && isFinalized;
                const isDownloading = downloadingId === cert._id;
                const intern = cert.userId || {};

                return (
                  <tr key={cert._id}>
                    <td>
                      <code className="cert-num-code">{cert.certificateNumber}</code>
                    </td>
                    <td>
                      <strong>{intern.fullName || '—'}</strong>
                    </td>
                    <td>
                      <span className="cert-intern-code">{cert.internCode || intern.internCode || '—'}</span>
                    </td>
                    <td>
                      <span className="cert-type-text">
                        {cert.certificateType ? cert.certificateType.replace(/_/g, ' ') : '—'}
                      </span>
                    </td>
                    <td>{formatDate(cert.issuedDate || cert.createdAt)}</td>
                    <td>
                      <span className={`cert-status-tag ${isFinalized ? 'is-finalized' : 'is-draft'}`}>
                        {cert.status ? cert.status.toUpperCase() : 'UNKNOWN'}
                      </span>
                    </td>
                    <td>
                      {hasPdf ? (
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
                            <span>📥 Download PDF</span>
                          )}
                        </button>
                      ) : cert.status === 'draft' ? (
                        <button
                          type="button"
                          className="cert-review-link-btn"
                          onClick={() => navigate(`/admin/certificates/${cert._id}/review`)}
                          title="Open draft in review editor"
                        >
                          Review Draft →
                        </button>
                      ) : (
                        <span className="cert-pdf-unavailable" title="PDF is not available">
                          Unavailable
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
