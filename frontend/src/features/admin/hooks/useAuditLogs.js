import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAuditLogs } from '../services/admin.service.js';

/**
 * Hook for fetching audit logs with URL-synced filters and pagination.
 */
export function useAuditLogs() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(parseInt(searchParams.get('page'), 10) || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Read filters from URL
  const filters = {
    actor: searchParams.get('actor') || '',
    action: searchParams.get('action') || '',
    targetType: searchParams.get('targetType') || '',
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
  };

  const setFilters = useCallback((newFilters) => {
    const params = new URLSearchParams();

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    // Reset to page 1 on filter change
    params.set('page', '1');
    setPage(1);
    setSearchParams(params);
  }, [setSearchParams]);

  const goToPage = useCallback((newPage) => {
    setPage(newPage);
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const currentPage = parseInt(searchParams.get('page'), 10) || 1;
      const params = {
        page: String(currentPage),
        limit: '25',
        sort: '-createdAt',
      };

      if (filters.actor) params.actor = filters.actor;
      if (filters.action) params.action = filters.action;
      if (filters.targetType) params.targetType = filters.targetType;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const data = await getAuditLogs(params);

      setLogs(data.logs || []);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load audit logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [searchParams, filters.actor, filters.action, filters.targetType, filters.from, filters.to]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    page,
    totalPages,
    total,
    loading,
    error,
    filters,
    setFilters,
    goToPage,
    retry: fetchLogs,
  };
}
