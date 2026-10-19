import { useState, Fragment } from 'react';

const RED_ACTIONS = new Set([
  'REQUEST_REJECTED',
  'CERTIFICATE_REVOKED',
  'LOGIN_FAILED',
  'INTERN_PURGED',
]);

const GREEN_ACTIONS = new Set([
  'REQUEST_APPROVED',
  'CERTIFICATE_FINALIZED',
  'LOGIN',
  'INTERN_RESTORED',
]);

function getActionBadgeClass(action) {
  if (RED_ACTIONS.has(action)) return 'action-badge action-badge-red';
  if (GREEN_ACTIONS.has(action)) return 'action-badge action-badge-green';
  return 'action-badge action-badge-neutral';
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function SkeletonRows({ count = 8 }) {
  return Array.from({ length: count }).map((_, i) => (
    <tr key={i} className="skeleton-row">
      <td><div className="skeleton-bar" style={{ width: '70px' }} /></td>
      <td><div className="skeleton-bar" style={{ width: '120px' }} /></td>
      <td><div className="skeleton-bar" style={{ width: '110px' }} /></td>
      <td><div className="skeleton-bar" style={{ width: '90px' }} /></td>
      <td><div className="skeleton-bar" style={{ width: '80px' }} /></td>
    </tr>
  ));
}

export default function AuditLogTable({ logs, loading, error, onRetry }) {
  const [expandedRow, setExpandedRow] = useState(null);

  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  if (error) {
    return (
      <div className="audit-empty-state audit-error-state" role="alert">
        <span className="audit-empty-icon" aria-hidden="true">⚠️</span>
        <p className="audit-error-message">{error}</p>
        <button type="button" className="audit-btn primary-btn" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  if (!loading && (!logs || logs.length === 0)) {
    return (
      <div className="audit-empty-state" role="status">
        <span className="audit-empty-icon" aria-hidden="true">📋</span>
        <p>No activity for this filter</p>
      </div>
    );
  }

  return (
    <div className="audit-table-wrap">
      <table className="audit-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Target</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows count={8} />
          ) : (
            logs.map((log) => {
              const logId = log._id;
              const isExpanded = expandedRow === logId;
              const actorName = log.actorId?.fullName || (log.actorRole === 'system' ? 'System' : 'Unknown');
              const actorRole = log.actorRole || 'system';

              return (
                <Fragment key={logId}>
                  <tr
                    className={`audit-log-row ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => toggleRow(logId)}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isExpanded}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleRow(logId);
                      }
                    }}
                  >
                    <td
                      className="audit-cell-time"
                      title={log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                    >
                      <span className="expand-icon" aria-hidden="true">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      <span>{log.createdAt ? timeAgo(log.createdAt) : '—'}</span>
                    </td>
                    <td className="audit-cell-actor">
                      <span className="actor-name">{actorName}</span>
                      <span className={`actor-role role-${actorRole}`}>{actorRole}</span>
                    </td>
                    <td className="audit-cell-action">
                      <span className={getActionBadgeClass(log.action)}>
                        {(log.action || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="audit-cell-target">
                      <span className="target-type">{log.targetType || '—'}</span>
                      {log.targetId && (
                        <span className="target-id" title={String(log.targetId)}>
                          #{String(log.targetId).slice(-6)}
                        </span>
                      )}
                    </td>
                    <td className="audit-cell-ip">
                      <code>{log.ip || '—'}</code>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="audit-expanded-row">
                      <td colSpan={5}>
                        <div className="audit-meta-box">
                          <div className="audit-meta-header">
                            <strong>Event Metadata</strong>
                            <span className="audit-meta-id">ID: {logId}</span>
                          </div>
                          <pre>{JSON.stringify(log.meta || {}, null, 2)}</pre>
                          {log.userAgent && (
                            <div className="audit-ua-box">
                              <span className="audit-ua-label">User Agent:</span>
                              <span className="audit-ua">{log.userAgent}</span>
                            </div>
                          )}
                          <div className="audit-meta-footer">
                            <span>Exact Timestamp: {new Date(log.createdAt).toLocaleString()}</span>
                            {log.targetId && <span>Target ID: {String(log.targetId)}</span>}
                            {log.actorId?._id && <span>Actor ID: {String(log.actorId._id)}</span>}
                            {log.actorId?.email && <span>Actor Email: {log.actorId.email}</span>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
