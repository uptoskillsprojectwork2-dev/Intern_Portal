import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIntern } from '../hooks/useIntern';
import { useAuth } from '../../auth/hooks/useAuth';
import RequestCertificateModal from '../components/RequestCertificateModal';
import MyRequestsList from '../components/MyRequestsList';
import NotificationBell from '../../../shared/components/NotificationBell';
import SettingsPage from './SettingsPage';
import { updateProfile } from '../services/intern.service';
import './InternDashboard.css';
import './SettingsPage.css';
import '../../../app/App.css';

/* ── helpers ── */
const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getInitials = (name = '') =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const calcProgress = (start, end) => {
  const now = Date.now();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (!s || !e || e <= s) return 0;
  const pct = ((now - s) / (e - s)) * 100;
  return Math.min(Math.max(Math.round(pct), 0), 100);
};

const calcDaysLeft = (end) => {
  if (!end) return '—';
  const diff = Math.ceil((new Date(end).getTime() - Date.now()) / 86_400_000);
  return diff > 0 ? diff : 0;
};

/* ── nav items ── */
const NAV_ITEMS = [
  { icon: 'bi bi-grid-1x2-fill', label: 'Dashboard', id: 'dashboard' },
  { icon: 'bi bi-award-fill', label: 'Certificates', id: 'certificates' },
  { icon: 'bi bi-gear-fill', label: 'Settings', id: 'settings' },
];

/* ============================================================
   InternDashboard
   ============================================================ */
export default function InternDashboard({ initialView = 'dashboard' }) {
  const { profile, archiveNotice, loading, error, fetchProfile } = useIntern();
  const { handleLogout } = useAuth();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState(initialView);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  /* ── mobile editing state ── */
  const [isEditingMobile, setIsEditingMobile] = useState(false);
  const [mobileInput, setMobileInput] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [savingMobile, setSavingMobile] = useState(false);
  const [toast, setToast] = useState(null);

  const handleStartEditMobile = () => {
    setMobileInput(profile?.mobileNo || '');
    setMobileError('');
    setIsEditingMobile(true);
  };

  const handleCancelEditMobile = () => {
    setIsEditingMobile(false);
    setMobileError('');
  };

  const handleSaveMobile = async (e) => {
    e.preventDefault();
    const trimmed = mobileInput.trim();
    if (!trimmed) {
      setMobileError('Mobile number is required');
      return;
    }
    if (!/^[0-9]{10}$/.test(trimmed)) {
      setMobileError('Mobile number must be a valid 10-digit number');
      return;
    }

    setSavingMobile(true);
    setMobileError('');
    try {
      await updateProfile({ mobileNo: trimmed });
      setToast({ type: 'success', message: 'Mobile number updated successfully!' });
      setTimeout(() => setToast(null), 4000);
      setIsEditingMobile(false);
      await fetchProfile();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update mobile number';
      setMobileError(msg);
      setToast({ type: 'error', message: msg });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSavingMobile(false);
    }
  };

  const onLogout = () => {
    handleLogout();
    navigate('/login');
  };

  /* ── derived ── */
  const initials = profile ? getInitials(profile.fullName) : '?';
  const progress = profile
    ? calcProgress(profile.startDate, profile.endDate)
    : 0;
  const daysLeft = profile ? calcDaysLeft(profile.endDate) : '—';

  /* ── render ── */
  return (
    <div className="intern-dashboard-page">
      {toast && (
        <div className={`notification ${toast.type}`} role="alert">
          <span className="notification-icon">
            <i className={toast.type === 'success' ? 'bi bi-check-lg' : 'bi bi-x-lg'}></i>
          </span>
          <span>{toast.message}</span>
          <button
            type="button"
            className="close-btn"
            onClick={() => setToast(null)}
            aria-label="Close notification"
          >
            <i className="bi bi-x"></i>
          </button>
        </div>
      )}

      {/* ─── Top Navbar ─── */}
      <nav className="id-navbar">
        <div className="id-brand">
          <span className="id-brand-icon"><i className="bi bi-rocket-takeoff-fill"></i></span>
          uptoskills
        </div>

        <div className="id-nav-right">
          <NotificationBell
            role="intern"
            onNavigate={(targetNav) => setActiveNav(targetNav)}
          />
          <div className="id-avatar" aria-label="User avatar">
            {initials}
          </div>
          <div className="id-user-info">
            <strong>{profile?.fullName ?? 'Loading…'}</strong>
            <small>{profile?.email ?? ''}</small>
          </div>

          <button
            id="intern-logout-btn"
            className="id-logout-btn"
            onClick={onLogout}
            title="Sign out"
          >
            <span><i className="bi bi-box-arrow-right"></i></span> Logout
          </button>
        </div>
      </nav>

      {/* ─── Sidebar ─── */}
      <aside className="id-sidebar" role="navigation" aria-label="Sidebar">
        <p className="id-sidebar-label">Main Menu</p>
        <nav className="id-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              className={`id-nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              <span className="id-nav-icon"><i className={item.icon}></i></span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="id-main">
        {/* Page header */}
        <header className="id-page-header">
          <h1 className="id-greeting">
            Hello,{' '}
            <em>{profile?.fullName ?? '…'}</em> <i className="bi bi-hand-thumbs-up" style={{ marginLeft: 6, fontSize: '0.85em' }}></i>
          </h1>
          <p className="id-subtext">
            Here's your internship overview for today.
          </p>
        </header>

        {activeNav === 'dashboard' && archiveNotice && (
          <div className="id-archive-warning" role="status">
            <strong>Account archival scheduled</strong>
            <span>
              Your account is scheduled to be archived on {formatDate(archiveNotice.archiveDate)}.
              {' '}You have {archiveNotice.daysUntilArchive} day{archiveNotice.daysUntilArchive === 1 ? '' : 's'} remaining to access your portal account and certificates.
            </span>
          </div>
        )}
        {activeNav === 'dashboard' && !archiveNotice && profile?.daysUntilArchival !== undefined && profile.daysUntilArchival <= 7 && (
          <div className="id-archive-warning" role="status">
            <strong>Account archival scheduled</strong>
            <span>
              Your internship account will be archived in {profile.daysUntilArchival} day{profile.daysUntilArchival === 1 ? '' : 's'}.
              Please request and download any necessary certificates before you lose access.
            </span>
          </div>
        )}

        {activeNav === 'certificates' && (
          <>
            <section className="certificate-actions" aria-label="Certificate requests">
              <div><p className="request-eyebrow">CERTIFICATE DESK</p><h2>Request a certificate</h2><p>Choose a certificate and follow its progress here.</p></div>
              <button type="button" className="request-primary-button" onClick={() => setShowCertificateModal(true)}>Request certificate</button>
            </section>
            <MyRequestsList />
          </>
        )}

        {activeNav === 'settings' && (
          <SettingsPage profile={profile} onProfileUpdated={fetchProfile} />
        )}

        {/* ── Loading state ── */}
        {activeNav === 'dashboard' && loading && (
          <div className="id-loading" role="status" aria-live="polite">
            <div className="id-spinner" aria-hidden="true" />
            <span>Loading your profile…</span>
          </div>
        )}

        {/* ── Error state ── */}
        {activeNav === 'dashboard' && !loading && error && (
          <div className="id-error" role="alert">
            <span className="id-error-icon"><i className="bi bi-exclamation-triangle-fill"></i></span>
            <span>{error}</span>
            <button
              id="retry-profile-btn"
              className="id-retry-btn"
              onClick={fetchProfile}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Profile data ── */}
        {activeNav === 'dashboard' && !loading && !error && profile && (
          <>
            {/* Profile Card */}
            <section className="id-profile-card" aria-label="Profile details">
              <div className="id-profile-header">
                <div className="id-profile-avatar" aria-hidden="true">
                  {initials}
                </div>
                <div className="id-profile-identity">
                  <h2 className="id-profile-name">{profile.fullName}</h2>
                  <p className="id-profile-email"><i className="bi bi-envelope-fill" style={{ marginRight: 6 }}></i>{profile.email}</p>
                  <div className="id-badge-row">
                    <span className="id-badge id-badge-code">
                      <i className="bi bi-key-fill" style={{ marginRight: 4 }}></i>{profile.internCode}
                    </span>
                    <span className="id-badge id-badge-domain">
                      <i className="bi bi-laptop" style={{ marginRight: 4 }}></i>{profile.domain}
                    </span>
                    <span className="id-badge id-badge-role">
                      <i className="bi bi-mortarboard-fill" style={{ marginRight: 4 }}></i>{profile.role}
                    </span>
                    <span className="id-badge id-badge-active">
                      <i className="bi bi-check-circle-fill" style={{ marginRight: 4 }}></i>Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Detail grid */}
              <div className="id-detail-grid">
                <div className="id-detail-item">
                  <div className="id-detail-label"><i className="bi bi-phone-fill" style={{ marginRight: 6 }}></i>Mobile</div>
                  {isEditingMobile ? (
                    <form onSubmit={handleSaveMobile} className="id-mobile-edit-form">
                      <div className="id-mobile-input-row">
                        <input
                          type="tel"
                          id="mobileNo-edit-input"
                          className={`id-mobile-input ${mobileError ? 'has-error' : ''}`}
                          value={mobileInput}
                          onChange={(e) => {
                            setMobileInput(e.target.value);
                            if (mobileError) setMobileError('');
                          }}
                          placeholder="10-digit mobile number"
                          maxLength={10}
                          autoFocus
                        />
                        <button
                          type="submit"
                          id="save-mobile-btn"
                          className="id-mobile-save-btn"
                          disabled={savingMobile}
                          title="Save mobile number"
                        >
                          {savingMobile ? <span className="spinner-border-sm" aria-hidden="true" /> : <i className="bi bi-check-lg" />}
                          Save
                        </button>
                        <button
                          type="button"
                          id="cancel-mobile-btn"
                          className="id-mobile-cancel-btn"
                          onClick={handleCancelEditMobile}
                          disabled={savingMobile}
                          title="Cancel"
                        >
                          <i className="bi bi-x-lg" />
                          Cancel
                        </button>
                      </div>
                      {mobileError && (
                        <p className="inline-error" role="alert">
                          <i className="bi bi-exclamation-circle-fill"></i> {mobileError}
                        </p>
                      )}
                    </form>
                  ) : (
                    <div className="id-mobile-display-wrap">
                      <span className="id-detail-value">{profile.mobileNo || '—'}</span>
                      <button
                        type="button"
                        id="edit-mobile-btn"
                        className="id-mobile-edit-btn"
                        onClick={handleStartEditMobile}
                        title="Edit mobile number"
                      >
                        <i className="bi bi-pencil-fill"></i> Edit
                      </button>
                    </div>
                  )}
                </div>

                <div className="id-detail-item">
                  <div className="id-detail-label"><i className="bi bi-tag-fill" style={{ marginRight: 6 }}></i>Intern Code</div>
                  <div className="id-detail-value">{profile.internCode}</div>
                </div>

                <div className="id-detail-item">
                  <div className="id-detail-label"><i className="bi bi-display" style={{ marginRight: 6 }}></i>Domain</div>
                  <div className="id-detail-value">{profile.domain}</div>
                </div>

                <div className="id-detail-item">
                  <div className="id-detail-label"><i className="bi bi-calendar3" style={{ marginRight: 6 }}></i>Member Since</div>
                  <div className="id-detail-value">
                    {formatDate(profile.createdAt)}
                  </div>
                </div>
              </div>
            </section>

            {/* Internship Timeline */}
            <section aria-label="Internship timeline">
              <h3 className="id-section-title"><i className="bi bi-calendar-range" style={{ marginRight: 8 }}></i>Internship Timeline</h3>
              <div className="id-timeline-card">
                <div className="id-date-row">
                  <div className="id-date-block start">
                    <div className="id-date-label"><i className="bi bi-record-circle-fill" style={{ color: 'var(--success, #10b981)', marginRight: 6 }}></i>Start Date</div>
                    <div className="id-date-value">
                      {formatDate(profile.startDate)}
                    </div>
                  </div>

                  <div className="id-arrow" aria-hidden="true"><i className="bi bi-arrow-right"></i></div>

                  <div className="id-date-block end">
                    <div className="id-date-label"><i className="bi bi-record-circle-fill" style={{ color: 'var(--accent, #6366f1)', marginRight: 6 }}></i>End Date</div>
                    <div className="id-date-value">
                      {formatDate(profile.endDate)}
                    </div>
                  </div>
                </div>

                <div className="id-progress-wrapper">
                  <div className="id-progress-label">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div
                    className="id-progress-track"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="id-progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Stat Grid */}
            <div className="id-stat-grid" aria-label="Quick stats">
              <div className="id-stat-card">
                <div className="id-stat-icon accent"><i className="bi bi-person-badge-fill"></i></div>
                <div className="id-stat-label">Role</div>
                <div className="id-stat-value accent">{profile.role}</div>
              </div>

              <div className="id-stat-card">
                <div className="id-stat-icon success"><i className="bi bi-laptop-fill"></i></div>
                <div className="id-stat-label">Domain</div>
                <div className="id-stat-value success">{profile.domain}</div>
              </div>

              <div className="id-stat-card">
                <div className="id-stat-icon warning"><i className="bi bi-hourglass-split"></i></div>
                <div className="id-stat-label">Days Remaining</div>
                <div className="id-stat-value warning">{daysLeft}</div>
              </div>

              <div className="id-stat-card">
                <div className="id-stat-icon info"><i className="bi bi-bar-chart-line-fill"></i></div>
                <div className="id-stat-label">Completion</div>
                <div className="id-stat-value info">{progress}%</div>
              </div>
            </div>

          </>
        )}
      </main>
      {showCertificateModal && <RequestCertificateModal onClose={() => setShowCertificateModal(false)} />}
    </div>
  );
}
