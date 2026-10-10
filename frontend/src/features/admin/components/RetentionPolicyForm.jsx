import { useEffect, useState } from 'react';
import { getRetentionPolicy, updateRetentionPolicy } from '../services/admin.service';
import Toast from '../../../shared/components/Toast';
import './RetentionPolicyForm.css';

export default function RetentionPolicyForm() {
  const [graceDays, setGraceDays] = useState(30);
  const [purgeDays, setPurgeDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Load current policy on component mount
  useEffect(() => {
    let isMounted = true;
    const fetchPolicy = async () => {
      setLoading(true);
      try {
        const data = await getRetentionPolicy();
        if (isMounted && data?.policy) {
          setGraceDays(data.policy.graceDays ?? 30);
          setPurgeDays(data.policy.purgeDays ?? 90);
          setLastUpdated(data.policy.updatedAt);
        }
      } catch (err) {
        if (isMounted) {
          showToast('error', err.message || 'Failed to load retention policy.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPolicy();
    return () => {
      isMounted = false;
    };
  }, []);

  const validate = () => {
    const newErrors = {};
    const grace = Number(graceDays);
    const purge = Number(purgeDays);

    if (!Number.isInteger(grace) || grace < 1) {
      newErrors.graceDays = 'Grace period must be an integer of at least 1 day.';
    }

    if (!Number.isInteger(purge) || purge < 1) {
      newErrors.purgeDays = 'Purge period must be an integer of at least 1 day.';
    }

    if (!newErrors.graceDays && !newErrors.purgeDays && purge <= grace) {
      newErrors.purgeDays = 'Purge period must be strictly greater than grace period.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setToast(null);
    try {
      const data = await updateRetentionPolicy({
        graceDays: Number(graceDays),
        purgeDays: Number(purgeDays)
      });

      if (data?.policy) {
        setGraceDays(data.policy.graceDays);
        setPurgeDays(data.policy.purgeDays);
        setLastUpdated(data.policy.updatedAt);
      }
      showToast('success', 'Retention policy updated successfully!');
      setErrors({});
    } catch (err) {
      showToast('error', err.message || 'Failed to update retention policy.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="retention-policy-card">
        <div className="retention-loading-skeleton">Loading retention policy settings…</div>
      </div>
    );
  }

  return (
    <div className="retention-policy-card">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="retention-policy-header">
        <h2>
          <span>⚙️</span> Data Retention & Lifecycle Policy
        </h2>
        <p>
          Configure the automated timeline for archiving completed intern accounts and anonymizing
          personal information. Exactly one active policy governs all scheduled jobs.
        </p>
      </div>

      <form className="retention-policy-form" onSubmit={handleSubmit} noValidate>
        {/* Grace Period Input */}
        <div className="retention-field-group">
          <label className="retention-field-label" htmlFor="grace-days-input">
            Grace Period
            <span className="retention-unit">Days after end date</span>
          </label>
          <p className="retention-field-desc">
            Days completed interns can still log in, request, and download certificates before their account is archived.
          </p>
          <div className="retention-input-wrap">
            <input
              id="grace-days-input"
              type="number"
              min="1"
              step="1"
              className={`retention-input ${errors.graceDays ? 'has-error' : ''}`}
              value={graceDays}
              onChange={(e) => {
                setGraceDays(e.target.value);
                if (errors.graceDays) setErrors((prev) => ({ ...prev, graceDays: null }));
              }}
              disabled={saving}
            />
            <span className="retention-unit">days</span>
          </div>
          {errors.graceDays && <span className="retention-field-error">{errors.graceDays}</span>}
        </div>

        {/* Purge Period Input */}
        <div className="retention-field-group">
          <label className="retention-field-label" htmlFor="purge-days-input">
            Purge / Anonymization Period
            <span className="retention-unit">Days after archival</span>
          </label>
          <p className="retention-field-desc">
            Days archived accounts are retained before personal information is permanently anonymized.
            Must exceed Grace Period.
          </p>
          <div className="retention-input-wrap">
            <input
              id="purge-days-input"
              type="number"
              min="1"
              step="1"
              className={`retention-input ${errors.purgeDays ? 'has-error' : ''}`}
              value={purgeDays}
              onChange={(e) => {
                setPurgeDays(e.target.value);
                if (errors.purgeDays) setErrors((prev) => ({ ...prev, purgeDays: null }));
              }}
              disabled={saving}
            />
            <span className="retention-unit">days</span>
          </div>
          {errors.purgeDays && <span className="retention-field-error">{errors.purgeDays}</span>}
        </div>

        {/* Policy Explanatory Note */}
        <div className="retention-policy-meta">
          <div>
            <strong>Archival timeline:</strong> Account is archived when <code>endDate + {graceDays || 30} days</code> has passed.
          </div>
          <div>
            <strong>Purge timeline:</strong> Personal data is anonymized when <code>archivedAt + {purgeDays || 90} days</code> has passed.
          </div>
          {lastUpdated && (
            <div style={{ marginTop: '4px', opacity: 0.8 }}>
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="retention-policy-actions">
          <button
            id="save-retention-policy-btn"
            type="submit"
            className="retention-save-btn"
            disabled={saving}
          >
            {saving ? 'Saving changes…' : 'Save Retention Policy'}
          </button>
        </div>
      </form>
    </div>
  );
}
