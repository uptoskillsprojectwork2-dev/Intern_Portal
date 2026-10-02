const presetOptions = [
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '6m', value: '6m' },
];

export default function AnalyticsFilters({ filters, onChange, onRefresh }) {
  const updateFilter = (key, value) => {
    onChange((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="analytics-toolbar">
      <div className="analytics-range-group">
        {presetOptions.map((preset) => (
          <button
            key={preset.value}
            type="button"
            className={`analytics-range-button ${filters.range === preset.value ? 'selected' : ''}`}
            onClick={() => updateFilter('range', preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="analytics-filter-grid">
        <label className="analytics-field">
          <span>From</span>
          <input type="date" value={filters.from || ''} onChange={(event) => updateFilter('from', event.target.value)} />
        </label>
        <label className="analytics-field">
          <span>To</span>
          <input type="date" value={filters.to || ''} onChange={(event) => updateFilter('to', event.target.value)} />
        </label>
        <label className="analytics-field">
          <span>Domain</span>
          <input type="text" value={filters.domain || ''} placeholder="AI/ML" onChange={(event) => updateFilter('domain', event.target.value)} />
        </label>
        <label className="analytics-field">
          <span>Team leader</span>
          <input type="text" value={filters.teamLeader || ''} placeholder="Email or name" onChange={(event) => updateFilter('teamLeader', event.target.value)} />
        </label>
      </div>

      <div className="analytics-toolbar-actions">
        <button type="button" className="analytics-primary-button" onClick={onRefresh}>Refresh</button>
      </div>
    </div>
  );
}
