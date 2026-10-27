import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchAnalyticsRequests } from '../services/analytics.service';
import './AnalyticsView.css';

const formatDate = (value) => value
  ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  : '—';

export default function AnalyticsRequestsView({ onBack }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const queryKey = searchParams.toString();
  const loading = result?.key !== queryKey && error?.key !== queryKey;

  useEffect(() => {
    let active = true;
    const params = Object.fromEntries(searchParams.entries());
    params.limit = 25;
    fetchAnalyticsRequests(params)
      .then((response) => { if (active) { setResult({ key: queryKey, data: response.data }); setError(null); } })
      .catch((requestError) => { if (active) setError({ key: queryKey, message: requestError.message || 'Unable to load filtered requests.' }); });
    return () => { active = false; };
  }, [searchParams, queryKey, retry]);

  const updatePage = (nextPage) => setSearchParams((current) => {
    const next = new URLSearchParams(current);
    next.set('page', String(nextPage));
    return next;
  });

  const filters = [
    searchParams.get('status'),
    searchParams.get('reviewStage') === 'team-leader' ? 'Rejected by Team Leader' : null,
    searchParams.get('reviewStage') === 'admin' ? 'Rejected by Admin' : null,
    searchParams.get('certificateType'), searchParams.get('domain')
  ].filter(Boolean).join(' · ');

  const visibleResult = result?.key === queryKey ? result.data : null;
  const visibleError = error?.key === queryKey ? error.message : '';

  return (
    <section className="analytics-request-drilldown" aria-labelledby="analytics-requests-title">
      <div className="analytics-drilldown-heading">
        <div>
          <p className="analytics-eyebrow">ANALYTICS DRILL-DOWN</p>
          <h2 id="analytics-requests-title">Certificate requests</h2>
          <p>{filters || 'All requests matching the selected dashboard filters'}</p>
        </div>
        <button type="button" className="analytics-back-button" onClick={onBack}>Back to Analytics</button>
      </div>

      {loading ? <div className="analytics-drilldown-state" role="status">Loading requests…</div> : null}
      {!loading && visibleError ? (
        <div className="analytics-drilldown-state analytics-drilldown-error" role="alert">
          <p>{visibleError}</p><button type="button" onClick={() => setRetry((count) => count + 1)}>Retry</button>
        </div>
      ) : null}
      {!loading && !visibleError && visibleResult?.requests?.length === 0 ? (
        <div className="analytics-drilldown-state">No requests match these filters.</div>
      ) : null}
      {!loading && !visibleError && visibleResult?.requests?.length > 0 ? (
        <>
          <div className="table-wrapper analytics-drilldown-table-wrap">
            <table className="analytics-table">
              <thead><tr><th>Request</th><th>Intern</th><th>Domain</th><th>Certificate type</th><th>Status</th><th>Requested</th></tr></thead>
              <tbody>{visibleResult.requests.map((request) => (
                <tr key={request.id}>
                  <td><strong>{request.requestNumber}</strong></td>
                  <td>{request.intern?.fullName || 'Unknown intern'}</td>
                  <td>{request.intern?.domain || 'Unassigned'}</td>
                  <td>{request.certificateType?.replaceAll('_', ' ') || '—'}</td>
                  <td><span className={`status-tag ${request.status}`}>{request.status}</span></td>
                  <td>{formatDate(request.requestedAt)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="analytics-drilldown-pagination" aria-label="Request pages">
            <span>{visibleResult.total || 0} requests · Page {visibleResult.page || page} of {Math.max(1, visibleResult.pages || 1)}</span>
            <div>
              <button type="button" onClick={() => updatePage(page - 1)} disabled={page <= 1}>Previous</button>
              <button type="button" onClick={() => updatePage(page + 1)} disabled={page >= (visibleResult.pages || 1)}>Next</button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
