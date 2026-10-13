import './ChartWidget.css';

export default function ChartWidget({ title, subtitle, loading, error, onRetry, children, className, action }) {
    return (
        <section className={`chart-widget ${className || ''}`} aria-labelledby={`chart-${title?.replace(/\s+/g, '-')}`}>
            <div className="chart-widget-header">
                <div>
                    <p className="admin-eyebrow">ANALYTICS</p>
                    <h3 id={`chart-${title?.replace(/\s+/g, '-')}`}>{title}</h3>
                    {subtitle && <p className="chart-widget-subtitle">{subtitle}</p>}
                </div>
                {action}
            </div>

            {loading && (
                <div className="chart-widget-skeleton" role="status" aria-label={`Loading ${title}`}>
                    <div className="chart-widget-skeleton-line"></div>
                    <div className="chart-widget-skeleton-line short"></div>
                </div>
            )}

            {!loading && error && (
                <div className="chart-widget-error" role="alert">
                    <span>{error}</span>
                    <button type="button" onClick={onRetry}>Retry</button>
                </div>
            )}

            {!loading && !error && children}
        </section>
    );
}
