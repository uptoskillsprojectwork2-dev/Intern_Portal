import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAuditLogs, exportAuditLogs } from '../services/admin.service';

export function useAuditLogs() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read current filters from URL search params
  const initialFilters = useMemo(() => {
    return {
      actor: searchParams.get('actor') || '',
      action: searchParams.get('action') || '',
      targetType: searchParams.get('targetType') || '',
      from: searchParams.get('from') || '',
      to: searchParams.get('to') || '',
      preset: searchParams.get('preset') || 'all',
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
      sort: searchParams.get('sort') || 'desc'
    };
  }, [searchParams]);

  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(initialFilters.page || 1);
  const [limit, setLimit] = useState(initialFilters.limit || 20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Sync query params to URL
  const updateUrlParams = useCallback((newFilters) => {
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '' && val !== 'all') {
        params.set(key, String(val));
      }
    });
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = {
        page: initialFilters.page || 1,
        limit: initialFilters.limit || 20,
        sort: initialFilters.sort || 'desc'
      };

      if (initialFilters.actor) queryParams.actor = initialFilters.actor;
      if (initialFilters.action) queryParams.action = initialFilters.action;
      if (initialFilters.targetType) queryParams.targetType = initialFilters.targetType;
      if (initialFilters.from) queryParams.from = initialFilters.from;
      if (initialFilters.to) queryParams.to = initialFilters.to;

      const data = await getAuditLogs(queryParams);
      setLogs(data.logs || []);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [initialFilters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const setFilter = useCallback((key, value) => {
    const updated = {
      ...initialFilters,
      [key]: value,
      page: 1 // Reset to page 1 on filter modification
    };
    updateUrlParams(updated);
  }, [initialFilters, updateUrlParams]);

  const setFilters = useCallback((newFields) => {
    const updated = {
      ...initialFilters,
      ...newFields,
      page: 1
    };
    updateUrlParams(updated);
  }, [initialFilters, updateUrlParams]);

  const changePage = useCallback((newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    const updated = {
      ...initialFilters,
      page: newPage
    };
    updateUrlParams(updated);
  }, [initialFilters, totalPages, updateUrlParams]);

  const resetFilters = useCallback(() => {
    updateUrlParams({
      page: 1,
      limit: 20,
      sort: 'desc'
    });
  }, [updateUrlParams]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const exportParams = {};
      if (initialFilters.actor) exportParams.actor = initialFilters.actor;
      if (initialFilters.action) exportParams.action = initialFilters.action;
      if (initialFilters.targetType) exportParams.targetType = initialFilters.targetType;
      if (initialFilters.from) exportParams.from = initialFilters.from;
      if (initialFilters.to) exportParams.to = initialFilters.to;
      if (initialFilters.sort) exportParams.sort = initialFilters.sort;

      await exportAuditLogs(exportParams);
      // Re-fetch so the EXPORT audit event itself becomes visible
      await fetchLogs();
    } catch (err) {
      console.error('Export failed:', err);
      setError(err.message || 'Failed to export audit logs');
    } finally {
      setExporting(false);
    }
  }, [initialFilters, fetchLogs]);

  return {
    logs,
    page,
    limit,
    totalPages,
    total,
    loading,
    error,
    exporting,
    filters: initialFilters,
    setFilter,
    setFilters,
    changePage,
    resetFilters,
    refetch: fetchLogs,
    handleExport
  };
}

export default useAuditLogs;
