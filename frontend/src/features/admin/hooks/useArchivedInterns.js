import { useCallback, useEffect, useState } from 'react';
import { getArchivedInterns, restoreIntern, restoreArchivedIntern } from '../services/admin.service';

export function useArchivedInterns() {
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getArchivedInterns();
      setInterns(result.interns || []);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load archived interns.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const restore = async (internOrId) => {
    const id = typeof internOrId === 'object' && internOrId !== null ? internOrId._id : internOrId;
    const restoreFn = restoreIntern || restoreArchivedIntern;
    await restoreFn(id);
    setInterns((current) => current.filter((item) => item._id !== id));
    if (typeof internOrId === 'object' && internOrId?.fullName) {
      return `${internOrId.fullName} has been restored.`;
    }
    return { success: true };
  };

  return {
    interns,
    loading,
    error,
    refresh,
    refetch: refresh,
    restore,
    restoreIntern: restore
  };
}

export default useArchivedInterns;
