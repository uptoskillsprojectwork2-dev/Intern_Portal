import { useState, useEffect, useCallback } from 'react';
import { getArchivedInterns, restoreArchivedIntern } from '../services/admin.service';

export default function useArchivedInterns() {
  const [archivedInterns, setArchivedInterns] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restoringId, setRestoringId] = useState(null);

  const fetchArchived = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getArchivedInterns();
      setArchivedInterns(data.archivedInterns || []);
      setPolicy(data.policy || null);
    } catch (err) {
      setError(err.message || 'Failed to load archived interns.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArchived();
  }, [fetchArchived]);

  const restore = async (id) => {
    setRestoringId(id);
    try {
      const res = await restoreArchivedIntern(id);
      await fetchArchived();
      return { success: true, message: res.message || 'Intern restored successfully.' };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to restore intern.' };
    } finally {
      setRestoringId(null);
    }
  };

  return {
    archivedInterns,
    policy,
    loading,
    error,
    restoringId,
    refresh: fetchArchived,
    restore
  };
}
