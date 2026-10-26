import { useState, useEffect } from 'react';

const ACTION_OPTIONS = [
  'LOGIN',
  'LOGIN_FAILED',
  'LOGOUT',
  'USER_CREATED',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_COMPLETED',
  'REQUEST_SUBMITTED',
  'REQUEST_FORWARDED',
  'REQUEST_REJECTED',
  'REQUEST_APPROVED',
  'CERTIFICATE_DRAFT_CREATED',
  'CERTIFICATE_EDITED',
  'CERTIFICATE_FINALIZED',
  'CERTIFICATE_REVOKED',
  'TEMPLATE_CREATED',
  'TEMPLATE_UPDATED',
  'TEMPLATE_TOGGLED',
  'RETENTION_POLICY_UPDATED',
  'INTERN_ARCHIVED',
  'INTERN_PURGED',
  'INTERN_RESTORED',
  'EXPORT',
  'PASSWORD_CHANGED',
  'PROFILE_UPDATED',
];

const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Custom', value: 'custom' },
];

function getDateRange(preset) {
  const now = new Date();
  const to = now.toISOString().split('T')[0];

  switch (preset) {
    case 'today':
      return { from: to, to };
    case '7d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return { from: d.toISOString().split('T')[0], to };
    }
    case '30d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return { from: d.toISOString().split('T')[0], to };
    }
    default:
      return { from: '', to: '' };
  }
}

export default function AuditLogFilters({ filters, onFilterChange }) {
  const [actor, setActor] = useState(filters.actor || '');
  const [action, setAction] = useState(filters.action || '');
  const [targetType, setTargetType] = useState(filters.targetType || '');
  const [datePreset, setDatePreset] = useState('');
  const [from, setFrom] = useState(filters.from || '');
  const [to, setTo] = useState(filters.to || '');

  useEffect(() => {
    setActor(filters.actor || '');
    setAction(filters.action || '');
    setTargetType(filters.targetType || '');
    setFrom(filters.from || '');
    setTo(filters.to || '');
  }, [filters]);

  const handlePreset = (preset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const range = getDateRange(preset);
      setFrom(range.from);
      setTo(range.to);
      onFilterChange({ actor, action, targetType, from: range.from, to: range.to });
    }
  };

  const handleApply = () => {
    onFilterChange({ actor, action, targetType, from, to });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  const handleClear = () => {
    setActor('');
    setAction('');
    setTargetType('');
    setFrom('');
    setTo('');
    setDatePreset('');
    onFilterChange({ actor: '', action: '', targetType: '', from: '', to: '' });
  };

  return (
    <div className="audit-filters">
      <div className="audit-filters-row">

        <div className="audit-filter-group">
          <label htmlFor="audit-filter-actor">Actor ID</label>
          <input
            id="audit-filter-actor"
            type="text"
            placeholder="Actor ID..."
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="audit-filter-group">
          <label htmlFor="audit-filter-action">Action</label>
          <select
            id="audit-filter-action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="">All actions</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div className="audit-filter-group">
          <label htmlFor="audit-filter-target">Target Type</label>
          <input
            id="audit-filter-target"
            type="text"
            placeholder="e.g. User"
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>

      <div className="audit-filters-row">
        <div className="audit-filter-group audit-date-presets">
          <label>Date Range</label>
          <div className="preset-buttons">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`preset-btn ${datePreset === p.value ? 'active' : ''}`}
                onClick={() => handlePreset(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {(datePreset === 'custom' || from || to) && (
          <>
            <div className="audit-filter-group">
              <label htmlFor="audit-filter-from">From</label>
              <input
                id="audit-filter-from"
                type="date"
                value={from}
                onChange={(e) => { setFrom(e.target.value); setDatePreset('custom'); }}
              />
            </div>

            <div className="audit-filter-group">
              <label htmlFor="audit-filter-to">To</label>
              <input
                id="audit-filter-to"
                type="date"
                value={to}
                onChange={(e) => { setTo(e.target.value); setDatePreset('custom'); }}
              />
            </div>
          </>
        )}
      </div>

      <div className="audit-filters-actions">
        <button type="button" className="audit-btn primary-btn" onClick={handleApply}>
          Apply Filters
        </button>
        <button type="button" className="audit-btn clear-btn" onClick={handleClear}>
          Clear
        </button>
      </div>
    </div>
  );
}
