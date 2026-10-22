import AnalyticsExportActions from './AnalyticsExportActions';

const defaultStages = [
  ['tlDecisionTime', 'TL Decision Time', 'timeToTLReview'],
  ['adminDecisionTime', 'Admin Decision Time', 'timeToAdminFinalize'],
  ['generationTime', 'Generation Time', null],
  ['totalTurnaround', 'Total Turnaround', 'totalTurnaround']
];

export default function AnalyticsTurnaround({ data, loading, error, onRetry, onExport }) {
  return (
    <section className="turnaround-card" aria-labelledby="turnaround-title">
      <div className="turnaround-heading">
        <div>
          <h2 id="turnaround-title">Certificate Turnaround Speed</h2>
          <p>Average, median, and 90th percentile by workflow stage (hours).</p>
        </div>
        <AnalyticsExportActions onExport={onExport} type="turnaround" formats={['xlsx', 'csv']} />
      </div>

      {loading ? (
        <div className="turnaround-state">Calculating turnaround metrics…</div>
      ) : error ? (
        <div className="widget-error-box">
          <p><i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 6 }}></i>Failed to load turnaround metrics: {error}</p>
          <button className="retry-btn" onClick={onRetry}>Retry</button>
        </div>
      ) : (
        <div className="turnaround-grid">
          {defaultStages.map(([key, title, fallbackKey]) => {
            const stats = data?.[key] || (fallbackKey ? data?.[fallbackKey] : null) || { avg: 0, median: 0, p90: 0 };
            return (
              <article className="turnaround-stage" key={key}>
                <h3>{title}</h3>
                <dl>
                  <div>
                    <dt>Average</dt>
                    <dd>{stats.avg}h</dd>
                  </div>
                  <div>
                    <dt>Median</dt>
                    <dd>{stats.median}h</dd>
                  </div>
                  <div>
                    <dt>90th %ile</dt>
                    <dd>{stats.p90}h</dd>
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
