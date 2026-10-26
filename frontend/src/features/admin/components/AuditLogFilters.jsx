export default function AuditLogFilters({ filters, onChange, onExport, exporting }) {
  return <form className="audit-filters" onSubmit={(event) => { event.preventDefault(); onChange({ ...filters, page: 1 }); }}>
    <label>Action<input value={filters.action || ''} onChange={(e) => onChange({ ...filters, action: e.target.value, page: 1 })} placeholder="e.g. LOGIN_SUCCESS" /></label>
    <label>Role<select value={filters.actorRole || ''} onChange={(e) => onChange({ ...filters, actorRole: e.target.value, page: 1 })}><option value="">All roles</option><option>admin</option><option>teamleader</option><option>intern</option><option>system</option></select></label>
    <label>Target<input value={filters.targetType || ''} onChange={(e) => onChange({ ...filters, targetType: e.target.value, page: 1 })} placeholder="User, Certificate…" /></label>
    <label>Actor ID<input value={filters.actorId || ''} onChange={(e) => onChange({ ...filters, actorId: e.target.value, page: 1 })} placeholder="24 character user ID" /></label>
    <label>From<input type="date" value={filters.from || ''} onChange={(e) => onChange({ ...filters, from: e.target.value, page: 1 })} /></label>
    <label>To<input type="date" value={filters.to || ''} onChange={(e) => onChange({ ...filters, to: e.target.value, page: 1 })} /></label>
    <button type="submit">Apply filters</button><button type="button" className="audit-secondary" disabled={exporting} onClick={onExport}>{exporting ? 'Preparing…' : 'Export CSV'}</button>
  </form>;
}
