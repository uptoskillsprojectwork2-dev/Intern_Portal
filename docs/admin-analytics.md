# Admin analytics

The Admin Analytics tab combines certificate request, certificate, intern, and team leader reporting. All routes are under `/api/admin/analytics`, require an authenticated Admin, and accept the shared filters `range`, `from`, `to`, `domain`, `teamLeaderId`, and `groupBy` where relevant. Date boundaries use UTC. Calendar-month KPI cards always report the current and previous UTC calendar months even when the dashboard trend uses another date range.

## Reports

| Route | Report |
| --- | --- |
| `GET /overview` | Intern totals, request totals and rates, current/previous month KPI counts |
| `GET /requests-trend` | Request counts by day, ISO week, or month and status |
| `GET /certificate-types` | Counts from finalized/issued certificate records, grouped by certificate type |
| `GET /turnaround` | Request and issuance turnaround summaries in hours, including p90 |
| `GET /team-leaders` | Assigned interns, review volume, pending and overdue work, review time |
| `GET /domains` | Intern totals and active counts grouped by domain |
| `GET /pipeline` | Request stage, rejection, draft, and generation failure counts |
| `GET /upcoming-completions?days=30` | Interns whose end date falls within the next 7 or 30 days |
| `GET /stuck?days=3` | Requests pending beyond the selected number of days |
| `GET /requests` | Paginated request drill-down; supports `status`, `reviewStage`, `certificateType`, `page`, and `limit` |
| `GET /export?type=overview&format=csv` | Download report data as CSV or XLSX |

Chart and table selections open the paginated request report while preserving the dashboard filters in the URL. Exports are audit logged. CSV/XLSX cells beginning with spreadsheet formula characters are neutralized.

## Team leader assignments

Analytics uses `internshipDetails.teamLeaderId`; it can read the legacy ObjectId `teamLeader` field while records are awaiting migration, but does not infer ownership from email. `node scripts/backfillTeamLeaderId.js` runs read-only and reports matched, unmatched, ambiguous, duplicate-email, and redundant dual-reference records. Applying safe, unambiguous links requires both `--apply` and `--confirm=APPLY_TEAM_LEADER_ID_BACKFILL`; unmatched and ambiguous rows remain unchanged.

The production database check during Task G found 59 intern records and one Team Leader account: zero interns had `teamLeaderId`, one had the legacy ObjectId field, and only two had an email matching that Team Leader. This was a historical snapshot; the current completion audit could not refresh it because the configured `cluster0` DNS SRV lookup timed out. The backfill was not applied because the mapping report could not be refreshed and unmatched ownership cannot be inferred safely.

## Validation

Backend suite: `cd backend && npm test`. Frontend checks: `cd frontend && npm run lint && npm run build`.
