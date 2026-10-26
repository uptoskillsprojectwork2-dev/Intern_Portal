import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnalyticsExportActions from './AnalyticsExportActions';

export default function AnalyticsTables({
  teamLeadersData,
  stuckData,
  upcomingData,
  loadingMap,
  errorMap,
  onRetry,
  onExport,
  onOpenRequests
}) {
  const navigate = useNavigate();
  const [tlSortKey, setTlSortKey] = useState('pendingReviews');
  const [tlSortAsc, setTlSortAsc] = useState(false);

  const handleSort = (key) => {
    if (tlSortKey === key) {
      setTlSortAsc(!tlSortAsc);
    } else {
      setTlSortKey(key);
      setTlSortAsc(false);
    }
  };

  const sortedTeamLeaders = [...(teamLeadersData || [])].sort((a, b) => {
    let valA = a[tlSortKey];
    let valB = b[tlSortKey];
    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }
    if (valA < valB) return tlSortAsc ? -1 : 1;
    if (valA > valB) return tlSortAsc ? 1 : -1;
    return 0;
  });

  const sortIcon = (key) => (tlSortKey === key ? (tlSortAsc ? ' ▲' : ' ▼') : '');

  // Handle both old array shape and new { interns, summary } shape
  const upcomingInterns = Array.isArray(upcomingData) ? upcomingData : upcomingData?.interns || [];
  const upcomingSummary = upcomingData?.summary || null;

  return (
    <div className="analytics-tables-container">
      {/* 1. Team Leader Performance Table */}
      <div className="table-card">
        <div className="table-card-header">
          <div>
            <h3>Team Leader Performance Matrix</h3>
            <p className="table-subtitle">Review speeds, pending counts, and overdue flags per Team Leader</p>
          </div>
          <AnalyticsExportActions onExport={onExport} type="team-leaders" />
        </div>

        {loadingMap.teamLeaders ? (
          <div className="chart-skeleton" style={{ height: 120 }}>Loading performance matrix...</div>
        ) : errorMap.teamLeaders ? (
          <div className="widget-error-box">
            <p>⚠️ Error: {errorMap.teamLeaders}</p>
            <button className="retry-btn" onClick={() => onRetry('teamLeaders')}>Retry</button>
          </div>
        ) : sortedTeamLeaders.length === 0 ? (
          <div className="empty-state">No Team Leaders registered yet</div>
        ) : (
          <div className="table-wrapper">
            <table className="analytics-table" id="tl-performance-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('fullName')}>
                    Team Leader{sortIcon('fullName')}
                  </th>
                  <th onClick={() => handleSort('internsAssigned')}>
                    Interns{sortIcon('internsAssigned')}
                  </th>
                  <th onClick={() => handleSort('requestsReceived')}>
                    Received{sortIcon('requestsReceived')}
                  </th>
                  <th onClick={() => handleSort('forwarded')}>
                    Forwarded{sortIcon('forwarded')}
                  </th>
                  <th onClick={() => handleSort('rejected')}>
                    Rejected{sortIcon('rejected')}
                  </th>
                  <th onClick={() => handleSort('pendingReviews')}>
                    Pending{sortIcon('pendingReviews')}
                  </th>
                  <th onClick={() => handleSort('avgReviewTimeHours')}>
                    Avg Review Time{sortIcon('avgReviewTimeHours')}
                  </th>
                  <th onClick={() => handleSort('rejectionRate')}>
                    Rejection Rate{sortIcon('rejectionRate')}
                  </th>
                  <th>Overdue Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedTeamLeaders.map((tl) => (
                  <tr key={tl.id} className={tl.hasOverdueRequests ? 'row-overdue-highlight' : ''}>
                    <td>
                      <div className="tl-name-cell">
                        <strong>{tl.fullName}</strong>
                        <small>{tl.email}</small>
                      </div>
                    </td>
                    <td><span className="pill blue">{tl.internsAssigned}</span></td>
                    <td><span className="pill gray">{tl.requestsReceived ?? tl.requestsReviewed ?? 0}</span></td>
                    <td><span className="pill green">{tl.forwarded ?? 0}</span></td>
                    <td><span className={`pill ${tl.rejected > 0 ? 'amber' : 'gray'}`}>{tl.rejected ?? 0}</span></td>
                    <td>
                      <span className={`pill ${tl.pendingReviews > 0 ? 'amber' : 'gray'}`}>
                        {tl.pendingReviews}
                      </span>
                    </td>
                    <td>{tl.avgReviewTimeHours > 0 ? `${tl.avgReviewTimeHours} hrs` : 'N/A'}</td>
                    <td>{tl.rejectionRate}%</td>
                    <td>
                      {tl.hasOverdueRequests ? (
                        <span className="status-badge alert" title={`Longest pending request: ${tl.maxPendingDays} days`}>
                          ⚠️ Overdue ({tl.maxPendingDays}d)
                        </span>
                      ) : (
                        <span className="status-badge ok">✓ On Track</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Stuck Requests & Upcoming Completions Grid */}
      <div className="tables-duo-grid">
        {/* Stuck Requests List */}
        <div className="table-card">
          <div className="table-card-header">
            <div>
              <h3>Overdue Requests</h3>
              <p className="table-subtitle">Requests stuck with TL or Admin beyond the overdue limit</p>
            </div>
            <AnalyticsExportActions onExport={onExport} type="stuck-requests" />
          </div>

          {loadingMap.stuck ? (
            <div className="chart-skeleton" style={{ height: 120 }}>Loading stuck requests...</div>
          ) : errorMap.stuck ? (
            <div className="widget-error-box">
              <p>⚠️ Error: {errorMap.stuck}</p>
              <button className="retry-btn" onClick={() => onRetry('stuck')}>Retry</button>
            </div>
          ) : !stuckData || stuckData.length === 0 ? (
            <div className="empty-state">🎉 No stuck requests! All requests are up to date.</div>
          ) : (
            <div className="table-wrapper">
              <table className="analytics-table mini" id="stuck-requests-table">
                <thead>
                  <tr>
                    <th>Request #</th>
                    <th>Intern</th>
                    <th>Days Pending</th>
                    <th>Stuck With</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stuckData.map((item) => (
                    <tr key={item.id} className="row-stuck-warning">
                      <td><strong>{item.requestNumber}</strong></td>
                      <td>
                        <div className="tl-name-cell">
                          <span>{item.internName}</span>
                          <small>{item.certificateType}</small>
                        </div>
                      </td>
                      <td>
                        <span className="days-pending-badge">
                          ⏳ {item.daysPending} days
                        </span>
                      </td>
                      <td>
                        <span className={`status-tag ${item.stuckWith === 'Admin' ? 'approved' : 'pending'}`}>
                          {item.stuckWith || (item.status === 'processing' ? 'Admin' : 'Team Leader')}
                        </span>
                      </td>
                      <td>
                        {item.reviewLink ? (
                          <button
                            type="button"
                            className="table-action-btn"
                            onClick={() => navigate(item.reviewLink)}
                          >
                            Review →
                          </button>
                        ) : item.status === 'processing' ? (
                          <button
                            type="button"
                            className="table-action-btn"
                            onClick={() => onOpenRequests?.('processing')}
                          >
                            Open Queue →
                          </button>
                        ) : (
                          <span title="This request is waiting for Team Leader review">Awaiting TL</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upcoming Completions */}
        <div className="table-card">
          <div className="table-card-header">
            <div>
              <h3>Upcoming Internship Completions</h3>
              <p className="table-subtitle">
                Interns with end dates in the next 30 days
                {upcomingSummary && (
                  <> — <strong>{upcomingSummary.withoutCertificateRequest}</strong> haven&apos;t requested a certificate</>
                )}
              </p>
            </div>
            <AnalyticsExportActions onExport={onExport} type="upcoming-completions" />
          </div>

          {loadingMap.upcoming ? (
            <div className="chart-skeleton" style={{ height: 120 }}>Loading upcoming completions...</div>
          ) : errorMap.upcoming ? (
            <div className="widget-error-box">
              <p>⚠️ Error: {errorMap.upcoming}</p>
              <button className="retry-btn" onClick={() => onRetry('upcoming')}>Retry</button>
            </div>
          ) : upcomingInterns.length === 0 ? (
            <div className="empty-state">No upcoming completions found for this filter</div>
          ) : (
            <div className="table-wrapper">
              <table className="analytics-table mini" id="upcoming-completions-table">
                <thead>
                  <tr>
                    <th>Intern</th>
                    <th>End Date</th>
                    <th>Remaining</th>
                    <th>Cert Requested</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingInterns.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="tl-name-cell">
                          <strong>{item.fullName}</strong>
                          <small>{item.domain} • TL: {item.teamLeaderName}</small>
                        </div>
                      </td>
                      <td>{new Date(item.endDate).toLocaleDateString()}</td>
                      <td>
                        <span className={`pill ${item.daysRemaining <= 7 ? 'amber' : 'blue'}`}>
                          {item.daysRemaining} days left
                        </span>
                      </td>
                      <td>
                        {item.hasRequestedCertificate ? (
                          <span className="status-badge ok">✓ {item.certificateStatus}</span>
                        ) : (
                          <span className="status-badge not-requested">Not Requested Yet</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
