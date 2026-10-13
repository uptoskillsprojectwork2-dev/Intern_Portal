import { useState } from 'react';
import useArchivedInterns from '../hooks/useArchivedInterns';
import Toast from '../../../shared/components/Toast';
import './ArchivedInternsList.css';

const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '—';
  }
};

export default function ArchivedInternsList() {
  const {
    archivedInterns,
    loading,
    error,
    restoringId,
    restoreIntern,
    retry
  } = useArchivedInterns();

  const [confirmTarget, setConfirmTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleOpenConfirm = (intern) => {
    setConfirmTarget(intern);
  };

  const handleCloseConfirm = () => {
    setConfirmTarget(null);
  };

  const handleConfirmRestore = async () => {
    if (!confirmTarget) return;
    const internId = confirmTarget.id || confirmTarget._id;

    try {
      await restoreIntern(internId);
      showToast('success', `Account for ${confirmTarget.fullName} restored successfully!`);
      setConfirmTarget(null);
    } catch (err) {
      showToast('error', err.message || 'Failed to restore archived intern.');
    }
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

      {/* Header */}
      <div className="archived-header">
        <div className="archived-header-text">
          <h2>
            <span>📦</span> Archived Intern Accounts
          </h2>
          <p>
            Accounts archived after their retention grace period. These accounts cannot log in but can be
            restored prior to their purge date.
          </p>
        </div>
      </div>

      {/* Main Content card */}
      <div className="archived-table-card">
        {loading ? (
          <div className="archived-loading-state" role="status">
            <span>Loading archived interns…</span>
          </div>
        ) : error ? (
          <div className="archived-error-state" role="alert">
            <p>⚠️ {error}</p>
            <button
              id="retry-archived-interns-btn"
              type="button"
              className="archived-retry-btn"
              onClick={retry}
            >
              Retry
            </button>
          </div>
        ) : archivedInterns.length === 0 ? (
          <div className="archived-empty-state">
            <h3>No archived interns</h3>
            <p>There are currently no intern accounts pending archival or purge.</p>
          </div>
        ) : (
          <table className="archived-table" aria-label="Archived interns">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Intern Code</th>
                <th scope="col">Domain</th>
                <th scope="col">Archived Date</th>
                <th scope="col">Days Until Purge</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {archivedInterns.map((intern) => {
                const id = intern.id || intern._id;
                const days = intern.daysRemaining ?? 0;
                const isUrgent = days <= 14;

                return (
                  <tr key={id}>
                    <td>
                      <div className="archived-user-cell">
                        <span className="archived-user-name">{intern.fullName || '—'}</span>
                        <span className="archived-user-email">{intern.email || ''}</span>
                      </div>
                    </td>
                    <td>
                      <span className="archived-code-badge">{intern.internCode || '—'}</span>
                    </td>
                    <td>{intern.domain || 'General'}</td>
                    <td>{formatDate(intern.archivedAt)}</td>
                    <td>
                      <span className={`days-remaining-pill ${isUrgent ? 'urgent' : 'normal'}`}>
                        ⏳ {days} {days === 1 ? 'day' : 'days'}
                      </span>
                    </td>
                    <td>
                      <button
                        id={`restore-intern-${id}`}
                        type="button"
                        className="archived-restore-btn"
                        onClick={() => handleOpenConfirm(intern)}
                        disabled={restoringId === id}
                        title="Restore this intern account"
                      >
                        {restoringId === id ? 'Restoring…' : 'Restore'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Restore Confirmation Dialog Modal */}
      {confirmTarget && (
        <div className="archived-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="restore-modal-title">
          <div className="archived-modal-card">
            <div className="archived-modal-header">
              <h3 id="restore-modal-title">Restore Intern Account</h3>
              <p>
                Are you sure you want to restore the account for{' '}
                <strong>{confirmTarget.fullName}</strong> ({confirmTarget.internCode})?
              </p>
              <p style={{ marginTop: '8px', fontSize: '12px' }}>
                Restoring will reactivate their portal login and clear their archival flag. Their existing
                certificates and history will be fully preserved.
              </p>
            </div>

            <div className="archived-modal-actions">
              <button
                id="cancel-restore-btn"
                type="button"
                className="archived-modal-cancel-btn"
                onClick={handleCloseConfirm}
                disabled={Boolean(restoringId)}
              >
                Cancel
              </button>
              <button
                id="confirm-restore-btn"
                type="button"
                className="archived-modal-confirm-btn"
                onClick={handleConfirmRestore}
                disabled={Boolean(restoringId)}
              >
                {restoringId ? 'Restoring…' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
