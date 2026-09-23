import StatusBadge from '../../shared/components/StatusBadge';
import useMyInterns from '../hooks/useMyInterns';
import './MyInternsList.css';

const formatDate = (date) => date
  ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  : '—';

export default function MyInternsList() {
  const { interns, loading, error, refetch } = useMyInterns();

  return (
    <section className="my-interns-panel" aria-labelledby="my-interns-title">
      <div className="my-interns-heading">
        <div>
          <p className="request-eyebrow">TEAM DIRECTORY</p>
          <h2 id="my-interns-title">My Interns</h2>
          <p>Track the interns assigned to your team.</p>
        </div>
        {!loading && !error && <span className="my-interns-count">{interns.length} assigned</span>}
      </div>

      {loading && (
        <div className="my-interns-list" aria-label="Loading interns">
          {[1, 2, 3].map((item) => <div className="my-intern-skeleton" key={item} />)}
        </div>
      )}

      {!loading && error && (
        <div className="my-interns-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={refetch}>Retry</button>
        </div>
      )}

      {!loading && !error && !interns.length && (
        <p className="my-interns-state">No interns assigned to you yet</p>
      )}

      {!loading && !error && interns.length > 0 && (
        <div className="my-interns-list">
          {interns.map((intern) => (
            <article className="my-intern-row" key={intern._id || intern.id || intern.email}>
              <div className="my-intern-row-heading">
                <div>
                  <h3>{intern.fullName}</h3>
                  <p>{intern.email}</p>
                </div>
                <StatusBadge status={intern.internshipDetails?.status} />
              </div>
              <div className="my-intern-details">
                <div><span>Intern code</span><strong>{intern.internCode || '—'}</strong></div>
                <div><span>Domain</span><strong>{intern.domain || '—'}</strong></div>
                <div><span>Start date</span><strong>{formatDate(intern.startDate)}</strong></div>
                <div><span>End date</span><strong>{formatDate(intern.endDate)}</strong></div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
