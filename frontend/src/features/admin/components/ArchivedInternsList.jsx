import { useState, useEffect } from 'react';
import { useArchivedInterns } from '../hooks/useArchivedInterns';
import { getRetentionPolicy } from '../services/admin.service';
import './AdminDashboardRetention.css';

export default function ArchivedInternsList() {
  const { interns, loading, error, refetch, restoreIntern } = useArchivedInterns();
  const [purgeDays, setPurgeDays] = useState(90);
  const [restoreState, setRestoreState] = useState({ id: null, loading: false, error: null });

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const data = await getRetentionPolicy();
        if (data.policy) {
          setPurgeDays(data.policy.purgeDays);
        }
      } catch (err) {
        console.error('Failed to load retention policy', err);
      }
    };
    fetchPolicy();
  }, []);

  const handleRestore = async (id) => {
    if (!window.confirm('Are you sure you want to restore this intern? They will regain access to their account.')) {
      return;
    }

    setRestoreState({ id, loading: true, error: null });
    const result = await restoreIntern(id);
    
    if (result.success) {
      alert('Intern restored successfully');
      setRestoreState({ id: null, loading: false, error: null });
    } else {
      setRestoreState({ id, loading: false, error: result.error });
      alert(`Failed to restore intern: ${result.error}`);
    }
  };

  const calculateDaysLeft = (archivedAt) => {
    if (!archivedAt) return purgeDays;
    const archivedDate = new Date(archivedAt);
    archivedDate.setHours(0, 0, 0, 0);
    
    const purgeDate = new Date(archivedDate);
    purgeDate.setDate(purgeDate.getDate() + purgeDays);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = purgeDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (loading) {
    return <div style={{ color: '#6b7280', padding: '16px 0' }}>Loading archived interns...</div>;
  }

  if (error) {
    return (
      <div className="admin-retention-error">
        <p>{error}</p>
        <button onClick={refetch} style={{ background: 'none', border: 'none', textDecoration: 'underline', color: 'inherit', cursor: 'pointer', padding: 0, marginTop: '8px' }}>Try again</button>
      </div>
    );
  }

  if (interns.length === 0) {
    return (
      <div className="admin-archived-empty">
        <p>No archived interns</p>
      </div>
    );
  }

  return (
    <div className="admin-archived-container">
      <table className="admin-archived-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Intern Code</th>
            <th>Domain</th>
            <th>Archived Date</th>
            <th>Days to Purge</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {interns.map((intern) => {
            const daysLeft = calculateDaysLeft(intern.archivedAt);
            const isDanger = daysLeft <= 7;
            
            return (
              <tr key={intern._id}>
                <td className="fw-medium">{intern.fullName}</td>
                <td>{intern.internCode}</td>
                <td>{intern.domain}</td>
                <td>{intern.archivedAt ? new Date(intern.archivedAt).toLocaleDateString() : 'N/A'}</td>
                <td>
                  <span className={`admin-archived-badge ${isDanger ? 'danger' : 'warning'}`}>
                    {daysLeft} days
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => handleRestore(intern._id)}
                    disabled={restoreState.id === intern._id && restoreState.loading}
                    className="admin-archived-btn"
                  >
                    {restoreState.id === intern._id && restoreState.loading ? 'Restoring...' : 'Restore'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
