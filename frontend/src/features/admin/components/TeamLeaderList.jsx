import useTeamLeaders from '../hooks/useTeamLeaders';
import './TeamLeadersSection.css';

export default function TeamLeaderList({ onSelect }) {
  const { teamLeaders, loading, error, refetch } = useTeamLeaders();

  return (
    <section className="team-leaders-panel" aria-labelledby="team-leaders-title">
      <div className="team-leaders-heading">
        <div>
          <p className="admin-eyebrow">PEOPLE DIRECTORY</p>
          <h2 id="team-leaders-title">Team Leaders</h2>
          <p>Select a team leader to view their assigned interns.</p>
        </div>
        {!loading && !error && <span className="team-leaders-count">{teamLeaders.length} total</span>}
      </div>

      {loading && (
        <div className="team-leader-list" aria-label="Loading team leaders">
          {[1, 2, 3].map((item) => <div className="team-leader-skeleton" key={item} />)}
        </div>
      )}

      {!loading && error && (
        <div className="team-leaders-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={refetch}>Retry</button>
        </div>
      )}

      {!loading && !error && !teamLeaders.length && (
        <p className="team-leaders-state">No team leaders found</p>
      )}

      {!loading && !error && teamLeaders.length > 0 && (
        <div className="team-leader-list">
          {teamLeaders.map((teamLeader) => {
            const id = teamLeader._id || teamLeader.id;
            return (
              <button className="team-leader-row" type="button" key={id} onClick={() => onSelect(id)}>
                <span className="team-leader-avatar">{teamLeader.fullName?.charAt(0)?.toUpperCase() || 'T'}</span>
                <span className="team-leader-details">
                  <strong>{teamLeader.fullName}</strong>
                  <small>{teamLeader.email}</small>
                </span>
                <span className="team-leader-arrow" aria-hidden="true">→</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
