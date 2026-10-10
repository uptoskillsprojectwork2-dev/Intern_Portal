import { useCallback, useEffect, useState } from 'react';
import { getArchivedInterns, restoreArchivedIntern } from '../services/admin.service';

const getErrorMessage = (error) => error.message || 'Unable to load archived interns.';

export default function useArchivedInterns() {
  const [archivedInterns, setArchivedInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restoringId, setRestoringId] = useState(null);

  const fetchArchivedInterns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getArchivedInterns();
      setArchivedInterns(data.interns || []);
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  const restoreIntern = useCallback(async (id) => {
    setRestoringId(id);
    try {
      const result = await restoreArchivedIntern(id);
      // Immediately remove restored intern from the list without waiting for full reload
      setArchivedInterns((prev) => prev.filter((item) => (item.id || item._id) !== id));
      return result;
    } finally {
      setRestoringId(null);
    }
  }, []);

  useEffect(() => {
    const initialFetch = setTimeout(fetchArchivedInterns, 0);
    return () => clearTimeout(initialFetch);
  }, [fetchArchivedInterns]);


  return {
    archivedInterns,
    loading,
    error,
    restoringId,
    fetchArchivedInterns,
    restoreIntern,
    retry: fetchArchivedInterns
  };
}
