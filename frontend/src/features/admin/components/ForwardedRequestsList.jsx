import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useForwardedRequests from '../hooks/useForwardedRequests';
import { retryCertificateGeneration } from '../services/admin.service';
import { fetchFilteredRequests } from '../analytics/services/analytics.service';
import Toast from '../../../shared/components/Toast';
import './ForwardedRequestsList.css';

const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export default function ForwardedRequestsList({ statusFilter, onClearStatusFilter }) {
  const navigate = useNavigate();
  const { requests: defaultRequests, loading: defaultLoading, error: defaultError, refetch: defaultRefetch, approveRequest, rejectRequest } = useForwardedRequests();
  const [filteredRequests, setFilteredRequests] = useState(null);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterError, setFilterError] = useState(null);

  useEffect(() => {
    let ignore = false;
    if (statusFilter) {
      Promise.resolve().then(() => {
        if (!ignore) {
          setFilterLoading(true);
          setFilterError(null);
        }
      });
      fetchFilteredRequests(statusFilter)
        .then((res) => {
          if (!ignore) {
            setFilteredRequests(res.requests || []);
          }
        })
        .catch((err) => {
          if (!ignore) {
            setFilterError(err.message || 'Failed to fetch filtered requests');
          }
        })
        .finally(() => {
          if (!ignore) {
            setFilterLoading(false);
          }
        });
    }

    return () => {
      ignore = true;
    };
  }, [statusFilter]);

  const fetchFiltered = useCallback(() => {
    if (!statusFilter) return;
    setFilterLoading(true);
    setFilterError(null);
    fetchFilteredRequests(statusFilter)
      .then((res) => setFilteredRequests(res.requests || []))
      .catch((err) => setFilterError(err.message || 'Failed to fetch filtered requests'))
      .finally(() => setFilterLoading(false));
  }, [statusFilter]);

  const requests = statusFilter ? (filteredRequests || []) : defaultRequests;
  const loading = statusFilter ? filterLoading : defaultLoading;
  const error = statusFilter ? filterError : defaultError;
  const refetch = statusFilter ? fetchFiltered : defaultRefetch;
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
    } catch (requestError) { setActionError(requestError.message); }
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
      await refetch();
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
          <h2 id="forwarded-requests-title">
            {statusFilter ? `Certificate Requests: ${statusFilter}` : 'Requests awaiting approval & recovery'}
          </h2>
          {statusFilter && (
            <div style={{ marginTop: '6px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className={`forwarded-status-tag ${statusFilter}`}>{statusFilter.toUpperCase()}</span>
              <button
                type="button"
                onClick={onClearStatusFilter}
                style={{ fontSize: '0.75rem', cursor: 'pointer', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)' }}
              >
                ✕ Show All Forwarded
              </button>
            </div>
          )}
        </div>
        <span className="forwarded-requests-count">{requests.length} {statusFilter ? 'found' : 'awaiting'}</span>
      </div>

      {toast && (
        <div className="forwarded-toast-wrap">
          <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
        </div>
      )}

      {loading && <p className="forwarded-requests-state">Loading requests…</p>}
      {!loading && error && <div className="forwarded-requests-error" role="alert"><span>{error}</span><button type="button" onClick={refetch}>Retry</button></div>}
      {!loading && !error && actionError && <p className="forwarded-requests-error" role="alert">{actionError}</p>}
      {!loading && !error && !requests.length && <p className="forwarded-requests-state">No requests awaiting approval or recovery</p>}
      {!loading && requests.length > 0 && <div className="forwarded-requests-list">{requests.map((request) => {
        const id = request._id || request.id;
        const intern = request.userId || {};
        const certTargetId = request.certificateId?._id || request.certificateId;
        const isApprovedMissingCert = request.status === 'approved' && !certTargetId;
        const isRetrying = retryingId === id;

        return <article className="forwarded-request-row" key={id}>
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
                <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Rejection reason" aria-label="Rejection reason" autoFocus />
                <button type="button" onClick={() => reject(id)} disabled={!reason.trim()}>Confirm Reject</button>
                <button type="button" onClick={() => { setRejectingId(null); setReason(''); }}>Cancel</button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="forwarded-review-button"
                  onClick={() => certTargetId && navigate(`/admin/certificates/${certTargetId}/review`)}
                  disabled={!certTargetId}
                  title={certTargetId ? "Review certificate HTML and template" : "Approve request to generate and review draft"}
                >
                  Review
                </button>
                <button type="button" className="forwarded-approve-button" onClick={() => approve(id)}>
                  Approve
                </button>
                <button type="button" className="forwarded-reject-button" onClick={() => setRejectingId(id)}>
                  Reject
                </button>
              </>
            )}
          </div>
        </article>;
      })}</div>}
    </section>
  );
}