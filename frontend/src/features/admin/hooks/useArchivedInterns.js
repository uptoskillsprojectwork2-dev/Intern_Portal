import { useState, useEffect, useCallback } from 'react';
import { getArchivedInterns, restoreArchivedIntern } from '../services/admin.service';

export function useArchivedInterns() {
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInterns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getArchivedInterns();
      setInterns(data.interns || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch archived interns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInterns();
  }, [fetchInterns]);

  const restoreIntern = async (id) => {
    try {
      await restoreArchivedIntern(id);
      setInterns((prev) => prev.filter((intern) => intern._id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return {
    interns,
    loading,
    error,
    refetch: fetchInterns,
    restoreIntern
  };
}
