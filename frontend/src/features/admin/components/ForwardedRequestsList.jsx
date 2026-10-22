import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useForwardedRequests from '../hooks/useForwardedRequests';
import { retryCertificateGeneration } from '../services/admin.service';
import Toast from '../../../shared/components/Toast';
import './ForwardedRequestsList.css';

const formatDate = (date) => (date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—');

const STATUS_FILTERS = [
  { key: 'processing', label: 'With Admin' },
  { key: 'pending', label: 'With TL' },
  { key: 'approved', label: 'Approved / Draft' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All Requests' }
];

export default function ForwardedRequestsList({ initialStatus = 'processing' }) {
  const navigate = useNavigate();
  const {
    requests,
    pagination,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    refetch,
    approveRequest,
    rejectRequest
  } = useForwardedRequests(initialStatus);

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
        message: 'Draft certificate generated successfully! Navigating to review…'
      });
      await refetch(statusFilter);
      if (result?.certificate?._id) {
        setTimeout(() => {
          navigate(`/admin/certificates/${result.certificate._id}/review`);
        }, 1200);
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Retry generation failed.'
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
          <h2 id="forwarded-requests-title">Certificate Request Queue</h2>
        </div>
        <span className="forwarded-requests-count">{requests.length} requests</span>
      </div>

      {/* Filter Tabs */}
      <div className="forwarded-status-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`control-preset-btn ${statusFilter === f.key ? 'active' : ''}`}
            onClick={() => setStatusFilter(f.key)}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '8px',
              border: statusFilter === f.key ? '1px solid #6366f1' : '1px solid var(--border, #334155)',
              background: statusFilter === f.key ? '#6366f1' : 'var(--card, #1e293b)',
              color: statusFilter === f.key ? '#ffffff' : 'var(--muted, #94a3b8)',
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer'
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {toast && (
        <div className="forwarded-toast-wrap">
          <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
        </div>
      )}

      {loading && <p className="forwarded-requests-state">Loading requests…</p>}
      {!loading && error && (
        <div className="forwarded-requests-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => refetch(statusFilter)}>Retry</button>
        </div>
      )}
      {!loading && !error && actionError && (
        <p className="forwarded-requests-error" role="alert">{actionError}</p>
      )}
      {!loading && !error && !requests.length && (
        <p className="forwarded-requests-state">No requests found for this status</p>
      )}

      {!loading && requests.length > 0 && (
        <div className="forwarded-requests-list">
          {requests.map((request) => {
            const id = request._id || request.id;
            const intern = request.userId || {};
            const certTargetId = request.certificateId?._id || request.certificateId;
            const isApprovedMissingCert = request.status === 'approved' && !certTargetId;
            const isRetrying = retryingId === id;

            return (
              <article className="forwarded-request-row" key={id}>
                <div className="forwarded-request-details">
                  <h3>{intern.fullName || 'Unknown intern'}</h3>
                  <p className="forwarded-request-meta">
                    {intern.internCode || '—'} · {intern.domain || '—'} · {formatDate(request.requestedAt || request.createdAt)}
                  </p>
                  <p>
                    <strong>{request.certificateType?.replaceAll('_', ' ') || '—'}</strong>
                    {request.status && (
                      <span className={`forwarded-status-tag ${request.status}`}>
                        {request.status.toUpperCase()}
                      </span>
                    )}
                  </p>
                  <p className="forwarded-request-reason">{request.reason || 'No reason provided'}</p>
                </div>

                <div className="forwarded-request-actions">
                  {request.status === 'processing' && (
                    <>
                      {rejectingId === id ? (
                        <div className="forwarded-reject-box">
                          <input
                            type="text"
                            placeholder="Rejection reason…"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="forwarded-reject-input"
                          />
                          <button
                            type="button"
                            className="forwarded-confirm-reject-btn"
                            onClick={() => reject(id)}
                            disabled={!reason.trim()}
                          >
                            Confirm Reject
                          </button>
                          <button
                            type="button"
                            className="forwarded-cancel-btn"
                            onClick={() => { setRejectingId(null); setReason(''); }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="forwarded-approve-btn"
                            onClick={() => approve(id)}
                          >
                            Approve & Generate Draft
                          </button>
                          <button
                            type="button"
                            className="forwarded-reject-btn"
                            onClick={() => { setRejectingId(id); setReason(''); }}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </>
                  )}

                  {isApprovedMissingCert && (
                    <button
                      type="button"
                      className="forwarded-retry-button"
                      onClick={() => handleRetry(id)}
                      disabled={isRetrying}
                      title="Recover draft generation for this approved request"
                    >
                      {isRetrying ? 'Generating Draft…' : 'Retry Draft Generation'}
                    </button>
                  )}

                  {request.status === 'approved' && certTargetId && (
                    <button
                      type="button"
                      className="forwarded-approve-btn"
                      onClick={() => navigate(`/admin/certificates/${certTargetId}/review`)}
                    >
                      Review Draft →
                    </button>
                  )}

                  {request.status === 'completed' && certTargetId && (
                    <button
                      type="button"
                      className="control-action-btn export"
                      onClick={() => navigate('/admin/certificates')}
                    >
                      View Certificate
                    </button>
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