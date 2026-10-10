import { useState, useEffect } from 'react';
import { getRetentionPolicy, updateRetentionPolicy } from '../services/admin.service';
import './AdminDashboardRetention.css';

export default function RetentionPolicyForm() {
  const [graceDays, setGraceDays] = useState(30);
  const [purgeDays, setPurgeDays] = useState(90);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const data = await getRetentionPolicy();
        if (data.policy) {
          setGraceDays(data.policy.graceDays);
          setPurgeDays(data.policy.purgeDays);
        }
      } catch (err) {
        setError(err.message || 'Failed to load policy');
      } finally {
        setFetching(false);
      }
    };
    fetchPolicy();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (purgeDays <= graceDays) {
      setError('Purge days must be greater than grace days.');
      return;
    }
    
    setLoading(true);
    try {
      await updateRetentionPolicy({ graceDays: Number(graceDays), purgeDays: Number(purgeDays) });
      setSuccess('Policy updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update policy');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div style={{ color: '#6b7280' }}>Loading policy...</div>;

  return (
    <div className="admin-retention-container">
      <h3 className="admin-retention-title">Intern Account Retention Policy</h3>
      
      {error && (
        <div className="admin-retention-error">
          {error}
        </div>
      )}
      
      {success && (
        <div className="admin-retention-success">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="admin-retention-form">
        <div className="admin-retention-field">
          <label>Grace Days</label>
          <div className="admin-retention-desc">
            Number of days after internship end date before the account is archived.
          </div>
          <input
            type="number"
            min="1"
            value={graceDays}
            onChange={(e) => setGraceDays(e.target.value)}
            required
          />
        </div>

        <div className="admin-retention-field">
          <label>Purge Days</label>
          <div className="admin-retention-desc">
            Number of days after archival before personal data is permanently deleted. Must be greater than grace days.
          </div>
          <input
            type="number"
            min={graceDays + 1}
            value={purgeDays}
            onChange={(e) => setPurgeDays(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="admin-retention-submit"
        >
          {loading ? 'Saving...' : 'Save Policy'}
        </button>
      </form>
    </div>
  );
}
