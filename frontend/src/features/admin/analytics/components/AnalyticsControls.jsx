import { useState } from 'react';
import { DATE_RANGE_PRESETS, GROUP_BY_OPTIONS } from '../constants/analyticsConstants.js';
import './AnalyticsControls.css';

export default function AnalyticsControls({ params, onChange, onExport, onRefresh, lastUpdated, loading }) {
    const [customFrom, setCustomFrom] = useState(params.from || '');
    const [customTo, setCustomTo] = useState(params.to || '');

    const handlePresetChange = (e) => {
        const value = e.target.value;
        onChange({ range: value, from: undefined, to: undefined });
    };

    const handleGroupByChange = (e) => {
        onChange({ ...params, groupBy: e.target.value });
    };

    const applyCustomRange = () => {
        if (customFrom && customTo) {
            onChange({ ...params, range: undefined, from: customFrom, to: customTo });
        }
    };

    const clearCustomRange = () => {
        setCustomFrom('');
        setCustomTo('');
        onChange({ ...params, range: '30d', from: undefined, to: undefined });
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const getDateLabel = () => {
        if (params.from && params.to) {
            return `${formatDate(params.from)} — ${formatDate(params.to)}`;
        }
        const preset = DATE_RANGE_PRESETS.find((p) => p.value === params.range);
        return preset ? preset.label : '30 Days';
    };

    return (
        <div className="analytics-controls">
            <div className="controls-row">
                <div className="control-group">
                    <label>Date Range</label>
                    <select value={params.range || '30d'} onChange={handlePresetChange}>
                        {DATE_RANGE_PRESETS.map((preset) => (
                            <option key={preset.value} value={preset.value}>{preset.label}</option>
                        ))}
                        <option value="custom">Custom Range</option>
                    </select>
                    {params.range === 'custom' && (
                        <div className="custom-range">
                            <input
                                type="date"
                                value={customFrom}
                                onChange={(e) => setCustomFrom(e.target.value)}
                                placeholder="From"
                            />
                            <span>—</span>
                            <input
                                type="date"
                                value={customTo}
                                onChange={(e) => setCustomTo(e.target.value)}
                                placeholder="To"
                            />
                            <button onClick={applyCustomRange} disabled={!customFrom || !customTo}>Apply</button>
                            {(customFrom || customTo) && <button onClick={clearCustomRange}>Clear</button>}
                        </div>
                    )}
                    <span className="date-label">{getDateLabel()}</span>
                </div>

                <div className="control-group">
                    <label>Group By</label>
                    <select value={params.groupBy || 'month'} onChange={handleGroupByChange}>
                        {GROUP_BY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <div className="control-group">
                    <label>Export</label>
                    <select onChange={(e) => onExport(e.target.value)} defaultValue="">
                        <option value="" disabled>Choose format</option>
                        <option value="overview">Overview</option>
                        <option value="requests-trend">Requests Trend</option>
                        <option value="certificate-types">Certificate Types</option>
                        <option value="turnaround">Turnaround Time</option>
                        <option value="team-leaders">Team Leaders</option>
                        <option value="domains">Domains</option>
                        <option value="pipeline">Pipeline</option>
                    </select>
                </div>

                <button className="refresh-btn" onClick={onRefresh} disabled={loading}>
                    {loading ? '⟳ Refreshing…' : '⟳ Refresh'}
                </button>
            </div>

            <div className="last-updated">
                Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
            </div>
        </div>
    );
}
