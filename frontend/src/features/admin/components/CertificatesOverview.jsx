import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllCertificates, downloadAdminCertificatePdf } from '../services/admin.service';
import StatusBadge from '../../shared/components/StatusBadge';
import './CertificatesOverview.css';

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : '—';

export default function CertificatesOverview() {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchCertificates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllCertificates();
      setCertificates(data.certificates || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch certificates overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadCertificates = async () => {
      try {
        const data = await getAllCertificates();
        if (isMounted) {
          setCertificates(data.certificates || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch certificates overview');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCertificates();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDownload = async (cert) => {
    if (downloadingId) return;
    setDownloadingId(cert._id);
    try {
      await downloadAdminCertificatePdf(cert._id, `${cert.certificateNumber || 'certificate'}.pdf`);
    } catch (err) {
      setError(err.message || 'Failed to download certificate PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <section className="certs-overview-panel" aria-labelledby="certs-overview-title">
      <div className="certs-overview-heading">
        <div>
          <p className="admin-eyebrow">CERTIFICATE OVERSIGHT</p>
          <h2 id="certs-overview-title">Issued &amp; Draft Certificates</h2>
        </div>
        <button
          className="certs-refresh-btn"
          type="button"
          onClick={fetchCertificates}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {error && (
        <div className="certs-error-banner" role="alert">
          <span>⚠ {error}</span>
          <button type="button" onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      )}

      {loading && <p className="certs-state-msg">Loading certificates overview…</p>}

      {!loading && !error && !certificates.length && (
        <p className="certs-state-msg">No certificates have been created yet.</p>
      )}

      {!loading && !error && certificates.length > 0 && (
        <div className="certs-overview-table-wrap">
          <table className="certs-overview-table">
            <thead>
              <tr>
                <th>Certificate #</th>
                <th>Intern Name</th>
                <th>Intern Code</th>
                <th>Type</th>
                <th>Department</th>
                <th>Status</th>
                <th>Issue Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((cert) => {
                const isFinalized = cert.status === 'finalized' || cert.status === 'issued';
                const isDraft = cert.status === 'draft';
                const intern = cert.userId || {};

                return (
                  <tr key={cert._id}>
                    <td>
                      <strong>{cert.certificateNumber || '—'}</strong>
                    </td>
                    <td>{intern.fullName || '—'}</td>
                    <td>{cert.internCode || intern.internCode || '—'}</td>
                    <td className="cert-type-tag">
                      {cert.certificateType?.replaceAll('_', ' ') || '—'}
                    </td>
                    <td>{cert.domain || intern.domain || '—'}</td>
                    <td>
                      <StatusBadge status={cert.status} />
                    </td>
                    <td>{formatDate(cert.issuedDate || cert.createdAt)}</td>
                    <td>
                      {isFinalized ? (
                        <button
                          type="button"
                          className="cert-action-btn download"
                          onClick={() => handleDownload(cert)}
                          disabled={downloadingId === cert._id}
                        >
                          {downloadingId === cert._id ? 'Downloading...' : '⬇ PDF'}
                        </button>
                      ) : isDraft ? (
                        <button
                          type="button"
                          className="cert-action-btn review"
                          onClick={() => navigate(`/admin/certificates/review/${cert._id}`)}
                        >
                          ✎ Review Draft
                        </button>
                      ) : (
                        <span style={{ color: 'var(--muted, #94a3b8)' }}>—</span>
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
