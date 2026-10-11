import { useState, useEffect } from "react";
import { getRetentionPolicy, updateRetentionPolicy } from "../services/admin.service";
import "./RetentionPolicyForm.css";

export default function RetentionPolicyForm({ onPolicyUpdated }) {
  const [graceDays, setGraceDays] = useState(30);
  const [purgeDays, setPurgeDays] = useState(90);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchPolicy = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRetentionPolicy();
      if (data?.policy) {
        setGraceDays(data.policy.graceDays || 30);
        setPurgeDays(data.policy.purgeDays || 90);
        setUpdatedAt(data.policy.updatedAt || null);
      }
    } catch (err) {
      setError(err.message || "Failed to load retention policy.");
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
    setSuccess(null);

    const gDays = parseInt(graceDays, 10);
    const pDays = parseInt(purgeDays, 10);

    if (isNaN(gDays) || gDays < 1) {
      setError("Grace period must be at least 1 day.");
      return;
    }

    if (isNaN(pDays) || pDays < 1) {
      setError("Purge period must be at least 1 day.");
      return;
    }

    if (pDays <= gDays) {
      setError("Purge days must be strictly greater than grace days (purgeDays > graceDays).");
      return;
    }

    setSaving(true);
    try {
      const res = await updateRetentionPolicy({ graceDays: gDays, purgeDays: pDays });
      setSuccess("Retention policy updated successfully.");
      setUpdatedAt(res.policy?.updatedAt || new Date().toISOString());
      if (onPolicyUpdated) {
        onPolicyUpdated(res.policy);
      }
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err.message || "Failed to save retention policy.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="retention-policy-card loading-state">
        <div className="policy-skeleton title-sk" />
        <div className="policy-skeleton input-sk" />
        <div className="policy-skeleton input-sk" />
      </div>
    );
  }

  return (
    <div className="retention-policy-card">
      <div className="retention-policy-header">
        <div className="header-icon-wrap">
          <span className="policy-icon">⏱️</span>
        </div>
        <div>
          <h3>Intern Account Lifecycle & Retention Policy</h3>
          <p className="policy-subtitle">
            Configure automatic account archival and permanent personal data purge timelines.
          </p>
        </div>
      </div>

      {error && (
        <div className="policy-alert error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn-alert-retry" onClick={fetchPolicy}>
            Retry
          </button>
        </div>
      )}

      {success && (
        <div className="policy-alert success" role="status">
          <span>✓ {success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="retention-policy-form">
        <div className="policy-inputs-grid">
          <div className="policy-field-group">
            <label htmlFor="graceDays" className="policy-label">
              GRACE PERIOD (DAYS)
              <span className="field-hint">Days after internship completion before account is archived</span>
            </label>
            <div className="input-with-badge">
              <input
                id="graceDays"
                type="number"
                min="1"
                className="policy-input"
                value={graceDays}
                onChange={(e) => setGraceDays(e.target.value)}
                disabled={saving}
                required
              />
              <span className="input-unit">Days</span>
            </div>
            <p className="field-explainer">
              Interns retain full dashboard access to download certificates during this window.
            </p>
          </div>

          <div className="policy-field-group">
            <label htmlFor="purgeDays" className="policy-label">
              PURGE TIMELINE (DAYS)
              <span className="field-hint">Days after archival before personal data is permanently anonymized</span>
            </label>
            <div className="input-with-badge">
              <input
                id="purgeDays"
                type="number"
                min="2"
                className="policy-input"
                value={purgeDays}
                onChange={(e) => setPurgeDays(e.target.value)}
                disabled={saving}
                required
              />
              <span className="input-unit">Days</span>
            </div>
            <p className="field-explainer">
              Must exceed Grace Days. Certificate and verification files are kept permanently intact.
            </p>
          </div>
        </div>

        <div className="policy-footer">
          <div className="policy-meta">
            {updatedAt && (
              <span className="last-updated-text">
                Last updated: {new Date(updatedAt).toLocaleDateString()} at{" "}
                {new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn-save-policy"
            disabled={saving}
          >
            {saving ? (
              <span>Saving Policy...</span>
            ) : (
              <>
                <span>💾</span> Save Retention Policy
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
