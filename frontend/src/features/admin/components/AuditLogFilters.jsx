import React from 'react';

export const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'LOGIN', label: 'LOGIN — Successful Login' },
  { value: 'LOGIN_FAILED', label: 'LOGIN_FAILED — Failed Auth Attempt' },
  { value: 'LOGOUT', label: 'LOGOUT — User Logout' },
  { value: 'USER_CREATED', label: 'USER_CREATED — New Intern / TL Created' },
  { value: 'PASSWORD_RESET_REQUESTED', label: 'PASSWORD_RESET_REQUESTED — Forgot Password' },
  { value: 'PASSWORD_RESET_COMPLETED', label: 'PASSWORD_RESET_COMPLETED — Password Reset' },
  { value: 'PASSWORD_CHANGED', label: 'PASSWORD_CHANGED — Password Changed' },
  { value: 'PROFILE_UPDATED', label: 'PROFILE_UPDATED — Intern Profile Updated' },
  { value: 'REQUEST_SUBMITTED', label: 'REQUEST_SUBMITTED — Certificate Requested' },
  { value: 'REQUEST_FORWARDED', label: 'REQUEST_FORWARDED — TL Forwarded Request' },
  { value: 'REQUEST_REJECTED', label: 'REQUEST_REJECTED — Request Rejected' },
  { value: 'REQUEST_APPROVED', label: 'REQUEST_APPROVED — Request Approved' },
  { value: 'CERTIFICATE_DRAFT_CREATED', label: 'CERTIFICATE_DRAFT_CREATED — Draft Generated' },
  { value: 'CERTIFICATE_EDITED', label: 'CERTIFICATE_EDITED — Draft Updated' },
  { value: 'CERTIFICATE_FINALIZED', label: 'CERTIFICATE_FINALIZED — PDF Rendered & Sent' },
  { value: 'CERTIFICATE_REVOKED', label: 'CERTIFICATE_REVOKED — Certificate Revoked' },
  { value: 'TEMPLATE_CREATED', label: 'TEMPLATE_CREATED — Template Created' },
  { value: 'TEMPLATE_UPDATED', label: 'TEMPLATE_UPDATED — Template Updated' },
  { value: 'TEMPLATE_TOGGLED', label: 'TEMPLATE_TOGGLED — Template Status Toggled' },
  { value: 'RETENTION_POLICY_UPDATED', label: 'RETENTION_POLICY_UPDATED — Grace/Purge Days' },
  { value: 'INTERN_ARCHIVED', label: 'INTERN_ARCHIVED — Retention Auto-Archive' },
  { value: 'INTERN_PURGED', label: 'INTERN_PURGED — Retention Auto-Purge' },
  { value: 'INTERN_RESTORED', label: 'INTERN_RESTORED — Manual Intern Restore' },
  { value: 'EXPORT', label: 'EXPORT — CSV Download' }
];

export const ACTOR_OPTIONS = [
  { value: '', label: 'All Actors' },
  { value: 'admin', label: 'Admins' },
  { value: 'teamleader', label: 'Team Leaders' },
  { value: 'intern', label: 'Interns' },
  { value: 'system', label: 'System Automation' }
];

export const TARGET_TYPE_OPTIONS = [
  { value: '', label: 'All Targets' },
  { value: 'User', label: 'User' },
  { value: 'CertificateRequest', label: 'CertificateRequest' },
  { value: 'Certificate', label: 'Certificate' },
  { value: 'RetentionPolicy', label: 'RetentionPolicy' },
  { value: 'AuditLog', label: 'AuditLog' }
];

export default function AuditLogFilters({
  filters,
  onFilterChange,
  onFiltersChange,
  onReset,
  onExport,
  isExporting
}) {
  const handlePresetSelect = (preset) => {
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    if (preset === 'today') {
      const todayStr = formatDate(today);
      onFiltersChange({
        preset: 'today',
        from: `${todayStr}T00:00:00.000Z`,
        to: `${todayStr}T23:59:59.999Z`
      });
    } else if (preset === '7d') {
      const past = new Date(today);
      past.setDate(past.getDate() - 7);
      onFiltersChange({
        preset: '7d',
        from: past.toISOString(),
        to: today.toISOString()
      });
    } else if (preset === '30d') {
      const past = new Date(today);
      past.setDate(past.getDate() - 30);
      onFiltersChange({
        preset: '30d',
        from: past.toISOString(),
        to: today.toISOString()
      });
    } else if (preset === 'custom') {
      onFiltersChange({
        preset: 'custom'
      });
    } else {
      // all
      onFiltersChange({
        preset: 'all',
        from: '',
        to: ''
      });
    }
  };

  const activePreset = filters.preset || (filters.from || filters.to ? 'custom' : 'all');

  return (
    <div className="audit-filters-container">
      {/* Top Filter Controls Grid */}
      <div className="audit-filters-grid">
        {/* Action Dropdown */}
        <div className="audit-filter-item">
          <label htmlFor="audit-action-filter" className="audit-filter-label">
            Action
          </label>
          <select
            id="audit-action-filter"
            className="audit-filter-select"
            value={filters.action || ''}
            onChange={(e) => onFilterChange('action', e.target.value)}
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Actor Dropdown / Search */}
        <div className="audit-filter-item">
          <label htmlFor="audit-actor-filter" className="audit-filter-label">
            Actor Role / Search
          </label>
          <div className="audit-actor-input-group">
            <select
              id="audit-actor-filter"
              className="audit-filter-select"
              value={filters.actor || ''}
              onChange={(e) => onFilterChange('actor', e.target.value)}
            >
              {ACTOR_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Target Entity Type */}
        <div className="audit-filter-item">
          <label htmlFor="audit-target-filter" className="audit-filter-label">
            Target Type
          </label>
          <select
            id="audit-target-filter"
            className="audit-filter-select"
            value={filters.targetType || ''}
            onChange={(e) => onFilterChange('targetType', e.target.value)}
          >
            {TARGET_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Presets */}
        <div className="audit-filter-item">
          <label className="audit-filter-label">Date Range</label>
          <div className="audit-presets-pills">
            <button
              type="button"
              className={`audit-pill ${activePreset === 'all' ? 'active' : ''}`}
              onClick={() => handlePresetSelect('all')}
            >
              All Time
            </button>
            <button
              type="button"
              className={`audit-pill ${activePreset === 'today' ? 'active' : ''}`}
              onClick={() => handlePresetSelect('today')}
            >
              Today
            </button>
            <button
              type="button"
              className={`audit-pill ${activePreset === '7d' ? 'active' : ''}`}
              onClick={() => handlePresetSelect('7d')}
            >
              7 Days
            </button>
            <button
              type="button"
              className={`audit-pill ${activePreset === '30d' ? 'active' : ''}`}
              onClick={() => handlePresetSelect('30d')}
            >
              30 Days
            </button>
            <button
              type="button"
              className={`audit-pill ${activePreset === 'custom' ? 'active' : ''}`}
              onClick={() => handlePresetSelect('custom')}
            >
              Custom
            </button>
          </div>
        </div>
      </div>

      {/* Custom Date Pickers row (displayed when preset is custom) */}
      {activePreset === 'custom' && (
        <div className="audit-custom-dates-bar">
          <div className="audit-date-field">
            <span className="audit-date-label">From:</span>
            <input
              type="date"
              className="audit-date-input"
              value={filters.from ? filters.from.split('T')[0] : ''}
              onChange={(e) => onFilterChange('from', e.target.value ? `${e.target.value}T00:00:00.000Z` : '')}
            />
          </div>
          <div className="audit-date-field">
            <span className="audit-date-label">To:</span>
            <input
              type="date"
              className="audit-date-input"
              value={filters.to ? filters.to.split('T')[0] : ''}
              onChange={(e) => onFilterChange('to', e.target.value ? `${e.target.value}T23:59:59.999Z` : '')}
            />
          </div>
        </div>
      )}

      {/* Action Toolbar: Reset & Export CSV */}
      <div className="audit-toolbar">
        <div className="audit-active-filters-info">
          {(filters.action || filters.actor || filters.targetType || filters.from || filters.to) && (
            <button
              type="button"
              className="audit-btn-clear"
              onClick={onReset}
              title="Reset all active filters"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Clear Filters
            </button>
          )}
        </div>

        <button
          type="button"
          className="audit-btn-export"
          onClick={onExport}
          disabled={isExporting}
          id="audit-export-csv-button"
        >
          {isExporting ? (
            <>
              <span className="audit-spinner"></span>
              Exporting...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </>
          )}
        </button>
      </div>
    </div>
  );
}
