import { useState } from 'react';
import { downloadAnalyticsExport } from '../services/analytics.service';

export default function AnalyticsExportButton({ filters, type = 'overview' }) {
  const [format, setFormat] = useState('xlsx');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      await downloadAnalyticsExport(type, filters, format);
    } catch (requestError) {
      setError(requestError.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="analytics-export-box">
      <select value={format} onChange={(event) => setFormat(event.target.value)}>
        <option value="xlsx">Excel (.xlsx)</option>
        <option value="csv">CSV</option>
      </select>
      <button type="button" className="analytics-primary-button" onClick={handleExport} disabled={exporting}>
        {exporting ? 'Exporting...' : 'Export'}
      </button>
      {error && <small>{error}</small>}
    </div>
  );
}
