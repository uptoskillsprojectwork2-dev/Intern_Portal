import { useState } from 'react';
import useArchivedInterns from '../hooks/useArchivedInterns';
import Toast from '../../../shared/components/Toast';
import './ArchivedInternsList.css';

export default function ArchivedInternsList() {
  const { archivedInterns, policy, loading, error, restoringId, refresh, restore } = useArchivedInterns();

  const [confirmModal, setConfirmModal] = useState(null); // intern object to confirm restore
  const [toast, setToast] = useState(null);

  const handleConfirmRestore = async () => {
    if (!confirmModal) return;

    const res = await restore(confirmModal._id);
    setConfirmModal(null);

    if (res.success) {
      setToast({ type: 'success', message: `Restored intern ${confirmModal.fullName} successfully!` });
    } else {
      setToast({ type: 'error', message: res.error || 'Failed to restore intern.' });
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="archived-interns-shell">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <header className="archived-header">
        <div>
          <h2>Archived Intern Accounts</h2>
          <p>
            Intern accounts archived after internship completion. Personal data will be purged after {policy?.purgeDays || 90} days.
          </p>
        </div>
        <button type="button" className="btn-refresh-archived" onClick={refresh} title="Refresh list">
          🔄 Refresh
        </button>
      </header>

      {/* Loading State */}
      {loading && (
        <div className="archived-state-panel loading">
          <div className="spinner-ring" />
          <p>Fetching archived interns...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="archived-state-panel error" role="alert">
          <span>⚠ {error}</span>
          <button type="button" className="btn-retry-archived" onClick={refresh}>
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && archivedInterns.length === 0 && (
        <div className="archived-state-panel empty">
          <div className="empty-icon">📂</div>
          <h3>No archived interns</h3>
          <p>There are no intern accounts currently in the archived state.</p>
        </div>
      )}

      {/* Table List */}
      {!loading && !error && archivedInterns.length > 0 && (
        <div className="archived-table-wrapper">
          <table className="archived-table">
            <thead>
              <tr>
                <th>Intern Name</th>
                <th>Intern Code</th>
                <th>Domain</th>
                <th>Archived Date</th>
                <th>Days to Purge</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {archivedInterns.map((intern) => (
                <tr key={intern._id}>
                  <td>
                    <div className="intern-name-cell">
                      <strong>{intern.fullName}</strong>
                      <small>{intern.email}</small>
                    </div>
                  </td>
                  <td>
                    <code>{intern.internCode || '—'}</code>
                  </td>
                  <td>{intern.domain || 'General'}</td>
                  <td>{formatDate(intern.archivedAt || intern.createdAt)}</td>
                  <td>
                    <span className={`purge-countdown-pill ${intern.daysLeftBeforePurge <= 7 ? 'urgent' : ''}`}>
                      {intern.daysLeftBeforePurge} day(s) left
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn-restore-intern"
                      onClick={() => setConfirmModal(intern)}
                      disabled={restoringId === intern._id}
                    >
                      {restoringId === intern._id ? 'Restoring...' : 'Restore Account'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Restore Confirmation Dialog */}
      {confirmModal && (
        <div className="restore-dialog-backdrop" onClick={() => setConfirmModal(null)}>
          <div className="restore-dialog-content" onClick={(e) => e.stopPropagation()}>
            <h3>Restore Intern Account?</h3>
            <p>
              Are you sure you want to restore <strong>{confirmModal.fullName}</strong> ({confirmModal.email})?
              This will re-enable login access for the intern and remove them from the archival purge queue.
            </p>
            <div className="restore-dialog-actions">
              <button
                type="button"
                className="btn-dialog-cancel"
                onClick={() => setConfirmModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-dialog-confirm"
                onClick={handleConfirmRestore}
              >
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
