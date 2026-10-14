import React, { useState } from 'react';

function getRelativeTime(dateInput) {
  if (!dateInput) return '—';
  const now = new Date();
  const past = new Date(dateInput);
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getActionBadgeClass(action) {
  switch (action) {
    case 'REQUEST_REJECTED':
    case 'CERTIFICATE_REVOKED':
    case 'LOGIN_FAILED':
    case 'INTERN_PURGED':
      return 'badge-danger';

    case 'REQUEST_APPROVED':
    case 'CERTIFICATE_FINALIZED':
    case 'PASSWORD_RESET_COMPLETED':
    case 'INTERN_RESTORED':
      return 'badge-success';

    case 'REQUEST_SUBMITTED':
    case 'CERTIFICATE_DRAFT_CREATED':
    case 'USER_CREATED':
    case 'TEMPLATE_CREATED':
      return 'badge-primary';

    case 'REQUEST_FORWARDED':
    case 'CERTIFICATE_EDITED':
    case 'TEMPLATE_UPDATED':
    case 'TEMPLATE_TOGGLED':
    case 'RETENTION_POLICY_UPDATED':
    case 'INTERN_ARCHIVED':
      return 'badge-warning';

    case 'LOGIN':
    case 'LOGOUT':
    case 'EXPORT':
    case 'PASSWORD_RESET_REQUESTED':
    default:
      return 'badge-neutral';
  }
}

export default function AuditLogTable({
  logs,
  loading,
  error,
  page,
  totalPages,
  total,
  onPageChange,
  onRetry
}) {
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRow = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (error) {
    return (
      <div className="audit-state-container error" role="alert">
        <div className="audit-state-icon error">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="audit-state-title">Unable to load audit activity</p>
        <p className="audit-state-desc">{error}</p>
        <button type="button" className="audit-btn-retry" onClick={onRetry}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="audit-table-wrapper">
      <div className="audit-table-responsive">
        <table className="audit-table" aria-label="Audit activity log table">
          <thead>
            <tr>
              <th scope="col" style={{ width: '40px' }} aria-label="Expand row"></th>
              <th scope="col">Time</th>
              <th scope="col">Actor</th>
              <th scope="col">Action</th>
              <th scope="col">Target</th>
              <th scope="col">IP Address</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Loading Skeleton Rows
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={`skel-${idx}`} className="audit-skeleton-row">
                  <td><div className="audit-skeleton-cell dot"></div></td>
                  <td><div className="audit-skeleton-cell text-sm"></div></td>
                  <td><div className="audit-skeleton-cell text-md"></div></td>
                  <td><div className="audit-skeleton-cell badge"></div></td>
                  <td><div className="audit-skeleton-cell text-sm"></div></td>
                  <td><div className="audit-skeleton-cell text-xs"></div></td>
                </tr>
              ))
            ) : logs.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan="6">
                  <div className="audit-state-container empty">
                    <div className="audit-state-icon empty">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                      </svg>
                    </div>
                    <p className="audit-state-title">No activity for this filter</p>
                    <p className="audit-state-desc">
                      Try adjusting the date range, actor, or action criteria to view relevant audit events.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const isExpanded = expandedRows.has(log._id);
                const exactTime = log.createdAt ? new Date(log.createdAt).toLocaleString() : '—';
                const relativeTime = getRelativeTime(log.createdAt);

                const actorName = log.actorId?.fullName || (log.actorRole === 'system' ? 'System Job' : 'Automated System');
                const actorEmail = log.actorId?.email;
                const actorRole = log.actorRole || log.actorId?.role || 'system';

                const targetDisplay = log.targetType
                  ? `${log.targetType}${log.targetId ? ` (${String(log.targetId).slice(-6)})` : ''}`
                  : '—';

                const hasMeta = log.meta && Object.keys(log.meta).length > 0;

                return (
                  <React.Fragment key={log._id}>
                    <tr
                      className={`audit-row ${isExpanded ? 'expanded' : ''} ${hasMeta ? 'clickable' : ''}`}
                      onClick={() => hasMeta && toggleRow(log._id)}
                      tabIndex={hasMeta ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (hasMeta && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          toggleRow(log._id);
                        }
                      }}
                    >
                      <td className="audit-expand-col">
                        {hasMeta ? (
                          <button
                            type="button"
                            className={`audit-chevron-btn ${isExpanded ? 'open' : ''}`}
                            aria-label={isExpanded ? 'Collapse row metadata' : 'Expand row metadata'}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRow(log._id);
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </button>
                        ) : (
                          <span className="audit-empty-bullet">•</span>
                        )}
                      </td>

                      {/* Time Column with Hover Tooltip */}
                      <td className="audit-time-col">
                        <span className="audit-relative-time" title={exactTime}>
                          {relativeTime}
                        </span>
                        <span className="audit-exact-subtext">{exactTime}</span>
                      </td>

                      {/* Actor Column */}
                      <td className="audit-actor-col">
                        <div className="audit-actor-details">
                          <span className="audit-actor-name">{actorName}</span>
                          <div className="audit-actor-subline">
                            <span className={`audit-role-tag ${actorRole}`}>
                              {actorRole}
                            </span>
                            {actorEmail && <span className="audit-actor-email">{actorEmail}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Action Column */}
                      <td className="audit-action-col">
                        <span className={`audit-action-badge ${getActionBadgeClass(log.action)}`}>
                          {log.action}
                        </span>
                      </td>

                      {/* Target Column */}
                      <td className="audit-target-col">
                        <span className="audit-target-val" title={log.targetId ? `ID: ${log.targetId}` : undefined}>
                          {targetDisplay}
                        </span>
                      </td>

                      {/* IP Column */}
                      <td className="audit-ip-col">
                        <code className="audit-ip-code">{log.ip || '—'}</code>
                      </td>
                    </tr>

                    {/* Expandable Meta Row */}
                    {isExpanded && hasMeta && (
                      <tr className="audit-meta-row">
                        <td colSpan="6">
                          <div className="audit-meta-card">
                            <div className="audit-meta-header">
                              <span className="audit-meta-label">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="16 18 22 12 16 6" />
                                  <polyline points="8 6 2 12 8 18" />
                                </svg>
                                Action Payload & Metadata
                              </span>
                              {log.userAgent && (
                                <span className="audit-meta-ua" title={log.userAgent}>
                                  UA: {log.userAgent}
                                </span>
                              )}
                            </div>
                            <pre className="audit-meta-code">
                              <code>{JSON.stringify(log.meta, null, 2)}</code>
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && totalPages > 1 && (
        <div className="audit-pagination">
          <div className="audit-pagination-info">
            Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total logs)
          </div>
          <div className="audit-pagination-controls">
            <button
              type="button"
              className="audit-page-btn"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </button>
            <span className="audit-page-current">{page}</span>
            <button
              type="button"
              className="audit-page-btn"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
