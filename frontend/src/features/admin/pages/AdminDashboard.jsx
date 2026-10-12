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
import { getOverviewStats } from '../services/admin.service';
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
  IconChevronRight
} from '../../shared/components/Icons';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, handleLogout } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('overview');

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

  return (
    <div className="admin-dashboard-shell">
      <header className="admin-topbar">
        <div className="admin-brand">
          <span className="admin-brand-icon">
            <IconBrandLogo size={20} color="#fff" />
          </span>
          <strong>uptoskills</strong>
        </div>
        <div className="admin-topbar-user">
          <div className="admin-avatar">{initials}</div>
          <div>
            <strong>{user?.fullName || 'Administrator'}</strong>
            <small>{user?.email || 'Loading profile...'}</small>
          </div>
          <button className="admin-logout" onClick={logout} title="Sign out">
            <IconLogout size={16} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <aside className="admin-sidebar" aria-label="Admin navigation">
        <p className="admin-sidebar-label">Administration</p>
        <nav className="admin-sidebar-nav">
          <button className={`admin-nav-item ${activeView === 'overview' ? 'active' : ''}`} onClick={() => setActiveView('overview')}>
            <span className="admin-nav-icon"><IconGrid size={18} /></span>
            Overview
          </button>
          <button className={`admin-nav-item ${activeView === 'interns' ? 'active' : ''}`} onClick={() => setActiveView('interns')}>
            <span className="admin-nav-icon"><IconUsers size={18} /></span>
            Intern Management
          </button>
          <button className={`admin-nav-item ${activeView === 'teamleaders' ? 'active' : ''}`} onClick={() => setActiveView('teamleaders')}>
            <span className="admin-nav-icon"><IconBriefcase size={18} /></span>
            Team Leaders
          </button>
          <button className={`admin-nav-item ${activeView === 'intern' ? 'active' : ''}`} onClick={() => setActiveView('intern')}>
            <span className="admin-nav-icon"><IconUserPlus size={18} /></span>
            Create Intern
          </button>
          <button className={`admin-nav-item ${activeView === 'teamleader' ? 'active' : ''}`} onClick={() => setActiveView('teamleader')}>
            <span className="admin-nav-icon"><IconUserCheck size={18} /></span>
            Create Team Leader
          </button>
          <button className={`admin-nav-item ${activeView === 'requests' ? 'active' : ''}`} onClick={() => setActiveView('requests')}>
            <span className="admin-nav-icon"><IconFileText size={18} /></span>
            Certificate Requests
          </button>
          <button className={`admin-nav-item ${activeView === 'certificates' ? 'active' : ''}`} onClick={() => setActiveView('certificates')}>
            <span className="admin-nav-icon"><IconAward size={18} /></span>
            Issued Certificates
          </button>
          <button className={`admin-nav-item ${activeView === 'retention' ? 'active' : ''}`} onClick={() => setActiveView('retention')}>
            <span className="admin-nav-icon"><IconSettings size={18} /></span>
            Retention Policy
          </button>
          <button className={`admin-nav-item ${activeView === 'archived_interns' ? 'active' : ''}`} onClick={() => setActiveView('archived_interns')}>
            <span className="admin-nav-icon"><IconArchive size={18} /></span>
            Archived Interns
          </button>
        </nav>
        <div className="admin-sidebar-note">
          <span></span>
          Admin access active
        </div>
      </aside>

      <main className="admin-dashboard-main">
        <header className="admin-page-header">
          <p className="admin-eyebrow">Enterprise Administration</p>
          <h1>
            {activeView === 'overview'
              ? 'Administration Overview'
              : activeView === 'interns'
              ? 'Intern Management'
              : activeView === 'teamleaders'
              ? 'Team Leader Management'
              : activeView === 'intern'
              ? 'Create an Intern Account'
              : activeView === 'teamleader'
              ? 'Create a Team Leader Account'
              : activeView === 'certificates'
              ? 'Issued Certificates'
              : activeView === 'retention'
              ? 'Retention & Lifecycle Policy'
              : activeView === 'archived_interns'
              ? 'Archived Interns Audit'
              : 'Certificate Requests'}
          </h1>
          <p>
            {activeView === 'overview'
              ? 'Comprehensive governance, candidate telemetry, and automated lifecycle compliance.'
              : activeView === 'interns'
              ? 'View, edit, and assign/reassign all interns across all Team Leaders.'
              : activeView === 'teamleaders'
              ? 'View, search, and manage all Team Leaders and their assigned intern teams.'
              : activeView === 'requests'
              ? 'Finalize certificate requests forwarded by Team Leaders.'
              : activeView === 'certificates'
              ? 'Audit and manage all generated certificates across the portal.'
              : activeView === 'retention'
              ? 'Configure the automated lifecycle and retention for intern accounts.'
              : activeView === 'archived_interns'
              ? 'View and restore intern accounts that have been archived.'
              : 'Complete the details below to create a new portal account.'}
          </p>
        </header>

        {activeView === 'overview' ? (
          <>
            {/* --- METRICS TELEMETRY GRID --- */}
            <section className="admin-stats-grid" aria-label="Key Performance Indicators">
              <div className="admin-stat-card">
                <div className="admin-stat-top">
                  <span className="admin-stat-label">Total Interns</span>
                  <span className="admin-stat-badge cobalt">
                    <IconTrendingUp size={12} /> {stats.ongoingInterns} active
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
                    <div className="admin-bar cobalt" style={{ height: stats.archivedInterns > 0 ? `${Math.min(100, Math.max(15, (stats.archivedInterns / (stats.totalInterns || 1)) * 100))}%` : '15%' }}></div>
                    <small>Arch</small>
                  </div>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-top">
                  <span className="admin-stat-label">Completion Rate</span>
                  <span className="admin-stat-badge coral">
                    <IconActivity size={12} /> {stats.completedInterns} finished
                  </span>
                </div>
                <div className="admin-stat-value">
                  {statsLoading ? '—' : `${stats.completionRate}%`}
                </div>
                <div className="admin-stat-chart">
                  <div className="admin-bar-group">
                    <div className="admin-bar coral" style={{ height: `${Math.max(15, stats.completionRate)}%` }}></div>
                    <small>Cohort Rate</small>
                  </div>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-top">
                  <span className="admin-stat-label">Team Leaders</span>
                  <span className="admin-stat-badge cobalt">
                    <IconBriefcase size={12} /> Leads
                  </span>
                </div>
                <div className="admin-stat-value">
                  {statsLoading ? '—' : stats.teamLeadersCount}
                </div>
                <div className="admin-stat-chart" style={{ alignItems: 'center' }}>
                  <svg width="100%" height="32" viewBox="0 0 160 32" fill="none">
                    <path d="M0 24C30 20 45 6 80 18C115 30 130 8 160 12" stroke="var(--cobalt)" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-top">
                  <span className="admin-stat-label">Issued Certs</span>
                  <span className="admin-stat-badge coral">
                    <IconAward size={12} /> {stats.pendingRequestsCount} req
                  </span>
                </div>
                <div className="admin-stat-value">
                  {statsLoading ? '—' : stats.issuedCertificatesCount}
                </div>
                <div className="admin-stat-chart" style={{ alignItems: 'center' }}>
                  <svg width="100%" height="32" viewBox="0 0 160 32" fill="none">
                    <path d="M0 26C25 18 55 24 90 12C125 0 140 18 160 8" stroke="var(--coral)" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </section>

            {/* --- QUICK ACTIONS CARDS --- */}
            <div className="admin-section-title">
              <span>Quick Actions</span>
              <small style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: '600' }}>Instant administrative workflows</small>
            </div>

            <section className="admin-quick-cards-grid" aria-label="Quick Administrative Actions">
              <button className="admin-action-card primary-cobalt" onClick={() => setActiveView('intern')}>
                <div className="action-card-header">
                  <span className="action-icon-wrap"><IconUserPlus size={18} /></span>
                  <IconChevronRight size={16} />
                </div>
                <div>
                  <h3>Add New Intern</h3>
                  <p>Register, onboard & assign to Team Leaders</p>
                </div>
              </button>

              <button className="admin-action-card primary-coral" onClick={() => setActiveView('teamleader')}>
                <div className="action-card-header">
                  <span className="action-icon-wrap"><IconUserCheck size={18} /></span>
                  <IconChevronRight size={16} />
                </div>
                <div>
                  <h3>Create Team Leader</h3>
                  <p>Add management leads & assign cohorts</p>
                </div>
              </button>

              <button className="admin-action-card outline-cobalt" onClick={() => setActiveView('retention')}>
                <div className="action-card-header">
                  <span className="action-icon-wrap"><IconSettings size={18} /></span>
                  <IconChevronRight size={16} color="var(--muted)" />
                </div>
                <div>
                  <h3>Retention Policy</h3>
                  <p>Configure automated grace & purge days</p>
                </div>
              </button>

              <button className="admin-action-card outline-coral" onClick={() => setActiveView('archived_interns')}>
                <div className="action-card-header">
                  <span className="action-icon-wrap coral"><IconArchive size={18} /></span>
                  <IconChevronRight size={16} color="var(--muted)" />
                </div>
                <div>
                  <h3>Archived Interns</h3>
                  <p>Audit and restore deactivated accounts</p>
                </div>
              </button>
            </section>

            {/* --- PROFILE SUMMARY PANEL --- */}
            <section className="admin-profile-card" aria-label="Administrator profile">
              <div className="admin-profile-heading">
                <div className="admin-profile-avatar">{initials}</div>
                <div>
                  <p className="admin-eyebrow">ACTIVE ADMINISTRATOR</p>
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
                  <strong>{user?.mobileNo || 'Not provided'}</strong>
                </div>
                <div>
                  <span>Governance Active Since</span>
                  <strong>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</strong>
                </div>
              </div>
            </section>

            {/* --- ACTIVE INTERNS TABLE --- */}
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
        ) : (
          <ForwardedRequestsList />
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;