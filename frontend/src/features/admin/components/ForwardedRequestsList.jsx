import { useState } from 'react';
import useForwardedRequests from '../hooks/useForwardedRequests';
import './ForwardedRequestsList.css';

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString(
        'en-US',
        {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }
      )
    : '—';

export default function ForwardedRequestsList() {
  const {
    requests,
    loading,
    error,
    refetch,
    approveRequest,
    rejectRequest,
    retryCertificateGeneration,
    retryingId,
  } = useForwardedRequests();

  const [rejectingId, setRejectingId] =
    useState(null);

  const [reason, setReason] = useState('');

  const [actionError, setActionError] =
    useState(null);

  const approve = async (id) => {
    setActionError(null);

    try {
      await approveRequest(id);
    } catch (requestError) {
      setActionError(
        requestError.message
      );
    }
  };

  const reject = async (id) => {
    if (!reason.trim()) {
      return;
    }

    setActionError(null);

    try {
      await rejectRequest(
        id,
        reason.trim()
      );

      setRejectingId(null);
      setReason('');
    } catch (requestError) {
      setActionError(
        requestError.message
      );
    }
  };

  const retryGeneration = async (id) => {
    setActionError(null);

    try {
      await retryCertificateGeneration(id);
    } catch (requestError) {
      setActionError(
        requestError.message
      );
    }
  };

  return (
    <section
      className="forwarded-requests-panel"
      aria-labelledby="forwarded-requests-title"
    >
      <div className="forwarded-requests-heading">
        <div>
          <p className="admin-eyebrow">
            CERTIFICATE DESK
          </p>

          <h2 id="forwarded-requests-title">
            Certificate requests
          </h2>
        </div>

        <span className="forwarded-requests-count">
          {requests.length} request
          {requests.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading && (
        <p className="forwarded-requests-state">
          Loading requests…
        </p>
      )}

      {!loading && error && (
        <div
          className="forwarded-requests-error"
          role="alert"
        >
          <span>{error}</span>

          <button
            type="button"
            onClick={refetch}
          >
            Retry
          </button>
        </div>
      )}

      {!loading &&
        !error &&
        actionError && (
          <p
            className="forwarded-requests-error"
            role="alert"
          >
            {actionError}
          </p>
        )}

      {!loading &&
        !error &&
        !requests.length && (
          <p className="forwarded-requests-state">
            No certificate requests found
          </p>
        )}

      {!loading &&
        requests.length > 0 && (
          <div className="forwarded-requests-list">
            {requests.map((request) => {
              const id =
                request._id || request.id;

              const intern =
                request.userId || {};

              const isApproved =
                request.status ===
                'approved';

              const hasCertificate =
                Boolean(
                  request.certificateId
                );

              const canRetry =
                isApproved &&
                !hasCertificate;

              const isRetrying =
                retryingId === id;

              return (
                <article
                  className="forwarded-request-row"
                  key={id}
                >
                  <div className="forwarded-request-details">
                    <h3>
                      {intern.fullName ||
                        'Unknown intern'}
                    </h3>

                    <p className="forwarded-request-meta">
                      {intern.email ||
                        intern.internCode ||
                        '—'}
                      {' · '}
                      {intern.domain || '—'}
                      {' · '}
                      {formatDate(
                        request.requestedAt ||
                          request.createdAt
                      )}
                    </p>

                    <p>
                      <strong>
                        {request.certificateType?.replaceAll(
                          '_',
                          ' '
                        ) || '—'}
                      </strong>
                    </p>

                    <p className="forwarded-request-reason">
                      {request.reason ||
                        'No reason provided'}
                    </p>

                    <p className="forwarded-request-meta">
                      Status:{' '}
                      <strong>
                        {request.status ||
                          'unknown'}
                      </strong>
                    </p>
                  </div>

                  <div className="forwarded-request-actions">
                    {rejectingId === id ? (
                      <div className="forwarded-reject-form">
                        <input
                          value={reason}
                          onChange={(event) =>
                            setReason(
                              event.target.value
                            )
                          }
                          placeholder="Rejection reason"
                          aria-label="Rejection reason"
                          autoFocus
                        />

                        <button
                          type="button"
                          onClick={() =>
                            reject(id)
                          }
                          disabled={
                            !reason.trim()
                          }
                        >
                          Confirm Reject
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRejectingId(
                              null
                            );
                            setReason('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        {request.status ===
                          'processing' && (
                          <>
                            <button
                              type="button"
                              className="forwarded-approve-button"
                              onClick={() =>
                                approve(id)
                              }
                            >
                              Approve
                            </button>

                            <button
                              type="button"
                              className="forwarded-reject-button"
                              onClick={() =>
                                setRejectingId(
                                  id
                                )
                              }
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {canRetry && (
                          <button
                            type="button"
                            className="forwarded-approve-button"
                            onClick={() =>
                              retryGeneration(id)
                            }
                            disabled={isRetrying}
                          >
                            {isRetrying
                              ? 'Generating…'
                              : 'Retry Generation'}
                          </button>
                        )}

                        {request.status ===
                          'approved' &&
                          hasCertificate && (
                            <span>
                              Certificate generated
                            </span>
                          )}

                        {request.status ===
                          'completed' && (
                          <span>
                            Certificate completed
                          </span>
                        )}

                        {request.status ===
                          'rejected' && (
                          <span>
                            Request rejected
                          </span>
                        )}
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