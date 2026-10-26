import AnalyticsExportActions from './AnalyticsExportActions';

const stages = [
  ['tlDecisionTime', 'TL Decision Time'],
  ['adminDecisionTime', 'Admin Decision Time'],
  ['generationTime', 'Certificate Generation'],
  ['totalTurnaround', 'Total Turnaround']
];

const formatHours = (h) => {
  if (!h || h === 0) return '0h';
  if (h < 1) return `${(h * 60).toFixed(0)}m`;
  if (h < 24) return `${h}h`;
  return `${(h / 24).toFixed(1)}d`;
};

export default function AnalyticsTurnaround({ data, loading, error, onRetry, onExport }) {
  return (
    <section className="turnaround-card" aria-labelledby="turnaround-title">
      <div className="turnaround-heading">
        <div>
          <h2 id="turnaround-title">Certificate Turnaround</h2>
          <p>Average, median, and 90th percentile by workflow stage.</p>
        </div>
        <AnalyticsExportActions onExport={onExport} type="turnaround" />
      </div>
      {loading ? (
        <div className="turnaround-state">Calculating turnaround metrics…</div>
      ) : error ? (
        <div className="widget-error-box">
          <p>Failed to load turnaround metrics: {error}</p>
          <button className="retry-btn" onClick={onRetry}>Retry</button>
        </div>
      ) : (
        <div className="turnaround-grid">
          {stages.map(([key, title]) => {
            const stats = data?.[key] || { avg: 0, median: 0, p90: 0 };
            return (
              <article className="turnaround-stage" key={key}>
                <h3>{title}</h3>
                <dl>
                  <div>
                    <dt>Average</dt>
                    <dd>{formatHours(stats.avg)}</dd>
                  </div>
                  <div>
                    <dt>Median</dt>
                    <dd>{formatHours(stats.median)}</dd>
                  </div>
                  <div>
                    <dt>90th pct</dt>
                    <dd>{formatHours(stats.p90)}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
