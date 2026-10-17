import React from 'react';
import useAuditLogs from '../hooks/useAuditLogs';
import AuditLogFilters from '../components/AuditLogFilters';
import AuditLogTable from '../components/AuditLogTable';
import './AuditLogs.css';

export default function AuditLogsPage() {
  const {
    logs,
    page,
    totalPages,
    total,
    loading,
    error,
    exporting,
    filters,
    setFilter,
    setFilters,
    changePage,
    resetFilters,
    refetch,
    handleExport
  } = useAuditLogs();

  return (
    <div className="audit-page-wrapper">
      <AuditLogFilters
        filters={filters}
        onFilterChange={setFilter}
        onFiltersChange={setFilters}
        onReset={resetFilters}
        onExport={handleExport}
        isExporting={exporting}
      />

      <AuditLogTable
        logs={logs}
        loading={loading}
        error={error}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={changePage}
        onRetry={refetch}
      />
    </div>
  );
}
