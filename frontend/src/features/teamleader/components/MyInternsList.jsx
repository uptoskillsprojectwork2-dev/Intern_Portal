import { useState } from 'react';
import StatusBadge from '../../shared/components/StatusBadge';
import useMyInterns from '../hooks/useMyInterns';
import { updateAssignedIntern } from '../services/tl.service';
import './MyInternsList.css';

const formatDate = (date) => date
  ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  : '—';

export default function MyInternsList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { interns, loading, error, refetch } = useMyInterns({
    search: search || undefined,
    status: statusFilter || undefined
  });

  // Edit Modal State
  const [editingIntern, setEditingIntern] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg] = useState(null);

  const openEditModal = (intern) => {
    setEditingIntern(intern);
    setEditForm({
      fullName: intern.fullName || '',
      mobileNo: intern.mobileNo || '',
      domain: intern.domain || '',
      startDate: intern.startDate ? new Date(intern.startDate).toISOString().slice(0, 10) : '',
      endDate: intern.endDate ? new Date(intern.endDate).toISOString().slice(0, 10) : '',
      collegeName: intern.internshipDetails?.collegeName || '',
      degree: intern.internshipDetails?.degree || '',
      internshipTitle: intern.internshipDetails?.internshipTitle || '',
      mentor: intern.internshipDetails?.mentor || '',
      performanceRemarks: intern.internshipDetails?.performanceRemarks || '',
      status: intern.internshipDetails?.status || 'ongoing'
    });
    setEditMsg(null);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (editForm.startDate && editForm.endDate && new Date(editForm.startDate) > new Date(editForm.endDate)) {
      setEditMsg({ type: 'error', text: 'Start date cannot be after end date' });
      return;
    }
    setEditLoading(true);
    setEditMsg(null);
    try {
      await updateAssignedIntern(editingIntern._id || editingIntern.id, editForm);
      setEditMsg({ type: 'success', text: 'Intern updated successfully!' });
      setTimeout(() => {
        setEditingIntern(null);
        refetch();
      }, 700);
    } catch (err) {
      setEditMsg({ type: 'error', text: err.message || 'Failed to update intern' });
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <section className="my-interns-panel" aria-labelledby="my-interns-title">
      <div className="my-interns-heading">
        <div>
          <p className="request-eyebrow">TEAM DIRECTORY</p>
          <h2 id="my-interns-title">My Interns</h2>
          <p>Manage and review only the interns assigned to your team.</p>
        </div>
        {!loading && !error && <span className="my-interns-count">{interns.length} assigned</span>}
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search assigned interns by name, email, or domain..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: '220px',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            background: 'var(--input)',
            color: 'var(--text)',
            fontSize: '14px',
          }}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            background: 'var(--input)',
            color: 'var(--text)',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          <option value="">All Statuses</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <StatusBadge status={intern.internshipDetails?.status} />
                  <button
                    type="button"
                    className="admin-btn-sm"
                    onClick={() => openEditModal(intern)}
                    title="View & Edit Intern Details"
                  >
                    View / Edit
                  </button>
                </div>
              </div>
              <div className="my-intern-details">
                <div><span>Intern code</span><strong>{intern.internCode || '—'}</strong></div>
                <div><span>Domain</span><strong>{intern.domain || '—'}</strong></div>
                <div><span>Mentor</span><strong>{intern.internshipDetails?.mentor || '—'}</strong></div>
                <div><span>Start date</span><strong>{formatDate(intern.startDate)}</strong></div>
                <div><span>End date</span><strong>{formatDate(intern.endDate)}</strong></div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Edit Intern Modal for TL */}
      {editingIntern && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal-card">
            <h3>Edit Intern Details</h3>
            <p>Update assigned intern information for <strong>{editingIntern.fullName}</strong>.</p>

            {editMsg && (
              <div className={`admin-alert-box ${editMsg.type}`}>
                {editMsg.text}
              </div>
            )}

            <form onSubmit={handleEditSave}>
              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label>Mobile Number</label>
                  <input
                    type="text"
                    value={editForm.mobileNo}
                    onChange={(e) => setEditForm({ ...editForm, mobileNo: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label>Domain / Track</label>
                  <input
                    type="text"
                    value={editForm.domain}
                    onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label>Internship Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label>College / University</label>
                  <input
                    type="text"
                    value={editForm.collegeName}
                    onChange={(e) => setEditForm({ ...editForm, collegeName: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label>Degree / Course</label>
                  <input
                    type="text"
                    value={editForm.degree}
                    onChange={(e) => setEditForm({ ...editForm, degree: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label>Internship Title</label>
                  <input
                    type="text"
                    value={editForm.internshipTitle}
                    onChange={(e) => setEditForm({ ...editForm, internshipTitle: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label>Mentor Name</label>
                  <input
                    type="text"
                    value={editForm.mentor}
                    onChange={(e) => setEditForm({ ...editForm, mentor: e.target.value })}
                  />
                </div>

                <div className="admin-form-group admin-form-full">
                  <label>Performance Remarks</label>
                  <textarea
                    rows={2}
                    value={editForm.performanceRemarks}
                    onChange={(e) => setEditForm({ ...editForm, performanceRemarks: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn-sm"
                  onClick={() => setEditingIntern(null)}
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-sm admin-btn-primary-sm"
                  disabled={editLoading}
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
