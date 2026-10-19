import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useForwardedRequests from '../hooks/useForwardedRequests';
import { retryCertificateGeneration } from '../services/admin.service';
import Toast from '../../../shared/components/Toast';
import './ForwardedRequestsList.css';

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

export default function ForwardedRequestsList() {
  const navigate = useNavigate();
  const {
    requests,
    counts,
    statusFilter,
    setStatusFilter,
    loading,
    error,
    refetch,
    approveRequest,
    rejectRequest,
  } = useForwardedRequests('forwarded');

  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [toast, setToast] = useState(null);

  const approve = async (id) => {
    setActionError(null);
    try {
      const result = await approveRequest(id);
      if (result?.certificate?._id) {
        navigate(`/admin/certificates/${result.certificate._id}/review`);
      }
    } catch (requestError) {
      setActionError(requestError.message);
    }
  };

  const reject = async (id) => {
    if (!reason.trim()) return;
    setActionError(null);
    try {
      await rejectRequest(id, reason.trim());
      setRejectingId(null);
      setReason('');
    } catch (requestError) {
      setActionError(requestError.message);
    }
  };

  const handleRetry = async (id) => {
    if (!id || retryingId) return;
    setRetryingId(id);
    setToast(null);

    try {
      const result = await retryCertificateGeneration(id);
      setToast({
        type: 'success',
        message: 'Draft certificate generated successfully! Navigating to review…',
      });
      await refetch();
      if (result?.certificate?._id) {
        setTimeout(() => {
          navigate(`/admin/certificates/${result.certificate._id}/review`);
        }, 1200);
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Retry generation failed.',
      });
    } finally {
      setRetryingId(null);
      setTimeout(() => setToast(null), 5000);
    }
  };

  return (
    <section className="forwarded-requests-panel" aria-labelledby="forwarded-requests-title">
      <div className="forwarded-requests-heading">
        <div>
          <p className="admin-eyebrow">CERTIFICATE DESK</p>
          <h2 id="forwarded-requests-title">Certificate Requests</h2>
        </div>
        <span className="forwarded-requests-count">
          {requests.length} {statusFilter === 'all' ? 'total' : statusFilter === 'pending' ? 'pending TL' : 'forwarded'}
        </span>
      </div>

      {/* Tabs for switching between Forwarded by TL, Pending TL Review, and All */}
      <div className="forwarded-tabs" role="tablist">
        <button
          type="button"
          className={`forwarded-tab ${statusFilter === 'forwarded' ? 'active' : ''}`}
          onClick={() => setStatusFilter('forwarded')}
          role="tab"
          aria-selected={statusFilter === 'forwarded'}
        >
          Forwarded by TL
          {counts.forwarded > 0 && <span className="tab-badge">{counts.forwarded}</span>}
        </button>

        <button
          type="button"
          className={`forwarded-tab ${statusFilter === 'pending' ? 'active' : ''}`}
          onClick={() => setStatusFilter('pending')}
          role="tab"
          aria-selected={statusFilter === 'pending'}
        >
          Pending TL Review
          {counts.pending > 0 && <span className="tab-badge pending-badge">{counts.pending}</span>}
        </button>

        <button
          type="button"
          className={`forwarded-tab ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
          role="tab"
          aria-selected={statusFilter === 'all'}
        >
          All Requests
          {counts.all > 0 && <span className="tab-badge">{counts.all}</span>}
        </button>
      </div>

      {/* Helpful banner for workflow context */}
      {statusFilter === 'pending' && (
        <div className="forwarded-info-banner" role="note">
          <span className="info-icon">ℹ️</span>
          <div>
            <strong>Requests Pending Team Leader Review:</strong>
            <p>
              Newly submitted certificate requests first go to the intern's assigned Team Leader.
              As an Administrator, you can review and approve them directly below, or the Team Leader can forward them from their dashboard.
            </p>
          </div>
        </div>
      )}

      {toast && (
        <div className="forwarded-toast-wrap">
          <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
        </div>
      )}

      {loading && <p className="forwarded-requests-state">Loading requests…</p>}
      {!loading && error && (
        <div className="forwarded-requests-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={refetch}>Retry</button>
        </div>
      )}
      {!loading && !error && actionError && (
        <p className="forwarded-requests-error" role="alert">{actionError}</p>
      )}

      {!loading && !error && !requests.length && (
        <p className="forwarded-requests-state">
          {statusFilter === 'pending'
            ? 'No requests are currently pending Team Leader review.'
            : statusFilter === 'forwarded'
            ? 'No forwarded requests awaiting admin decision. Check the "Pending TL Review" tab for newly submitted requests.'
            : 'No certificate requests found.'}
        </p>
      )}

      {!loading && requests.length > 0 && (
        <div className="forwarded-requests-list">
          {requests.map((request) => {
            const id = request._id || request.id;
            const intern = request.userId || {};
            const certTargetId = request.certificateId?._id || request.certificateId;
            const isApprovedMissingCert = request.status === 'approved' && !certTargetId;
            const isRetrying = retryingId === id;
            const isPending = request.status === 'pending';

            return (
              <article className="forwarded-request-row" key={id}>
                <div className="forwarded-request-details">
                  <div className="request-title-line">
                    <h3>{intern.fullName || 'Unknown intern'}</h3>
                    {request.status && (
                      <span className={`forwarded-status-tag ${request.status}`}>
                        {request.status === 'pending' ? 'PENDING TL REVIEW' : request.status.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="forwarded-request-meta">
                    {intern.internCode || '—'} · {intern.domain || '—'} · {formatDate(request.requestedAt || request.createdAt)}
                  </p>
                  <p>
                    <strong>{request.certificateType?.replaceAll('_', ' ') || '—'}</strong>
                    <span className="request-number-tag">#{request.requestNumber || id.slice(-6)}</span>
                  </p>
                  <p className="forwarded-request-reason">
                    {request.reason || 'No reason provided'}
                  </p>
                </div>

                <div className="forwarded-request-actions">
                  {isApprovedMissingCert ? (
                    <button
                      type="button"
                      className="forwarded-retry-button"
                      onClick={() => handleRetry(id)}
                      disabled={isRetrying}
                      title="Recover draft generation for this approved request"
                    >
                      {isRetrying ? 'Retrying…' : '🔄 Retry Generation'}
                    </button>
                  ) : rejectingId === id ? (
                    <div className="forwarded-reject-form">
                      <input
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Rejection reason"
                        aria-label="Rejection reason"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => reject(id)}
                        disabled={!reason.trim()}
                      >
                        Confirm Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingId(null);
                          setReason('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      {certTargetId && (
                        <button
                          type="button"
                          className="forwarded-review-button"
                          onClick={() => navigate(`/admin/certificates/${certTargetId}/review`)}
                          title="Review certificate HTML and template"
                        >
                          Review Draft
                        </button>
                      )}
                      <button
                        type="button"
                        className="forwarded-approve-button"
                        onClick={() => approve(id)}
                        title={isPending ? 'Directly approve this pending request' : 'Approve and generate certificate draft'}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="forwarded-reject-button"
                        onClick={() => setRejectingId(id)}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}