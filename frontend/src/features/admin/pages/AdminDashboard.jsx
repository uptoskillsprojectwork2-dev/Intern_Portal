import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import CreateIntern from '../components/CreateIntern';
import CreateTl from '../components/CreateTl';
import ForwardedRequestsList from '../components/ForwardedRequestsList';
import TeamLeadersSection from '../components/TeamLeadersSection';
import CertificatesOverview from '../components/CertificatesOverview';
import AdminInternsList from '../components/AdminInternsList';
import RetentionPolicyForm from '../components/RetentionPolicyForm';
import ArchivedInternsList from '../components/ArchivedInternsList';
import AuditLogsPage from './AuditLogsPage';
import { getOverviewStats } from '../services/admin.service';
import ThemeToggle from '../../shared/components/ThemeToggle';
import {
  IconBrandLogo,
  IconLogout,
  IconGrid,
  IconUsers,
  IconBriefcase,
  IconUserPlus,
  IconUserCheck,
  IconFileText,
  IconAward,
  IconSettings,
  IconArchive,
  IconTrendingUp,
  IconActivity,
  IconChevronRight,
  IconShield
} from '../../shared/components/Icons';
import './AdminDashboard.css';

const AdminDashboard = ({ theme, onToggleTheme, initialView }) => {
  const { user, handleLogout } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState(initialView || 'overview');

  const [stats, setStats] = useState({
    totalInterns: 0,
    ongoingInterns: 0,
    completedInterns: 0,
    archivedInterns: 0,
    teamLeadersCount: 0,
    issuedCertificatesCount: 0,
    pendingRequestsCount: 0,
    completionRate: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const res = await getOverviewStats();
        if (isMounted && res?.stats) {
          setStats(res.stats);
        }
      } catch (err) {
        console.error('Failed to load overview stats:', err);
      } finally {
        if (isMounted) setStatsLoading(false);
      }
    };
    fetchStats();
    return () => { isMounted = false; };
  }, [activeView]);

  const initials = (user?.fullName || 'Admin')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const logout = () => {
    handleLogout();
    navigate('/login');
  };

  const viewTitle = {
    overview: 'Administration Overview',
    interns: 'Intern Management',
    teamleaders: 'Team Leader Management',
    intern: 'Create an Intern Account',
    teamleader: 'Create a Team Leader Account',
    certificates: 'Issued Certificates',
    retention: 'Retention & Lifecycle Policy',
    archived_interns: 'Archived Interns Audit',
    requests: 'Certificate Requests',
    audit_logs: 'System Audit Logs & Governance',
  };

  const viewDesc = {
    overview: 'Comprehensive governance, candidate telemetry, and automated lifecycle compliance.',
    interns: 'View, edit, and assign/reassign all interns across all Team Leaders.',
    teamleaders: 'View, search, and manage all Team Leaders and their assigned intern teams.',
    requests: 'Finalize certificate requests forwarded by Team Leaders.',
    certificates: 'Audit and manage all generated certificates across the portal.',
    retention: 'Configure the automated lifecycle and retention for intern accounts.',
    archived_interns: 'View and restore intern accounts that have been archived.',
    intern: 'Complete the details below to create a new intern portal account.',
    teamleader: 'Complete the details below to create a new Team Leader account.',
    audit_logs: 'Tamper-evident activity logs across authentication, certificate workflows, and retention tasks.',
  };

  return (
    <div className="admin-dashboard-shell">
      {/* ── TOP BAR ── */}
      <header className="admin-topbar">
        <div className="admin-brand">
          <span className="admin-brand-icon">
            <IconBrandLogo size={18} color="#fff" />
          </span>
          uptoskills
        </div>

        <div className="admin-topbar-right">
          <div className="admin-search-hint" role="button" tabIndex={0} aria-label="Search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            Search...
            <span className="admin-search-kbd">⌘K</span>
          </div>

          {/* Theme toggle embedded in topbar */}
          {onToggleTheme && (
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          )}

          <div className="admin-topbar-divider" />

          <div className="admin-topbar-user">
            <div className="admin-user-info">
              <strong>{user?.fullName || 'Administrator'}</strong>
              <small>{user?.email || ''}</small>
            </div>
            <div className="admin-avatar"><span>{initials}</span></div>
          </div>

          <button className="admin-logout" onClick={logout} title="Sign out">
            <IconLogout size={14} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* ── SIDEBAR ── */}
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <p className="admin-sidebar-label">Overview</p>
        <nav className="admin-sidebar-nav">
          <button className={`admin-nav-item ${activeView === 'overview' ? 'active' : ''}`} onClick={() => setActiveView('overview')}>
            <span className="admin-nav-icon"><IconGrid size={16} /></span>
            Dashboard
          </button>
        </nav>

        <p className="admin-sidebar-label">People</p>
        <nav className="admin-sidebar-nav">
          <button className={`admin-nav-item ${activeView === 'interns' ? 'active' : ''}`} onClick={() => setActiveView('interns')}>
            <span className="admin-nav-icon"><IconUsers size={16} /></span>
            Intern Management
          </button>
          <button className={`admin-nav-item ${activeView === 'teamleaders' ? 'active' : ''}`} onClick={() => setActiveView('teamleaders')}>
            <span className="admin-nav-icon"><IconBriefcase size={16} /></span>
            Team Leaders
          </button>
          <button className={`admin-nav-item ${activeView === 'intern' ? 'active' : ''}`} onClick={() => setActiveView('intern')}>
            <span className="admin-nav-icon"><IconUserPlus size={16} /></span>
            Create Intern
          </button>
          <button className={`admin-nav-item ${activeView === 'teamleader' ? 'active' : ''}`} onClick={() => setActiveView('teamleader')}>
            <span className="admin-nav-icon"><IconUserCheck size={16} /></span>
            Create Team Leader
          </button>
        </nav>

        <p className="admin-sidebar-label">Certificates</p>
        <nav className="admin-sidebar-nav">
          <button className={`admin-nav-item ${activeView === 'requests' ? 'active' : ''}`} onClick={() => setActiveView('requests')}>
            <span className="admin-nav-icon"><IconFileText size={16} /></span>
            Cert Requests
          </button>
          <button className={`admin-nav-item ${activeView === 'certificates' ? 'active' : ''}`} onClick={() => setActiveView('certificates')}>
            <span className="admin-nav-icon"><IconAward size={16} /></span>
            Issued Certs
          </button>
        </nav>

        <p className="admin-sidebar-label">Settings & Governance</p>
        <nav className="admin-sidebar-nav">
          <button className={`admin-nav-item ${activeView === 'audit_logs' ? 'active' : ''}`} onClick={() => setActiveView('audit_logs')}>
            <span className="admin-nav-icon"><IconShield size={16} /></span>
            Audit Logs
          </button>
          <button className={`admin-nav-item ${activeView === 'retention' ? 'active' : ''}`} onClick={() => setActiveView('retention')}>
            <span className="admin-nav-icon"><IconSettings size={16} /></span>
            Retention Policy
          </button>
          <button className={`admin-nav-item ${activeView === 'archived_interns' ? 'active' : ''}`} onClick={() => setActiveView('archived_interns')}>
            <span className="admin-nav-icon"><IconArchive size={16} /></span>
            Archived Interns
          </button>
        </nav>

        <div className="admin-sidebar-note">
          <span></span>
          Admin access active
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="admin-dashboard-main">
        <header className="admin-page-header">
          <p className="admin-eyebrow">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>
            Enterprise Administration
          </p>
          <h1>{viewTitle[activeView] || 'Administration'}</h1>
          <p>{viewDesc[activeView] || ''}</p>
        </header>

        {activeView === 'overview' ? (
          <>
            {/* METRICS GRID */}
            <section className="admin-stats-grid" aria-label="Key Performance Indicators">
              <div className="admin-stat-card">
                <div className="admin-stat-top">
                  <span className="admin-stat-label">Total Interns</span>
                  <span className="admin-stat-badge cobalt">
                    <IconTrendingUp size={11} /> {stats.ongoingInterns} active
                  </span>
                </div>
                <div className="admin-stat-value">
                  {statsLoading ? '—' : stats.totalInterns}
                </div>
                <div className="admin-stat-chart">
                  <div className="admin-bar-group">
                    <div className="admin-bar cobalt" style={{ height: stats.totalInterns > 0 ? `${Math.min(100, Math.max(15, (stats.ongoingInterns / stats.totalInterns) * 100))}%` : '15%' }}></div>
                    <small>Active</small>
                  </div>
                  <div className="admin-bar-group">
                    <div className="admin-bar cobalt" style={{ height: stats.totalInterns > 0 ? `${Math.min(100, Math.max(15, (stats.completedInterns / stats.totalInterns) * 100))}%` : '15%' }}></div>
                    <small>Done</small>
                  </div>
                  <div className="admin-bar-group">
                    <div className="admin-bar cobalt" style={{ height: stats.archivedInterns > 0 ? `${Math.min(100, Math.max(10, (stats.archivedInterns / (stats.totalInterns || 1)) * 100))}%` : '10%' }}></div>
                    <small>Arch</small>
                  </div>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-top">
                  <span className="admin-stat-label">Completion Rate</span>
                  <span className="admin-stat-badge coral">
                    <IconActivity size={11} /> {stats.completedInterns} finished
                  </span>
                </div>
                <div className="admin-stat-value">
                  {statsLoading ? '—' : `${stats.completionRate}%`}
                </div>
                <div className="admin-stat-chart">
                  <div className="admin-bar-group">
                    <div className="admin-bar coral" style={{ height: `${Math.max(15, stats.completionRate)}%` }}></div>
                    <small>Rate</small>
                  </div>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-top">
                  <span className="admin-stat-label">Team Leaders</span>
                  <span className="admin-stat-badge cobalt">
                    <IconBriefcase size={11} /> Leads
                  </span>
                </div>
                <div className="admin-stat-value">
                  {statsLoading ? '—' : stats.teamLeadersCount}
                </div>
                <div className="admin-stat-chart" style={{ alignItems: 'center' }}>
                  <svg width="100%" height="32" viewBox="0 0 160 32" fill="none">
                    <path d="M0 24C30 20 45 6 80 18C115 30 130 8 160 12" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
                  </svg>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-top">
                  <span className="admin-stat-label">Issued Certs</span>
                  <span className="admin-stat-badge coral">
                    <IconAward size={11} /> {stats.pendingRequestsCount} pending
                  </span>
                </div>
                <div className="admin-stat-value">
                  {statsLoading ? '—' : stats.issuedCertificatesCount}
                </div>
                <div className="admin-stat-chart" style={{ alignItems: 'center' }}>
                  <svg width="100%" height="32" viewBox="0 0 160 32" fill="none">
                    <path d="M0 26C25 18 55 24 90 12C125 0 140 18 160 8" stroke="var(--coral)" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
                  </svg>
                </div>
              </div>
            </section>

            {/* QUICK ACTIONS */}
            <div className="admin-section-title">
              <span>Quick Actions</span>
              <small style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '500' }}>Instant administrative workflows</small>
            </div>

            <section className="admin-quick-cards-grid" aria-label="Quick Administrative Actions">
              <button className="admin-action-card primary-cobalt" onClick={() => setActiveView('intern')}>
                <div className="action-card-header">
                  <span className="action-icon-wrap"><IconUserPlus size={16} /></span>
                  <IconChevronRight size={14} />
                </div>
                <div>
                  <h3>Add New Intern</h3>
                  <p>Register, onboard & assign to Team Leaders</p>
                </div>
              </button>

              <button className="admin-action-card primary-coral" onClick={() => setActiveView('teamleader')}>
                <div className="action-card-header">
                  <span className="action-icon-wrap"><IconUserCheck size={16} /></span>
                  <IconChevronRight size={14} />
                </div>
                <div>
                  <h3>Create Team Leader</h3>
                  <p>Add management leads & assign cohorts</p>
                </div>
              </button>

              <button className="admin-action-card outline-cobalt" onClick={() => setActiveView('retention')}>
                <div className="action-card-header">
                  <span className="action-icon-wrap"><IconSettings size={16} /></span>
                  <IconChevronRight size={14} color="var(--text-muted)" />
                </div>
                <div>
                  <h3>Retention Policy</h3>
                  <p>Configure automated grace & purge days</p>
                </div>
              </button>

              <button className="admin-action-card outline-coral" onClick={() => setActiveView('archived_interns')}>
                <div className="action-card-header">
                  <span className="action-icon-wrap coral"><IconArchive size={16} /></span>
                  <IconChevronRight size={14} color="var(--text-muted)" />
                </div>
                <div>
                  <h3>Archived Interns</h3>
                  <p>Audit and restore deactivated accounts</p>
                </div>
              </button>
            </section>

            {/* PROFILE SUMMARY */}
            <section className="admin-profile-card" aria-label="Administrator profile">
              <div className="admin-profile-heading">
                <div className="admin-profile-avatar"><span>{initials}</span></div>
                <div>
                  <p className="admin-eyebrow">Active Administrator</p>
                  <h2>{user?.fullName || 'Administrator'}</h2>
                  <p>{user?.email || 'Loading profile...'}</p>
                </div>
              </div>
              <div className="admin-profile-details">
                <div>
                  <span>Security Role</span>
                  <strong>{user?.role || 'admin'}</strong>
                </div>
                <div>
                  <span>Contact Mobile</span>
                  <strong className="mono">{user?.mobileNo || 'Not provided'}</strong>
                </div>
                <div>
                  <span>Governance Active Since</span>
                  <strong>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</strong>
                </div>
              </div>
            </section>

            <AdminInternsList />
          </>
        ) : activeView === 'interns' ? (
          <AdminInternsList />
        ) : activeView === 'teamleaders' ? (
          <TeamLeadersSection />
        ) : activeView === 'intern' ? (
          <CreateIntern />
        ) : activeView === 'teamleader' ? (
          <CreateTl />
        ) : activeView === 'certificates' ? (
          <CertificatesOverview />
        ) : activeView === 'retention' ? (
          <RetentionPolicyForm />
        ) : activeView === 'archived_interns' ? (
          <ArchivedInternsList />
        ) : activeView === 'audit_logs' ? (
          <AuditLogsPage />
        ) : (
          <ForwardedRequestsList />
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;