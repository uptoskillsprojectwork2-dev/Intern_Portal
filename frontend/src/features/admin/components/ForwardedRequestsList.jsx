import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useForwardedRequests from '../hooks/useForwardedRequests';
import { retryCertificateGeneration } from '../services/admin.service';
import './ForwardedRequestsList.css';

const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export default function ForwardedRequestsList() {
  const navigate = useNavigate();
  const { requests, loading, error, refetch, approveRequest, rejectRequest } = useForwardedRequests();
  const [rejectingId, setRejectingId] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState(null);
  const [approvalSuccess, setApprovalSuccess] = useState(null);

  const handleRetry = async (id) => {
    if (retryingId || approvingId) return;
    setActionError(null);
    setRetryingId(id);
    try {
      const result = await retryCertificateGeneration(id);
      if (result?.certificate?._id) {
        setApprovalSuccess({
          certificateId: result.certificate._id,
          certificateNumber: result.certificate.certificateNumber || 'Draft',
          internName: result.request?.userId?.fullName || 'Intern'
        });
        refetch();
      }
    } catch (retryError) {
      setActionError(retryError.message || 'Failed to retry certificate generation');
    } finally {
      setRetryingId(null);
    }
  };

  const approve = async (id) => {
    if (approvingId || retryingId) return;
    setActionError(null);
    setApprovingId(id);
    try {
      const result = await approveRequest(id);
      if (result?.certificate?._id) {
        setApprovalSuccess({
          certificateId: result.certificate._id,
          certificateNumber: result.certificate.certificateNumber || 'Draft',
          internName: result.request?.userId?.fullName || 'Intern'
        });
      }
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setApprovingId(null);
    }
  };

  const reject = async (id) => {
    if (!reason.trim() || approvingId) return;
    setActionError(null);
    try {
      await rejectRequest(id, reason.trim());
      setRejectingId(null);
      setReason('');
    } catch (requestError) { setActionError(requestError.message); }
  };

  return (
    <section className="forwarded-requests-panel" aria-labelledby="forwarded-requests-title">
      <div className="forwarded-requests-heading">
        <div><p className="admin-eyebrow">CERTIFICATE DESK</p><h2 id="forwarded-requests-title">Requests awaiting approval</h2></div>
        <span className="forwarded-requests-count">{requests.length} awaiting</span>
      </div>

      {approvalSuccess && (
        <div className="forwarded-success-banner" role="status">
          <span>✓ Certificate draft generated for {approvalSuccess.internName} ({approvalSuccess.certificateNumber})</span>
          <button
            type="button"
            onClick={() => navigate(`/admin/certificates/review/${approvalSuccess.certificateId}`)}
          >
            Review Draft →
          </button>
        </div>
      )}

      {loading && <p className="forwarded-requests-state">Loading requests…</p>}
      {!loading && error && <div className="forwarded-requests-error" role="alert"><span>{error}</span><button type="button" onClick={refetch}>Retry</button></div>}
      {!loading && !error && actionError && <p className="forwarded-requests-error" role="alert">{actionError}</p>}
      {!loading && !error && !requests.length && <p className="forwarded-requests-state">No requests awaiting approval</p>}
      {!loading && requests.length > 0 && <div className="forwarded-requests-list">{requests.map((request) => {
        const id = request._id || request.id;
        const intern = request.userId || {};
        const certId = request.certificateId
          ? (typeof request.certificateId === 'object' ? request.certificateId._id : request.certificateId)
          : null;

        return <article className="forwarded-request-row" key={id}>
          <div className="forwarded-request-details">
            <h3>{intern.fullName || 'Unknown intern'}</h3>
            <p className="forwarded-request-meta">{intern.internCode || '—'} · {intern.domain || '—'} · {formatDate(request.requestedAt || request.createdAt)}</p>
            <p><strong>{request.certificateType?.replaceAll('_', ' ') || '—'}</strong></p>
            <p className="forwarded-request-reason">{request.reason || 'No reason provided'}</p>
          </div>
          <div className="forwarded-request-actions">
            {certId ? (
              <button
                type="button"
                className="forwarded-review-button"
                onClick={() => navigate(`/admin/certificates/review/${certId}`)}
              >
                Review Draft
              </button>
            ) : request.status === 'approved' ? (
              <button
                type="button"
                className="forwarded-retry-button"
                onClick={() => handleRetry(id)}
                disabled={retryingId === id}
              >
                {retryingId === id ? 'Generating...' : 'Retry Generation'}
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
                <button type="button" onClick={() => reject(id)} disabled={!reason.trim()}>Confirm Reject</button>
                <button type="button" onClick={() => { setRejectingId(null); setReason(''); }}>Cancel</button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="forwarded-approve-button"
                  onClick={() => approve(id)}
                  disabled={approvingId === id || retryingId === id}
                >
                  {approvingId === id ? 'Approving...' : 'Approve'}
                </button>
                <button
                  type="button"
                  className="forwarded-reject-button"
                  onClick={() => setRejectingId(id)}
                  disabled={approvingId === id || retryingId === id}
                >
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