import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { exportAuditLogs } from '../services/admin.service';
import useAuditLogs from '../hooks/useAuditLogs';
import AuditLogFilters from '../components/AuditLogFilters';
import AuditLogTable from '../components/AuditLogTable';
import './AuditLogsPage.css';

export default function AuditLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const { logs, pagination, loading, error, refresh } = useAuditLogs({ page: filters.page || 1, limit: 25, action: filters.action, actorRole: filters.actorRole, targetType: filters.targetType, actorId: filters.actorId, from: filters.from, to: filters.to });
  const changeFilters = useCallback((next) => { const clean = Object.fromEntries(Object.entries(next).filter(([, value]) => value !== '' && value != null)); setSearchParams(clean); }, [setSearchParams]);
  useEffect(() => { if (pagination.pages && Number(filters.page || 1) > pagination.pages) changeFilters({ ...filters, page: pagination.pages }); }, [pagination.pages, filters, changeFilters]);
  const exportCsv = async () => {
    setExporting(true); setExportError('');
    try { const blob = await exportAuditLogs(filters); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'audit-logs.csv'; link.click(); URL.revokeObjectURL(url); }
    catch (err) { setExportError(err.message || 'Export failed.'); }
    finally { setExporting(false); }
  };
  return <section className="audit-page"><header><div><p className="admin-eyebrow">SECURITY & COMPLIANCE</p><h2>Audit logs</h2><p>Review administrative activity and security events.</p></div><button type="button" onClick={refresh}>Refresh</button></header>
    <AuditLogFilters filters={filters} onChange={changeFilters} onExport={exportCsv} exporting={exporting} />
    {exportError && <p className="audit-error" role="alert">{exportError}</p>}
    {loading ? <div className="audit-state" role="status">Loading audit events…</div> : error ? <div className="audit-state audit-error" role="alert">{error} <button onClick={refresh}>Retry</button></div> : logs.length ? <><AuditLogTable logs={logs} /><footer className="audit-pagination"><span>{pagination.total.toLocaleString()} events · Page {pagination.page} of {Math.max(pagination.pages, 1)}</span><div><button disabled={pagination.page <= 1} onClick={() => changeFilters({ ...filters, page: pagination.page - 1 })}>Previous</button><button disabled={pagination.page >= pagination.pages} onClick={() => changeFilters({ ...filters, page: pagination.page + 1 })}>Next</button></div></footer></> : <div className="audit-state">No audit events match these filters.</div>}
  </section>;
}
