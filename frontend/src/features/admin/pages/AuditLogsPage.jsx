import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { useAuditLogs } from '../hooks/useAuditLogs';
import AuditLogFilters from '../components/AuditLogFilters';
import AuditLogTable from '../components/AuditLogTable';
import { exportAuditLogs } from '../services/admin.service';
import Toast from '../../../shared/components/Toast';
import NotificationBell from '../../../shared/components/NotificationBell';
import './AuditLogsPage.css';

export default function AuditLogsPage() {
  const navigate = useNavigate();
  const { user, handleLogout } = useAuth();
  const {
    logs,
    page,
    totalPages,
    total,
    loading,
    error,
    filters,
    setFilters,
    goToPage,
    retry,
  } = useAuditLogs();

  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState(null);

  const initials = (user?.fullName || 'Admin')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const onLogout = () => {
    handleLogout();
    navigate('/login');
  };

  const handleExport = async () => {
    setExporting(true);
    setToast(null);
    try {
      await exportAuditLogs(filters);
      setToast({ type: 'success', message: 'Audit logs exported successfully.' });
    } catch (err) {
      setToast({
        type: 'error',
        message: err.message || 'Failed to export audit logs.',
      });
    } finally {
      setExporting(false);
    }
  };

  const startEntry = total === 0 ? 0 : (page - 1) * 25 + 1;
  const endEntry = Math.min(page * 25, total);

  return (
    <div className="audit-page-shell">
      {/* Top Bar matching portal design */}
      <header className="audit-topbar">
        <div className="audit-brand" onClick={() => navigate('/admin/dashboard')} style={{ cursor: 'pointer' }}>
          <span className="audit-brand-icon">UP</span>
          <strong>uptoskills</strong>
        </div>

        <div className="audit-topbar-user">
          <NotificationBell role="admin" />
          <div className="audit-avatar">{initials}</div>
          <div>
            <strong>{user?.fullName || 'Administrator'}</strong>
            <small>{user?.email || 'admin@uptoskills.com'}</small>
          </div>
          <button
            type="button"
            className="audit-logout-btn"
            onClick={onLogout}
            title="Sign out"
          >
            <span>↩</span>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="audit-main-content">
        {/* Navigation & Header */}
        <div className="audit-header-section">
          <div className="audit-back-nav">
            <button
              type="button"
              className="audit-back-btn"
              onClick={() => navigate('/admin/dashboard')}
            >
              <span>←</span> Back to Dashboard
            </button>
          </div>

          <div className="audit-title-row">
            <div className="audit-title-info">
              <span className="audit-eyebrow">PORTAL GOVERNANCE</span>
              <h1>Audit Logs</h1>
              <p>
                Immutable record of user actions, certificate lifecycle events,
                retention policy updates, and security events.
              </p>
            </div>

            <div className="audit-header-actions">
              <button
                type="button"
                className="audit-btn secondary-btn"
                onClick={retry}
                disabled={loading}
                title="Refresh log entries"
              >
                <span>🔄</span>
                Refresh
              </button>
              <button
                type="button"
                className="audit-btn export-btn"
                onClick={handleExport}
                disabled={exporting}
                title="Download CSV of current filter"
              >
                <span>📥</span>
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
          </div>
        </div>

        {/* Global Toast */}
        {toast && (
          <div className="audit-toast-container">
            <Toast
              type={toast.type}
              message={toast.message}
              onClose={() => setToast(null)}
            />
          </div>
        )}

        {/* Filters Card */}
        <section className="audit-card audit-filters-card" aria-label="Audit filters">
          <AuditLogFilters filters={filters} onFilterChange={setFilters} />
        </section>

        {/* Results Metadata & Table Card */}
        <section className="audit-card audit-table-card" aria-label="Audit log entries">
          <div className="audit-table-meta-bar">
            <div className="audit-results-count">
              {loading ? (
                <span>Loading activity logs...</span>
              ) : (
                <span>
                  Showing <strong>{startEntry}–{endEntry}</strong> of{' '}
                  <strong>{total}</strong> log {total === 1 ? 'entry' : 'entries'}
                </span>
              )}
            </div>

            {/* Active filter tags summary */}
            {(filters.actor || filters.action || filters.targetType || filters.from || filters.to) && (
              <div className="audit-active-tags">
                <span className="audit-active-label">Active filters:</span>
                {filters.action && (
                  <span className="audit-tag">
                    Action: {filters.action}
                  </span>
                )}
                {filters.actor && (
                  <span className="audit-tag">
                    Actor: {filters.actor}
                  </span>
                )}
                {filters.targetType && (
                  <span className="audit-tag">
                    Target: {filters.targetType}
                  </span>
                )}
                {(filters.from || filters.to) && (
                  <span className="audit-tag">
                    Dates: {filters.from || 'start'} to {filters.to || 'now'}
                  </span>
                )}
              </div>
            )}
          </div>

          <AuditLogTable
            logs={logs}
            loading={loading}
            error={error}
            onRetry={retry}
          />

          {/* Pagination Footer */}
          {!loading && totalPages > 1 && (
            <div className="audit-pagination">
              <button
                type="button"
                className="audit-page-btn"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
              >
                ← Previous
              </button>

              <div className="audit-page-info">
                <span>
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                </span>
              </div>

              <button
                type="button"
                className="audit-page-btn"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
