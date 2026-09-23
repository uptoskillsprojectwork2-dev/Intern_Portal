import { useCallback, useEffect, useState } from 'react';
import { getMyInterns } from '../services/tl.service';

const getErrorMessage = (error) => error.response?.data?.message || error.message || 'Unable to load your interns.';

export default function useMyInterns() {
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyInterns();
      setInterns(data.interns || []);
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialFetch = setTimeout(refetch, 0);
    return () => clearTimeout(initialFetch);
  }, [refetch]);

  return { interns, loading, error, refetch };
}
