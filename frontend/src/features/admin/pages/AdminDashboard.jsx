import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import CreateIntern from '../components/CreateIntern';
import CreateTl from '../components/CreateTl';
import ForwardedRequestsList from '../components/ForwardedRequestsList';
import TeamLeadersSection from '../components/TeamLeadersSection';
import CertificatesOverview from '../components/CertificatesOverview';
import AdminInternsList from '../components/AdminInternsList';
import TemplateForm from '../components/TemplateForm';
import RetentionPolicyForm from '../components/RetentionPolicyForm';
import ArchivedInternsList from '../components/ArchivedInternsList';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, handleLogout } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('overview');

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
        <div className="admin-brand"><span className="admin-brand-icon">UP</span><strong>uptoskills</strong></div>
        <div className="admin-topbar-user">
          <div className="admin-avatar">{initials}</div>
          <div><strong>{user?.fullName || 'Administrator'}</strong><small>{user?.email || 'Loading profile...'}</small></div>
          <button className="admin-logout" onClick={logout} title="Sign out"><span>↩</span> Logout</button>
        </div>
      </header>

      <aside className="admin-sidebar" aria-label="Admin navigation">
        <p className="admin-sidebar-label">Workspace</p>
        <nav className="admin-sidebar-nav">
          <button className={`admin-nav-item ${activeView === 'overview' ? 'active' : ''}`} onClick={() => setActiveView('overview')}><span>▦</span> Overview</button>
          <button className={`admin-nav-item ${activeView === 'interns' ? 'active' : ''}`} onClick={() => setActiveView('interns')}><span>👥</span> Intern Management</button>
          <button className={`admin-nav-item ${activeView === 'archived' ? 'active' : ''}`} onClick={() => setActiveView('archived')}><span>📂</span> Archived Interns</button>
          <button className={`admin-nav-item ${activeView === 'teamleaders' ? 'active' : ''}`} onClick={() => setActiveView('teamleaders')}><span>👔</span> Team Leaders</button>
          <button className={`admin-nav-item ${activeView === 'intern' ? 'active' : ''}`} onClick={() => setActiveView('intern')}><span>＋</span> Create Intern</button>
          <button className={`admin-nav-item ${activeView === 'teamleader' ? 'active' : ''}`} onClick={() => setActiveView('teamleader')}><span>♙</span> Create Team Leader</button>
          <button className={`admin-nav-item ${activeView === 'templates' ? 'active' : ''}`} onClick={() => setActiveView('templates')}><span>🎨</span> Template Editor</button>
          <button className={`admin-nav-item ${activeView === 'retention' ? 'active' : ''}`} onClick={() => setActiveView('retention')}><span>⚙</span> Retention Policy</button>
          <button className={`admin-nav-item ${activeView === 'requests' ? 'active' : ''}`} onClick={() => setActiveView('requests')}><span>▤</span> Certificate Requests</button>
          <button className={`admin-nav-item ${activeView === 'certificates' ? 'active' : ''}`} onClick={() => setActiveView('certificates')}><span>📜</span> Issued Certificates</button>
          <button className={`admin-nav-item ${activeView === 'analytics' ? 'active' : ''}`} onClick={() => navigate('/admin/analytics')}><span>📊</span> Analytics</button>
        </nav>
        <div className="admin-sidebar-note"><span>●</span> Admin access enabled</div>
      </aside>

      <main className="admin-dashboard-main">
        <header className="admin-page-header">
          <p className="admin-eyebrow">ADMINISTRATION</p>
          <h1>
            {activeView === 'overview'
              ? 'Welcome back'
              : activeView === 'interns'
              ? 'Intern Management'
              : activeView === 'archived'
              ? 'Archived Intern Accounts'
              : activeView === 'teamleaders'
              ? 'Team Leader Management'
              : activeView === 'intern'
              ? 'Create an intern'
              : activeView === 'teamleader'
              ? 'Create a team leader'
              : activeView === 'templates'
              ? 'Certificate Template Designer'
              : activeView === 'retention'
              ? 'Retention & Archival Policy'
              : activeView === 'certificates'
              ? 'Issued certificates'
              : 'Certificate requests'}
          </h1>
          <p>
            {activeView === 'overview'
              ? 'Manage your portal accounts from one secure workspace.'
              : activeView === 'interns'
              ? 'View, edit, and assign/reassign all interns across all Team Leaders.'
              : activeView === 'archived'
              ? 'Review archived intern accounts and restore them before automated data purge.'
              : activeView === 'teamleaders'
              ? 'View, search, and manage all Team Leaders and their assigned intern teams.'
              : activeView === 'templates'
              ? 'Visually edit master certificate HTML templates using GrapesJS visual editor.'
              : activeView === 'retention'
              ? 'Configure grace and purge timelines for automated account lifecycle management.'
              : activeView === 'requests'
              ? 'Finalize certificate requests forwarded by Team Leaders.'
              : activeView === 'certificates'
              ? 'Audit and manage all generated certificates across the portal.'
              : 'Complete the details below to create a new portal account.'}
          </p>
        </header>

        {activeView === 'overview' ? (
          <>
            <section className="admin-profile-card" aria-label="Administrator profile">
              <div className="admin-profile-heading"><div className="admin-profile-avatar">{initials}</div><div><p className="admin-eyebrow">YOUR PROFILE</p><h2>{user?.fullName || 'Administrator'}</h2><p>{user?.email || 'Loading profile...'}</p></div></div>
              <div className="admin-profile-details">
                <div><span>Role</span><strong>{user?.role || 'admin'}</strong></div>
                <div><span>Mobile number</span><strong>{user?.mobileNo || 'Not provided'}</strong></div>
                <div><span>Member since</span><strong>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</strong></div>
              </div>
              <div className="admin-quick-actions">
                <button onClick={() => setActiveView('interns')}><span>👥</span><strong>Intern Management</strong><small>Manage interns & TL assignments</small></button>
                <button onClick={() => setActiveView('templates')}><span>🎨</span><strong>Template Editor</strong><small>Visual GrapesJS certificate editor</small></button>
                <button onClick={() => setActiveView('retention')}><span>⚙</span><strong>Retention Policy</strong><small>Configure grace and purge days</small></button>
                <button onClick={() => setActiveView('archived')}><span>📂</span><strong>Archived Interns</strong><small>Review & restore archived accounts</small></button>
              </div>
            </section>
            <AdminInternsList />
          </>
        ) : activeView === 'interns' ? (
          <AdminInternsList />
        ) : activeView === 'archived' ? (
          <ArchivedInternsList />
        ) : activeView === 'teamleaders' ? (
          <TeamLeadersSection />
        ) : activeView === 'intern' ? (
          <CreateIntern />
        ) : activeView === 'teamleader' ? (
          <CreateTl />
        ) : activeView === 'templates' ? (
          <TemplateForm />
        ) : activeView === 'retention' ? (
          <RetentionPolicyForm />
        ) : activeView === 'certificates' ? (
          <CertificatesOverview />
        ) : (
          <ForwardedRequestsList />
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;