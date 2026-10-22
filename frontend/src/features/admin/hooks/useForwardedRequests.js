import { useCallback, useEffect, useState } from 'react';
import { finalizeRequest, getForwardedRequests, getAdminRequests } from '../services/admin.service';

const getErrorMessage = (error) => error.response?.data?.message || error.message || 'Unable to load requests.';

export default function useForwardedRequests(initialStatus = 'processing') {
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialStatus) {
      setStatusFilter(initialStatus);
    }
  }, [initialStatus]);

  const refetch = useCallback(async (targetStatus = statusFilter, page = 1) => {
    setLoading(true);
    try {
      if (targetStatus === 'processing' || targetStatus === 'forwarded') {
        const data = await getForwardedRequests();
        setRequests(data.requests || []);
        setPagination({ total: data.requests?.length || 0, page: 1, pages: 1 });
      } else {
        const data = await getAdminRequests({ status: targetStatus, page });
        setRequests(data.requests || []);
        if (data.pagination) setPagination(data.pagination);
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
      refetch(statusFilter);
      return response;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      throw new Error(getErrorMessage(requestError), { cause: requestError });
    }
  }, [refetch, statusFilter]);

  const approveRequest = useCallback((id) => actOnRequest(id, 'approve'), [actOnRequest]);
  const rejectRequest = useCallback((id, rejectionReason) => actOnRequest(id, 'reject', rejectionReason), [actOnRequest]);

  useEffect(() => {
    refetch(statusFilter);
  }, [statusFilter, refetch]);

  return {
    requests,
    pagination,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    refetch,
    approveRequest,
    rejectRequest
  };
}