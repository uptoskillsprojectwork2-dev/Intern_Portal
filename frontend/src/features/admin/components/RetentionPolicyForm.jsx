import { useState, useEffect } from 'react';
import { getRetentionPolicy, updateRetentionPolicy } from '../services/admin.service';
import Toast from '../../../shared/components/Toast';
import './RetentionPolicyForm.css';

export default function RetentionPolicyForm() {
  const [graceDays, setGraceDays] = useState(30);
  const [purgeDays, setPurgeDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchPolicy = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRetentionPolicy();
      if (data.policy) {
        setGraceDays(data.policy.graceDays || 30);
        setPurgeDays(data.policy.purgeDays || 90);
      }
    } catch (err) {
      setError(err.message || 'Failed to load retention policy.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicy();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const grace = parseInt(graceDays, 10);
    const purge = parseInt(purgeDays, 10);

    if (isNaN(grace) || grace < 1) {
      setError('Grace period must be at least 1 day.');
      return;
    }

    if (isNaN(purge) || purge < 1) {
      setError('Purge period must be at least 1 day.');
      return;
    }

    if (purge <= grace) {
      setError('Purge period must be greater than grace period.');
      return;
    }

    setSaving(true);
    try {
      const res = await updateRetentionPolicy({ graceDays: grace, purgeDays: purge });
      setToast({ type: 'success', message: 'Retention policy saved successfully!' });
      if (res.policy) {
        setGraceDays(res.policy.graceDays);
        setPurgeDays(res.policy.purgeDays);
      }
    } catch (err) {
      setError(err.message || 'Failed to update retention policy.');
      setToast({ type: 'error', message: err.message || 'Failed to save policy.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="retention-form-card">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <header className="retention-form-header">
        <div className="retention-header-icon">⚙</div>
        <div>
          <h3>Account Retention & Lifecycle Policy</h3>
          <p>Configure automated archival and data purge grace periods for completed internships.</p>
        </div>
      </header>

      {loading ? (
        <div className="retention-loading-state">
          <div className="spinner-ring" />
          <p>Loading policy settings...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="retention-form-body">
          {error && (
            <div className="retention-error-alert" role="alert">
              <span>⚠ {error}</span>
            </div>
          )}

          <div className="retention-inputs-grid">
            <div className="retention-field-card">
              <div className="field-header">
                <label htmlFor="grace-days-input">Grace Period (Days)</label>
                <span className="field-badge">Archival Trigger</span>
              </div>
              <p className="field-desc">
                Days after internship end date before account is archived. Intern can download certificates during this window.
              </p>
              <input
                id="grace-days-input"
                type="number"
                min="1"
                value={graceDays}
                onChange={(e) => setGraceDays(e.target.value)}
                required
              />
            </div>

            <div className="retention-field-card">
              <div className="field-header">
                <label htmlFor="purge-days-input">Purge Period (Days)</label>
                <span className="field-badge danger">Data Removal</span>
              </div>
              <p className="field-desc">
                Days after archival before PII is anonymized. Issued certificate PDFs remain verifiable permanently.
              </p>
              <input
                id="purge-days-input"
                type="number"
                min="1"
                value={purgeDays}
                onChange={(e) => setPurgeDays(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="retention-policy-summary">
            <div className="summary-item">
              <span>Warning Email:</span> <strong>7 days before archival</strong>
            </div>
            <div className="summary-item">
              <span>Archival at:</span> <strong>End Date + {graceDays || 30} days</strong>
            </div>
            <div className="summary-item">
              <span>PII Purge at:</span> <strong>Archived Date + {purgeDays || 90} days</strong>
            </div>
          </div>

          <div className="retention-form-footer">
            <button
              type="submit"
              className="btn-save-policy"
              disabled={saving}
            >
              {saving ? 'Saving Policy...' : 'Save Retention Policy'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
