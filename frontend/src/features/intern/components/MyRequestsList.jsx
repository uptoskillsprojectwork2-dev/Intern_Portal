import { useState } from 'react';
import useCertificateRequests from '../hooks/useCertificateRequests';
import { getCertificateForRequest } from '../services/intern.api';
import StatusBadge from '../../shared/components/StatusBadge';
import './MyRequestsList.css';

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

export default function MyRequestsList() {
  const { requests, loading, error, refetch } =
    useCertificateRequests();

  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState('');

  const handleDownloadCertificate = async (requestId) => {
    try {
      setDownloadingId(requestId);
      setDownloadError('');

      const response =
        await getCertificateForRequest(requestId);

      const fileUrl =
        response?.certificate?.fileUrl;

      if (!fileUrl) {
        throw new Error(
          'Certificate file is not available'
        );
      }

      const downloadUrl = new URL(
        fileUrl,
        'http://localhost:3000'
      ).href;

      window.open(
        downloadUrl,
        '_blank',
        'noopener,noreferrer'
      );
    } catch (err) {
      setDownloadError(
        err.response?.data?.message ||
          err.message ||
          'Unable to download certificate'
      );
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <section
      className="requests-panel"
      aria-labelledby="my-requests-title"
    >
      <div className="requests-panel-heading">
        <div>
          <p className="request-eyebrow">
            REQUEST HISTORY
          </p>

          <h2 id="my-requests-title">
            My certificate requests
          </h2>
        </div>

        <button
          className="requests-refresh"
          type="button"
          onClick={refetch}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {loading && (
        <p
          className="requests-state"
          role="status"
          aria-live="polite"
        >
          Loading requests…
        </p>
      )}

      {!loading && error && (
        <p
          className="requests-state requests-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {!loading && !error && downloadError && (
        <p
          className="requests-state requests-error"
          role="alert"
        >
          {downloadError}
        </p>
      )}

      {!loading &&
        !error &&
        !requests.length && (
          <p className="requests-state">
            No requests yet
          </p>
        )}

      {!loading &&
        !error &&
        requests.length > 0 && (
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
                  const requestId =
                    request._id ||
                    request.id ||
                    request.requestNumber;

                  const isCompleted =
                    request.status === 'completed';

                  const isProcessing =
                    request.status === 'processing' ||
                    request.status === 'approved';

                  const isRejected =
                    request.status === 'rejected';

                  const isDownloading =
                    downloadingId === requestId;

                  return (
                    <tr key={requestId}>
                      <td>
                        {request.requestNumber || '—'}
                      </td>

                      <td>
                        {request.certificateType
                          ?.replaceAll('_', ' ') || '—'}
                      </td>

                      <td>
                        <StatusBadge
                          status={request.status}
                        />
                      </td>

                      <td>
                        {formatDate(
                          request.requestedAt ||
                            request.createdAt
                        )}
                      </td>

                      <td>
                        {isCompleted ? (
                          <button
                            type="button"
                            className="requests-refresh"
                            onClick={() =>
                              handleDownloadCertificate(
                                request._id
                              )
                            }
                            disabled={isDownloading}
                          >
                            {isDownloading
                              ? 'Opening…'
                              : 'Download Certificate'}
                          </button>
                        ) : isProcessing ? (
                          <span
                            aria-live="polite"
                          >
                            Processing certificate…
                          </span>
                        ) : isRejected ? (
                          <span>
                            Request rejected
                          </span>
                        ) : (
                          <span>
                            Awaiting review
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