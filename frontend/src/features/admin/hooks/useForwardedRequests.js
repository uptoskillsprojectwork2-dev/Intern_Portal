import { useCallback, useEffect, useState } from 'react';
import { finalizeRequest, getForwardedRequests } from '../services/admin.service';

const getErrorMessage = (error) => error.response?.data?.message || error.message || 'Unable to load requests.';

export default function useForwardedRequests(initialStatus = 'forwarded') {
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({ forwarded: 0, pending: 0, all: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async (statusOverride) => {
    setLoading(true);
    const targetStatus = statusOverride !== undefined ? statusOverride : statusFilter;
    try {
      const data = await getForwardedRequests(targetStatus);
      setRequests(data.requests || []);
      if (data.counts) {
        setCounts(data.counts);
      }
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const actOnRequest = useCallback(async (id, action, rejectionReason) => {
    try {
      const response = await finalizeRequest(id, action, rejectionReason);
      setRequests((current) => current.filter((request) => (request._id || request.id) !== id));
      refetch();
      return response;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      throw new Error(getErrorMessage(requestError), { cause: requestError });
    }
  }, [refetch]);

  const approveRequest = useCallback((id) => actOnRequest(id, 'approve'), [actOnRequest]);
  const rejectRequest = useCallback((id, rejectionReason) => actOnRequest(id, 'reject', rejectionReason), [actOnRequest]);

  const changeStatusFilter = (newStatus) => {
    setStatusFilter(newStatus);
    refetch(newStatus);
  };

  useEffect(() => {
    refetch(statusFilter);
  }, [statusFilter, refetch]);

  return {
    requests,
    counts,
    statusFilter,
    setStatusFilter: changeStatusFilter,
    loading,
    error,
    refetch: () => refetch(statusFilter),
    approveRequest,
    rejectRequest,
  };
}