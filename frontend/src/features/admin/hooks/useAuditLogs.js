
import { useCallback, useEffect, useRef, useState } from 'react';
import { getAuditLogs } from '../services/admin.service';

export default function useAuditLogs(filters) {
  const [data, setData] = useState({
    logs: [],
    pagination: { page: 1, limit: 25, total: 0, pages: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const inFlightRequest = useRef(null);

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 25;
  const action = filters.action ?? '';
  const actorRole = filters.actorRole ?? '';
  const targetType = filters.targetType ?? '';
  const actorId = filters.actorId ?? '';
  const from = filters.from ?? '';
  const to = filters.to ?? '';

  const loadLogs = useCallback(() => {
    const params = { page, limit, action, actorRole, targetType, actorId, from, to };
    const requestKey = JSON.stringify(params);
    if (inFlightRequest.current?.key === requestKey) return inFlightRequest.current.promise;

    const request = { key: requestKey, promise: getAuditLogs(params) };
    inFlightRequest.current = request;
    request.promise
      .then((result) => {
        if (inFlightRequest.current === request) {
          setData(result);
          setError('');
        }
      })
      .catch((err) => {
        if (inFlightRequest.current === request) setError(err.message || 'Could not load audit logs.');
      })
      .finally(() => {
        if (inFlightRequest.current === request) {
          inFlightRequest.current = null;
          setLoading(false);
        }
      });

    return request.promise;
  }, [page, limit, action, actorRole, targetType, actorId, from, to]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Keep the current rows mounted while refreshing to avoid the table flashing
  // back to the loading state on every manual refresh.
  return { ...data, loading, error, refresh: loadLogs };
}
