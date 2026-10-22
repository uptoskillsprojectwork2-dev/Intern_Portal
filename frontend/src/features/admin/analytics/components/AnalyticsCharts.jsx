import AnalyticsExportActions from './AnalyticsExportActions';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

const tooltipStyle = {
  backgroundColor: 'var(--card, #1e293b)',
  borderColor: 'var(--border, rgba(255, 255, 255, 0.1))',
  color: 'var(--text, #f8fafc)',
  borderRadius: '10px',
  boxShadow: '0 4px 16px var(--shadow, rgba(0, 0, 0, 0.2))',
  fontSize: '0.8125rem'
};

const mapPipelineStatus = (rawStatus) => {
  if (rawStatus === 'rejected_tl' || rawStatus === 'rejected_admin') return 'rejected';
  if (rawStatus === 'failed_generation') return 'approved';
  return rawStatus;
};

const getStageColor = (status) => {
  switch (status) {
    case 'pending': return '#f59e0b';
    case 'processing': return '#6366f1';
    case 'approved': return '#3b82f6';
    case 'failed_generation': return '#ef4444';
    case 'completed': return '#10b981';
    case 'rejected_tl':
    case 'rejected_admin':
    case 'rejected': return '#dc2626';
    default: return '#8b5cf6';
  }
};

export default function AnalyticsCharts({
  trendData,
  typesData,
  domainsData,
  pipelineData,
  teamLeadersData,
  loadingMap = {},
  errorMap = {},
  onRetry,
  onExport,
  onOpenRequests,
  onSelectDomain,
  onSelectTeamLeader
}) {
  return (
    <div className="analytics-charts-grid">
      {/* 1. Requests Trend (Area / Line Chart) */}
      <div className="chart-card wide">
        <div className="chart-header">
          <div>
            <h3>Certificate Requests Trend Over Time</h3>
            <p className="chart-subtitle">Volume of requests split by status (click segment to inspect)</p>
          </div>
          <AnalyticsExportActions onExport={onExport} type="requests-trend" formats={['xlsx', 'csv']} />
        </div>
        {loadingMap.trend ? (
          <div className="chart-skeleton">Loading trend visualization...</div>
        ) : errorMap.trend ? (
          <div className="widget-error-box">
            <p><i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 6 }}></i>Error loading trend: {errorMap.trend}</p>
            <button className="retry-btn" onClick={() => onRetry('trend')}>Retry</button>
          </div>
        ) : !trendData?.raw || trendData.raw.length === 0 ? (
          <div className="empty-state">No request data found for this period</div>
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData.raw} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProcessing" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke="var(--border)" />
                <XAxis dataKey="period" stroke="var(--muted)" fontSize={12} />
                <YAxis stroke="var(--muted)" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text)' }} />
                <Legend wrapperStyle={{ color: 'var(--text)', fontSize: '0.8125rem' }} />
                <Area type="monotone" dataKey="pending" name="Pending (TL)" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPending)" onClick={() => onOpenRequests?.('pending')} cursor="pointer" />
                <Area type="monotone" dataKey="processing" name="Processing (Admin)" stroke="#6366f1" fillOpacity={1} fill="url(#colorProcessing)" onClick={() => onOpenRequests?.('processing')} cursor="pointer" />
                <Area type="monotone" dataKey="approved" name="Approved" stroke="#3b82f6" fillOpacity={1} fill="url(#colorApproved)" onClick={() => onOpenRequests?.('approved')} cursor="pointer" />
                <Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" fillOpacity={1} fill="url(#colorCompleted)" onClick={() => onOpenRequests?.('completed')} cursor="pointer" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 2. Certificate Types Donut Chart */}
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h3>Certificate Types Distribution</h3>
            <p className="chart-subtitle">Breakdown by certificate type (click to filter)</p>
          </div>
          <AnalyticsExportActions onExport={onExport} type="certificate-types" formats={['xlsx', 'csv']} />
        </div>
        {loadingMap.types ? (
          <div className="chart-skeleton">Loading types...</div>
        ) : errorMap.types ? (
          <div className="widget-error-box">
            <p><i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 6 }}></i>Error loading types: {errorMap.types}</p>
            <button className="retry-btn" onClick={() => onRetry('types')}>Retry</button>
          </div>
        ) : !typesData?.breakdown || typesData.breakdown.length === 0 ? (
          <div className="empty-state">No certificate data for this period</div>
        ) : (
          <div className="chart-container donut-layout">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={typesData.breakdown}
                  dataKey="count"
                  nameKey="certificateType"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  cursor="pointer"
                  onClick={(entry) => onOpenRequests?.('all', entry.certificateType)}
                >
                  {typesData.breakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text)' }} />
                <Legend wrapperStyle={{ color: 'var(--text)', fontSize: '0.78125rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 3. Interns per Domain Bar Chart */}
      <div className="chart-card wide">
        <div className="chart-header">
          <div>
            <h3>Interns & Certificates by Domain</h3>
            <p className="chart-subtitle">Click a domain bar to filter analytics</p>
          </div>
          <AnalyticsExportActions onExport={onExport} type="domains" formats={['xlsx', 'csv']} />
        </div>
        {loadingMap.domains ? (
          <div className="chart-skeleton">Loading domains...</div>
        ) : errorMap.domains ? (
          <div className="widget-error-box">
            <p><i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 6 }}></i>Error loading domains: {errorMap.domains}</p>
            <button className="retry-btn" onClick={() => onRetry('domains')}>Retry</button>
          </div>
        ) : !domainsData?.domains || domainsData.domains.length === 0 ? (
          <div className="empty-state">No domain data found</div>
        ) : (() => {
          const chartData = domainsData.domains.map((d) => ({
            ...d,
            shortDomain: d.domain.length > 20 ? d.domain.slice(0, 18) + '…' : d.domain
          }));
          return (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke="var(--border)" />
                  <XAxis dataKey="shortDomain" stroke="var(--muted)" fontSize={11} />
                  <YAxis stroke="var(--muted)" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text)' }} />
                  <Legend wrapperStyle={{ color: 'var(--text)', fontSize: '0.8125rem' }} />
                  <Bar dataKey="totalInterns" name="Total Interns" fill="#3b82f6" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(entry) => onSelectDomain?.(entry.domain)} />
                  <Bar dataKey="certificatesCount" name="Certificates Issued" fill="#10b981" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(entry) => onSelectDomain?.(entry.domain)} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          );
        })()}
      </div>

      {/* 4. Pipeline Stages Horizontal Bar Chart */}
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h3>Request Pipeline & Bottlenecks</h3>
            <p className="chart-subtitle">Click any stage to inspect matching requests</p>
          </div>
          <AnalyticsExportActions onExport={onExport} type="pipeline" formats={['xlsx', 'csv']} />
          {pipelineData?.failedGenerations > 0 && (
            <span className="status-badge alert" title="Approved requests missing a generated certificate draft">
              <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 6 }}></i>{pipelineData.failedGenerations} Failed
            </span>
          )}
        </div>
        {loadingMap.pipeline ? (
          <div className="chart-skeleton">Loading pipeline...</div>
        ) : errorMap.pipeline ? (
          <div className="widget-error-box">
            <p><i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 6 }}></i>Error loading pipeline: {errorMap.pipeline}</p>
            <button className="retry-btn" onClick={() => onRetry('pipeline')}>Retry</button>
          </div>
        ) : !pipelineData?.pipeline || pipelineData.pipeline.length === 0 ? (
          <div className="empty-state">No pipeline data found</div>
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart layout="vertical" data={pipelineData.pipeline} margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke="var(--border)" />
                <XAxis type="number" stroke="var(--muted)" fontSize={12} allowDecimals={false} />
                <YAxis type="category" dataKey="stage" stroke="var(--muted)" tick={{ fontSize: 11 }} width={130} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text)' }} />
                <Bar
                  dataKey="count"
                  name="Requests Count"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                  onClick={(entry) => onOpenRequests?.(mapPipelineStatus(entry.status))}
                >
                  {pipelineData.pipeline.map((entry, idx) => (
                    <Cell
                      key={`cell-p-${idx}`}
                      fill={getStageColor(entry.status)}
                      cursor="pointer"
                      onClick={() => onOpenRequests?.(mapPipelineStatus(entry.status))}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 5. Team Leader Average Review Time Bar Chart */}
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h3>TL Average Decision Time (Hours)</h3>
            <p className="chart-subtitle">Turnaround speed per Team Leader (click to filter)</p>
          </div>
          <AnalyticsExportActions onExport={onExport} type="team-leaders" formats={['xlsx', 'csv']} />
        </div>
        {loadingMap.teamLeaders ? (
          <div className="chart-skeleton">Loading TL turnaround...</div>
        ) : errorMap.teamLeaders ? (
          <div className="widget-error-box">
            <p><i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 6 }}></i>Error loading TL data: {errorMap.teamLeaders}</p>
            <button className="retry-btn" onClick={() => onRetry('teamLeaders')}>Retry</button>
          </div>
        ) : !teamLeadersData || teamLeadersData.length === 0 ? (
          <div className="empty-state">No Team Leader data found</div>
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={teamLeadersData} margin={{ top: 8, right: 20, left: 10, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke="var(--border)" />
                <XAxis dataKey="fullName" stroke="var(--muted)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--muted)" fontSize={12} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: 'var(--muted)' }} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text)' }} />
                <Bar
                  dataKey="avgReviewTimeHours"
                  name="Avg Review Time (hrs)"
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                  onClick={(entry) => onSelectTeamLeader?.(entry.id)}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
