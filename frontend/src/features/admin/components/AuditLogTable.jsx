import { useState } from 'react';

export default function AuditLogTable({ logs }) {
  const [expanded, setExpanded] = useState({});
  return <div className="audit-table-wrap"><table className="audit-table"><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
    <tbody>{logs.map((log) => <tr key={log._id}><td>{new Date(log.createdAt).toLocaleString()}</td><td>{log.actorId?.fullName || (log.actorRole === 'system' ? 'System' : 'Unknown')}<small>{log.actorRole}{log.actorId?.email ? ` · ${log.actorId.email}` : ''}</small></td><td><code>{log.action}</code></td><td>{log.targetType}<small>{log.targetId || '—'}</small></td><td><button className="audit-expand" type="button" aria-expanded={!!expanded[log._id]} onClick={() => setExpanded((prev) => ({ ...prev, [log._id]: !prev[log._id] }))}>{expanded[log._id] ? 'Hide details' : 'View details'}</button>{expanded[log._id] && <pre>{JSON.stringify({ description: log.description, metadata: log.meta, ip: log.ipAddress || log.ip, userAgent: log.userAgent }, null, 2)}</pre>}</td></tr>)}</tbody>
  </table></div>;
}
