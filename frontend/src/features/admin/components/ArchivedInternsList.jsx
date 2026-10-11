import { useState } from "react";
import useArchivedInterns from "../hooks/useArchivedInterns";
import "./ArchivedInternsList.css";

export default function ArchivedInternsList() {
  const {
    archivedInterns,
    loading,
    error,
    restoringId,
    fetchArchivedInterns,
    restore,
  } = useArchivedInterns();

  const [toastMessage, setToastMessage] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null); // { intern, isOpen }
  const [searchTerm, setSearchTerm] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenRestoreConfirm = (intern) => {
    setConfirmDialog(intern);
  };

  const handleConfirmRestore = async () => {
    if (!confirmDialog) return;
    const intern = confirmDialog;
    setConfirmDialog(null);

    try {
      await restore(intern._id || intern.id);
      showToast(`Intern ${intern.fullName} successfully restored! Login access re-enabled.`);
    } catch (err) {
      showToast(err.message || "Failed to restore intern.");
    }
  };

  const filteredInterns = archivedInterns.filter((intern) => {
    const term = searchTerm.toLowerCase();
    return (
      (intern.fullName || "").toLowerCase().includes(term) ||
      (intern.internCode || "").toLowerCase().includes(term) ||
      (intern.domain || "").toLowerCase().includes(term) ||
      (intern.email || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="archived-interns-card">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="archived-toast" role="status">
          <span>✓ {toastMessage}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDialog && (
        <div className="archived-confirm-backdrop" onClick={() => setConfirmDialog(null)}>
          <div
            className="archived-confirm-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="confirm-icon-wrap">
              <span>🔄</span>
            </div>
            <h4>Restore Intern Account?</h4>
            <p>
              Are you sure you want to restore <strong>{confirmDialog.fullName}</strong> (
              <code>{confirmDialog.internCode || confirmDialog.email}</code>)?
            </p>
            <p className="confirm-subtext">
              Restoring will remove the account from the archive, halt the purge countdown, and re-enable login access.
            </p>
            <div className="confirm-actions">
              <button
                type="button"
                className="btn-confirm-cancel"
                onClick={() => setConfirmDialog(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-confirm-restore"
                onClick={handleConfirmRestore}
              >
                Yes, Restore Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header and Search */}
      <div className="archived-header-row">
        <div>
          <h3>Archived Interns</h3>
          <p className="archived-subtitle">
            Accounts whose internship ended past the grace period. Accounts will be purged once days reach zero.
          </p>
        </div>

        <div className="archived-actions-right">
          <div className="archived-search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by name, code or domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="archived-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchTerm("")}
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn-refresh-archived"
            onClick={fetchArchivedInterns}
            disabled={loading}
            title="Refresh archived list"
          >
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>

      {/* Error State with Retry */}
      {error && (
        <div className="archived-alert error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn-alert-retry" onClick={fetchArchivedInterns}>
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="archived-skeleton-table">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="archived-skeleton-row shimmer" />
          ))}
        </div>
      ) : filteredInterns.length === 0 ? (
        <div className="archived-empty-state">
          <div className="empty-icon-wrap">
            <span>📦</span>
          </div>
          <h4>No archived interns</h4>
          <p>
            {searchTerm
              ? `No archived interns matching "${searchTerm}". Try another search.`
              : "There are currently no intern accounts archived in the system."}
          </p>
          {searchTerm && (
            <button
              type="button"
              className="btn-clear-search"
              onClick={() => setSearchTerm("")}
            >
              Clear Search Filter
            </button>
          )}
        </div>
      ) : (
        <div className="archived-table-wrapper">
          <table className="archived-table">
            <colgroup>
              <col style={{ width: "26%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "13%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>INTERN</th>
                <th>INTERN CODE</th>
                <th>DOMAIN</th>
                <th>ARCHIVED ON</th>
                <th>PURGE COUNTDOWN</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredInterns.map((intern) => {
                const daysLeft = intern.daysLeftBeforePurge ?? "—";
                const isUrgent = typeof daysLeft === "number" && daysLeft <= 7;
                const isRestoring = restoringId === (intern._id || intern.id);

                return (
                  <tr key={intern._id || intern.id} className="archived-row">
                    <td data-label="Intern">
                      <div className="intern-cell">
                        <span className="intern-name-bold" title={intern.fullName}>{intern.fullName}</span>
                        <span className="intern-email-sub" title={intern.email}>{intern.email}</span>
                      </div>
                    </td>

                    <td data-label="Code">
                      <span className="intern-code-chip" title={intern.internCode || ""}>{intern.internCode || "—"}</span>
                    </td>

                    <td data-label="Domain">
                      <span className="intern-domain-text" title={intern.domain || ""}>{intern.domain || "—"}</span>
                    </td>

                    <td data-label="Archived On">
                      <span className="archived-date-text">
                        {intern.archivedAt
                          ? new Date(intern.archivedAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </span>
                    </td>

                    <td data-label="Purge Countdown">
                      <div className="purge-countdown-pill-wrap">
                        <span className={`purge-countdown-pill ${isUrgent ? "urgent" : ""}`}>
                          {daysLeft === 0
                            ? "Purge Pending"
                            : `${daysLeft} Day${daysLeft === 1 ? "" : "s"} Left`}
                        </span>
                      </div>
                    </td>

                    <td data-label="Actions" className="text-right actions-cell">
                      <button
                        type="button"
                        className="btn-restore-intern"
                        onClick={() => handleOpenRestoreConfirm(intern)}
                        disabled={isRestoring}
                        title="Restore intern account"
                      >
                        {isRestoring ? (
                          <span>Restoring...</span>
                        ) : (
                          <>
                            <span className="btn-icon">↺</span> Restore
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
