import { useState } from 'react';
import useCertificateRequests from '../hooks/useCertificateRequests';
import StatusBadge from '../../shared/components/StatusBadge';
import { downloadCertificatePdf } from '../services/intern.api';
import './MyRequestsList.css';

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : '—';

export default function MyRequestsList() {
  const { requests, loading, error, refetch } = useCertificateRequests();
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState(null);

  const handleDownload = async (request) => {
    const id = request._id || request.id;
    if (downloadingId) return;

    setDownloadingId(id);
    setDownloadError(null);

    try {
      await downloadCertificatePdf(
        id,
        `${request.requestNumber || 'certificate'}_${request.certificateType || 'internship'}.pdf`
      );
    } catch (err) {
      setDownloadError(err.message || 'Failed to download certificate PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <section className="requests-panel" aria-labelledby="my-requests-title">
      <div className="requests-panel-heading">
        <div>
          <p className="request-eyebrow">REQUEST HISTORY</p>
          <h2 id="my-requests-title">My certificate requests</h2>
        </div>
        <button
          className="requests-refresh"
          type="button"
          onClick={refetch}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {downloadError && (
        <div className="requests-download-error" role="alert">
          <span>⚠ {downloadError}</span>
          <button type="button" onClick={() => setDownloadError(null)}>
            ✕
          </button>
        </div>
      )}

      {loading && <p className="requests-state">Loading requests…</p>}
      {!loading && error && (
        <p className="requests-state requests-error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && !requests.length && (
        <p className="requests-state">No requests yet</p>
      )}

      {!loading && !error && requests.length > 0 && (
        <div className="requests-table-wrap">
          <table className="requests-table">
            <thead>
              <tr>
                <th>Request</th>
                <th>Certificate</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const id = request._id || request.id || request.requestNumber;
                const canDownload =
                  request.status === 'completed' && Boolean(request.certificateId);

                return (
                  <tr key={id}>
                    <td>{request.requestNumber || '—'}</td>
                    <td>{request.certificateType?.replaceAll('_', ' ') || '—'}</td>
                    <td>
                      <StatusBadge status={request.status} />
                    </td>
                    <td>{formatDate(request.requestedAt || request.createdAt)}</td>
                    <td>
                      {canDownload ? (
                        <button
                          type="button"
                          className="request-download-btn"
                          onClick={() => handleDownload(request)}
                          disabled={downloadingId === (request._id || request.id)}
                        >
                          {downloadingId === (request._id || request.id)
                            ? 'Downloading...'
                            : '⬇ Download Certificate'}
                        </button>
                      ) : (
                        <span className="request-no-action">—</span>
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