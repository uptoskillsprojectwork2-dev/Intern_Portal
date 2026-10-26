import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchFilteredRequests } from '../services/analytics.service';

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : '—';

export default function AnalyticsRequestsModal({
  isOpen,
  status,
  filters = {},
  onClose,
  onOpenInDesk
}) {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalCount: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRequests = async (targetPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: targetPage,
        limit: 10,
        ...filters
      };
      if (status) {
        // Map any human or custom status
        if (status === 'rejected-tl' || status === 'rejected-admin') {
          params.status = 'rejected';
        } else {
          params.status = status;
        }
      }

      const res = await fetchFilteredRequests(params);
      const data = res.data?.data || res.data || {};
      setRequests(data.requests || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRequests(1);
    }
  }, [isOpen, status, filters.from, filters.to, filters.range, filters.domain, filters.teamLeader]);

  if (!isOpen) return null;

  const displayStatus = status ? status.replace('-', ' ').toUpperCase() : 'ALL';

  return (
    <div className="analytics-modal-backdrop" onClick={onClose} id="analytics-drilldown-modal">
      <div className="analytics-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="analytics-modal-header">
          <div>
            <h3>Filtered Requests: {displayStatus}</h3>
            <p className="modal-subtitle">
              Clicking a chart segment displays live matching certificate requests.
            </p>
          </div>
          <div className="modal-header-actions">
            {onOpenInDesk && (
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  onClose();
                  onOpenInDesk(status);
                }}
              >
                Open in Certificate Desk ↗
              </button>
            )}
            <button
              type="button"
              className="close-modal-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="analytics-modal-body">
          {loading ? (
            <div className="modal-loading-skeleton">
              <p>Loading filtered requests...</p>
            </div>
          ) : error ? (
            <div className="widget-error-box">
              <p>⚠️ {error}</p>
              <button className="retry-btn" onClick={() => loadRequests(pagination.page)}>Retry</button>
            </div>
          ) : requests.length === 0 ? (
            <div className="empty-state">
              No requests found for status <strong>{displayStatus}</strong> in this date and domain range.
            </div>
          ) : (
            <div className="analytics-table-container">
              <table className="analytics-data-table">
                <thead>
                  <tr>
                    <th>Request #</th>
                    <th>Intern</th>
                    <th>Domain</th>
                    <th>Certificate Type</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id}>
                      <td>
                        <strong>{req.requestNumber || '—'}</strong>
                      </td>
                      <td>
                        <div>
                          <strong>{req.internName}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                            {req.internEmail}
                          </div>
                        </div>
                      </td>
                      <td>{req.domain || 'N/A'}</td>
                      <td>
                        <span className="pill blue">{req.certificateType}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${req.status === 'completed' ? 'ok' : req.status === 'rejected' ? 'alert' : 'pending'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td>{formatDate(req.requestedAt)}</td>
                      <td>
                        {['processing', 'approved'].includes(req.status) ? (
                          <button
                            type="button"
                            className="table-action-btn"
                            onClick={() => {
                              onClose();
                              navigate(`/admin/certificates/${req.id}/review`);
                            }}
                          >
                            Review
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Pagination */}
        {pagination.totalPages > 1 && (
          <div className="analytics-modal-footer">
            <span className="pagination-info">
              Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total)
            </span>
            <div className="pagination-controls">
              <button
                type="button"
                className="control-preset-btn"
                disabled={pagination.page <= 1 || loading}
                onClick={() => loadRequests(pagination.page - 1)}
              >
                ◀ Previous
              </button>
              <button
                type="button"
                className="control-preset-btn"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => loadRequests(pagination.page + 1)}
              >
                Next ▶
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
