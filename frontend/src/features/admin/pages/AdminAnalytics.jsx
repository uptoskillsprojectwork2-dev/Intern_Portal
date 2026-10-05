import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAdminAnalytics,
  getAllTeamLeaders,
  exportAdminAnalytics,
} from "../services/admin.service";
import Toast from "../../shared/components/Toast";
import "./AdminAnalytics.css";

const EMPTY = {
  overview: null,
  trend: null,
  types: null,
  turnaround: null,
  leaders: null,
  domains: null,
  pipeline: null,
  stuck: null,
  completions: null,
};
const dateValue = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function MetricCard({ label, value, helper, icon, loading }) {
  return (
    <article className="analytics-metric">
      <div className="analytics-metric-top">
        <span>{label}</span>
        <span className="analytics-metric-icon">{icon}</span>
      </div>
      {loading ? (
        <div className="analytics-skeleton analytics-number-skeleton" />
      ) : (
        <strong>{value ?? "—"}</strong>
      )}
      <small>{helper}</small>
    </article>
  );
}

function Widget({
  title,
  subtitle,
  children,
  loading,
  error,
  onRetry,
  action,
}) {
  return (
    <section className="analytics-widget">
      <div className="analytics-widget-heading">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {loading ? (
        <div className="analytics-widget-loading">
          <span className="analytics-skeleton" />
          <span className="analytics-skeleton" />
          <span className="analytics-skeleton" />
        </div>
      ) : error ? (
        <div className="analytics-error">
          <span>{error}</span>
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function HorizontalBars({ items = [], onSelect, selected }) {
  const max = Math.max(
    1,
    ...items.map((item) => Number(item.value || item.count || 0)),
  );
  if (!items.length)
    return <div className="analytics-empty">No data for this period</div>;
  return (
    <div className="analytics-bars">
      {items.slice(0, 8).map((item) => {
        const value = Number(item.value ?? item.count ?? 0);
        const label = item.name ?? item.label ?? "Other";
        return (
          <button
            type="button"
            className={`analytics-bar-row ${selected === (item.status || label) ? "selected" : ""}`}
            key={label}
            onClick={() => onSelect?.(item)}
          >
            <span className="analytics-bar-label" title={label}>
              {label}
            </span>
            <span className="analytics-bar-track">
              <span
                className="analytics-bar-fill"
                style={{
                  width: `${Math.max(value ? 3 : 0, (value / max) * 100)}%`,
                }}
              />
            </span>
            <b>{value}</b>
          </button>
        );
      })}
    </div>
  );
}

function TrendChart({ data }) {
  const labels = data?.labels || [];
  const series = data?.series || [];
  if (!labels.length)
    return <div className="analytics-empty">No requests for this period</div>;
  const totals = labels.map((_, index) =>
    series.reduce((sum, row) => sum + Number(row.data?.[index] || 0), 0),
  );
  const max = Math.max(1, ...totals);
  const points = totals
    .map(
      (value, index) =>
        `${labels.length === 1 ? 50 : 12 + index * (76 / (labels.length - 1))},${88 - (value / max) * 66}`,
    )
    .join(" ");
  return (
    <div className="analytics-trend-wrap">
      <svg
        className="analytics-trend-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="img"
        aria-label="Requests trend chart"
      >
        {[22, 44, 66, 88].map((y) => (
          <line
            key={y}
            x1="8"
            y1={y}
            x2="92"
            y2={y}
            className="analytics-grid-line"
          />
        ))}
        <polyline points={points} className="analytics-trend-line" />
        {totals.map((value, index) => (
          <circle
            key={labels[index]}
            cx={
              labels.length === 1 ? 50 : 12 + index * (76 / (labels.length - 1))
            }
            cy={88 - (value / max) * 66}
            r="1.5"
            className="analytics-trend-point"
          />
        ))}
      </svg>
      <div className="analytics-trend-labels">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="analytics-legend">
        {series.map((item) => (
          <span key={item.name}>
            <i className={`analytics-legend-dot status-${item.name}`} />
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [range, setRange] = useState("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [domain, setDomain] = useState("");
  const [teamLeader, setTeamLeader] = useState("");
  const [overdueDays, setOverdueDays] = useState("7");
  const [data, setData] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [leadersOptions, setLeadersOptions] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [toast, setToast] = useState(null);
  const [exporting, setExporting] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const filters = useMemo(() => {
    const result = { domain, teamLeader, overdueDays };
    if (range === "custom") {
      result.from = from;
      result.to = to;
    } else {
      const end = new Date();
      const start = new Date(end);
      if (range === "7d") start.setDate(start.getDate() - 6);
      else if (range === "30d") start.setDate(start.getDate() - 29);
      else start.setMonth(start.getMonth() - 5, 1);
      result.from = dateValue(start);
      result.to = dateValue(end);
    }
    return result;
  }, [range, from, to, domain, teamLeader, overdueDays]);

  const load = useCallback(async () => {
    setLoading(true);
    const endpoints = [
      ["overview", "overview"],
      ["trend", "requests-trend"],
      ["types", "certificate-types"],
      ["turnaround", "turnaround"],
      ["leaders", "team-leaders"],
      ["domains", "domains"],
      ["pipeline", "pipeline"],
      ["stuck", "stuck-requests"],
      ["completions", "upcoming-completions"],
    ];
    const results = await Promise.allSettled(
      endpoints.map(([, endpoint]) =>
        getAdminAnalytics(endpoint, {
          ...filters,
          range,
          groupBy: range === "7d" ? "day" : "month",
          days: 30,
        }),
      ),
    );
    const next = { ...EMPTY };
    const nextErrors = {};
    results.forEach((result, index) => {
      const key = endpoints[index][0];
      if (result.status === "fulfilled") next[key] = result.value;
      else
        nextErrors[key] =
          result.reason?.message || "Unable to load this widget.";
    });
    setData(next);
    setErrors(nextErrors);
    setLastUpdated(new Date());
    setLoading(false);
  }, [filters, range]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);
  useEffect(() => {
    getAllTeamLeaders()
      .then((result) => setLeadersOptions(result.teamLeaders || []))
      .catch(() => setLeadersOptions([]));
  }, []);

  const exportData = async (type, format = "csv") => {
    try {
      setExporting(type);
      const blob = await exportAdminAnalytics(type, filters, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `admin-analytics-${type}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setToast({
        message: `Analytics ${format.toUpperCase()} export downloaded.`,
        type: "success",
      });
    } catch (error) {
      setToast({
        message: error.message || "Export failed. Please try again.",
        type: "error",
      });
    } finally {
      setExporting("");
    }
  };

  const kpis = data.overview?.kpis || {};
  const retry = (key, endpoint) =>
    getAdminAnalytics(endpoint, filters)
      .then((result) => {
        setData((previous) => ({ ...previous, [key]: result }));
        setErrors((previous) => {
          const copy = { ...previous };
          delete copy[key];
          return copy;
        });
      })
      .catch((error) =>
        setErrors((previous) => ({
          ...previous,
          [key]: error.message || "Unable to load this widget.",
        })),
      );

  return (
    <div className="admin-analytics-page">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="analytics-toolbar">
        <div className="analytics-toolbar-filters">
          <label>
            Period
            <select
              value={range}
              onChange={(event) => setRange(event.target.value)}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="6m">Last 6 months</option>
              <option value="custom">Custom range</option>
            </select>
          </label>
          {range === "custom" && (
            <>
              <label>
                From
                <input
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(event) => setTo(event.target.value)}
                />
              </label>
            </>
          )}
          <label>
            Domain
            <select
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
            >
              <option value="">All domains</option>
              {(data.domains?.items || []).map((item) => (
                <option value={item.name} key={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Team leader
            <select
              value={teamLeader}
              onChange={(event) => setTeamLeader(event.target.value)}
            >
              <option value="">All team leaders</option>
              {leadersOptions.map((item) => (
                <option value={item._id} key={item._id}>
                  {item.fullName}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="analytics-toolbar-actions">
          <span className="analytics-updated">
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "Not updated yet"}
          </span>
          <button
            type="button"
            className="analytics-button secondary"
            onClick={load}
          >
            ↻ Refresh
          </button>
          <button
            type="button"
            className="analytics-button primary"
            disabled={!!exporting}
            onClick={() => exportData("overview", "xlsx")}
          >
            {exporting ? "Exporting…" : "↓ Export Excel"}
          </button>
        </div>
      </div>
      {range === "custom" && from && to && from > to && (
        <p className="analytics-validation">
          The start date must be before the end date.
        </p>
      )}

      <div className="analytics-section-title">
        <div>
          <span className="analytics-eyebrow">OVERVIEW</span>
          <h2>Analytics at a glance</h2>
        </div>
        <span className="analytics-period-pill">
          {range === "7d"
            ? "7 days"
            : range === "30d"
              ? "30 days"
              : range === "6m"
                ? "6 months"
                : "Custom period"}
        </span>
      </div>
      <div className="analytics-metrics-grid">
        <MetricCard
          label="Total interns"
          value={kpis.totalInterns?.toLocaleString()}
          helper={`${kpis.upcomingInterns || 0} upcoming`}
          icon="♙"
          loading={loading && !data.overview}
        />
        <MetricCard
          label="Active interns"
          value={kpis.activeInterns?.toLocaleString()}
          helper={`${kpis.completedInterns || 0} completed`}
          icon="◉"
          loading={loading && !data.overview}
        />
        <MetricCard
          label="Pending requests"
          value={kpis.pendingRequests?.toLocaleString()}
          helper={`${kpis.requestsInPeriod || 0} requests in period`}
          icon="◷"
          loading={loading && !data.overview}
        />
        <MetricCard
          label="Certificates issued"
          value={kpis.certificatesIssuedInPeriod?.toLocaleString()}
          helper="Selected period"
          icon="▤"
          loading={loading && !data.overview}
        />
        <MetricCard
          label="Avg. turnaround"
          value={`${kpis.averageTurnaroundDays ?? 0} days`}
          helper="Request to first review"
          icon="⌁"
          loading={loading && !data.overview}
        />
      </div>

      <div className="analytics-section-title compact">
        <div>
          <span className="analytics-eyebrow">REQUESTS & CERTIFICATES</span>
          <h2>Activity insights</h2>
        </div>
      </div>
      <div className="analytics-grid-two">
        <Widget
          title="Requests over time"
          subtitle="Request volume by period and status"
          loading={loading && !data.trend}
          error={errors.trend}
          onRetry={() => retry("trend", "requests-trend")}
          action={
            <button
              className="analytics-export-link"
              onClick={() => exportData("requests-trend")}
            >
              Export CSV
            </button>
          }
        >
          <TrendChart data={data.trend} />
        </Widget>
        <Widget
          title="Certificate types"
          subtitle="Issued certificates by type"
          loading={loading && !data.types}
          error={errors.types}
          onRetry={() => retry("types", "certificate-types")}
          action={
            <button
              className="analytics-export-link"
              onClick={() => exportData("certificate-types")}
            >
              Export CSV
            </button>
          }
        >
          <HorizontalBars items={data.types?.items || []} />
        </Widget>
        <Widget
          title="Interns by domain"
          subtitle="Current intern distribution"
          loading={loading && !data.domains}
          error={errors.domains}
          onRetry={() => retry("domains", "domains")}
          action={
            <button
              className="analytics-export-link"
              onClick={() => exportData("domains")}
            >
              Export CSV
            </button>
          }
        >
          <HorizontalBars items={data.domains?.items || []} />
        </Widget>
        <Widget
          title="Request pipeline"
          subtitle="Select a stage to filter the request list"
          loading={loading && !data.pipeline}
          error={errors.pipeline}
          onRetry={() => retry("pipeline", "pipeline")}
          action={
            <button
              className="analytics-export-link"
              onClick={() => exportData("pipeline")}
            >
              Export CSV
            </button>
          }
        >
          <HorizontalBars
            items={data.pipeline?.items || []}
            selected={selectedStatus}
            onSelect={(item) =>
              setSelectedStatus(
                selectedStatus === item.status ? "" : item.status,
              )
            }
          />
        </Widget>
      </div>

      <div className="analytics-section-title compact">
        <div>
          <span className="analytics-eyebrow">OPERATIONS</span>
          <h2>Team performance & follow-ups</h2>
        </div>
      </div>
      <div className="analytics-grid-two analytics-bottom-grid">
        <Widget
          title="Team leader performance"
          subtitle="Review volume, pending work and overdue requests"
          loading={loading && !data.leaders}
          error={errors.leaders}
          onRetry={() => retry("leaders", "team-leaders")}
          action={
            <button
              className="analytics-export-link"
              onClick={() => exportData("team-leaders")}
            >
              Export CSV
            </button>
          }
        >
          {(data.leaders?.items || []).length ? (
            <div className="analytics-table-wrap">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Team leader</th>
                    <th>Interns</th>
                    <th>Reviewed</th>
                    <th>Pending</th>
                    <th>Avg. days</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leaders.items.map((item) => (
                    <tr
                      key={item.id}
                      className={item.overdueRequests ? "overdue-row" : ""}
                    >
                      <td>
                        <strong>{item.fullName}</strong>
                        <small>{item.email}</small>
                        {item.overdueRequests > 0 && (
                          <em>{item.overdueRequests} overdue</em>
                        )}
                      </td>
                      <td>{item.internsAssigned}</td>
                      <td>{item.requestsReviewed}</td>
                      <td>{item.pendingReviews}</td>
                      <td>{item.averageReviewDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="analytics-empty">
              No team leader data for this period
            </div>
          )}
        </Widget>
        <Widget
          title="Stuck requests"
          subtitle="Pending requests waiting longer than the selected threshold"
          loading={loading && !data.stuck}
          error={errors.stuck}
          onRetry={() => retry("stuck", "stuck-requests")}
          action={
            <div className="analytics-inline-controls">
              <label>
                Days{" "}
                <select
                  value={overdueDays}
                  onChange={(event) => setOverdueDays(event.target.value)}
                >
                  <option value="3">3+</option>
                  <option value="7">7+</option>
                  <option value="14">14+</option>
                  <option value="30">30+</option>
                </select>
              </label>
              <button
                className="analytics-export-link"
                onClick={() => exportData("stuck-requests")}
              >
                Export CSV
              </button>
            </div>
          }
        >
          {(data.stuck?.items || []).length ? (
            <div className="analytics-stuck-list">
              {data.stuck.items
                .filter(
                  (item) => !selectedStatus || item.status === selectedStatus,
                )
                .slice(0, 7)
                .map((item) => (
                  <div className="analytics-stuck-item" key={item.id}>
                    <div className="analytics-stuck-avatar">
                      {item.internName
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="analytics-stuck-copy">
                      <strong>{item.internName}</strong>
                      <span>
                        {item.requestNumber} · {item.certificateType}
                      </span>
                    </div>
                    <span className="analytics-waiting-badge">
                      {item.waitingDays}d
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <div className="analytics-empty">No overdue pending requests</div>
          )}
        </Widget>
        <Widget
          title="Upcoming completions"
          subtitle="Internships ending in the next 30 days"
          loading={loading && !data.completions}
          error={errors.completions}
          onRetry={() => retry("completions", "upcoming-completions")}
          action={
            <button
              className="analytics-export-link"
              onClick={() => exportData("upcoming-completions")}
            >
              Export CSV
            </button>
          }
        >
          {(data.completions?.items || []).length ? (
            <div className="analytics-completions-list">
              {data.completions.items.slice(0, 6).map((item) => (
                <div className="analytics-completion-item" key={item.id}>
                  <div>
                    <strong>{item.fullName}</strong>
                    <small>
                      {item.domain} ·{" "}
                      {new Date(item.endDate).toLocaleDateString()}
                    </small>
                  </div>
                  <span
                    className={
                      item.hasRequestedCertificate
                        ? "completion-requested"
                        : "completion-missing"
                    }
                  >
                    {item.hasRequestedCertificate ? "Requested" : "No request"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="analytics-empty">No upcoming completions</div>
          )}
        </Widget>
        <Widget
          title="Turnaround time"
          subtitle="Time from certificate request to team leader review"
          loading={loading && !data.turnaround}
          error={errors.turnaround}
          onRetry={() => retry("turnaround", "turnaround")}
          action={
            <button
              className="analytics-export-link"
              onClick={() => exportData("turnaround")}
            >
              Export CSV
            </button>
          }
        >
          <div className="analytics-turnaround-cards">
            <div>
              <span>Average</span>
              <strong>
                {data.turnaround?.review?.averageDays ?? 0} <small>days</small>
              </strong>
            </div>
            <div>
              <span>Median</span>
              <strong>
                {data.turnaround?.review?.medianDays ?? 0} <small>days</small>
              </strong>
            </div>
            <div>
              <span>90th percentile</span>
              <strong>
                {data.turnaround?.review?.p90Days ?? 0} <small>days</small>
              </strong>
            </div>
          </div>
          <p className="analytics-sample-note">
            Based on {data.turnaround?.review?.sampleSize || 0} reviewed
            requests in the selected period.
          </p>
        </Widget>
      </div>
    </div>
  );
}
