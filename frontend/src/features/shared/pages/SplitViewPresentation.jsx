import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  IconBrandLogo,
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconGrid,
  IconUsers,
  IconActivity,
  IconFileText,
  IconSettings,
  IconAward,
  IconBriefcase,
  IconTrendingUp,
  IconCheck,
  IconChevronRight
} from '../components/Icons';
import './SplitViewPresentation.css';

export default function SplitViewPresentation() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'login' | 'dashboard'
  const [email, setEmail] = useState('sarah.chen@uptoskills.com');
  const [password, setPassword] = useState('SuperSecret2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [loginStatus, setLoginStatus] = useState(null);

  const handleDemoLogin = (e) => {
    e.preventDefault();
    setLoginStatus('Authenticating...');
    setTimeout(() => {
      setLoginStatus('Success! Redirecting to Workspace...');
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 700);
    }, 500);
  };

  return (
    <div className="split-presentation-wrapper">
      {/* Top Header / Presentation Navigation */}
      <div className="split-top-bar">
        <div className="split-pill-badge">
          <span className="dot"></span>
          <span>Dribbble UI/UX Showcase &bull; Enterprise Suite</span>
        </div>

        <div className="split-nav-controls">
          <button
            className={`split-tab-btn ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => setViewMode('split')}
          >
            Split Presentation
          </button>
          <button
            className={`split-tab-btn ${viewMode === 'login' ? 'active' : ''}`}
            onClick={() => setViewMode('login')}
          >
            Login Portal
          </button>
          <button
            className={`split-tab-btn ${viewMode === 'dashboard' ? 'active' : ''}`}
            onClick={() => setViewMode('dashboard')}
          >
            Administration Suite
          </button>
          <Link to="/admin/dashboard" className="split-action-link">
            <span>Launch Live App</span>
            <IconChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* Mac OS Browser Presentation Frame */}
      <div className="split-window-frame">
        <div className="split-window-header">
          <div className="split-traffic-lights">
            <span className="traffic-light red"></span>
            <span className="traffic-light yellow"></span>
            <span className="traffic-light green"></span>
          </div>
          <div className="split-browser-url">
            <IconLock size={12} />
            <span>portal.uptoskills.com/enterprise/suite</span>
          </div>
        </div>

        {/* Content Container */}
        <div
          className="split-content-container"
          style={{
            gridTemplateColumns:
              viewMode === 'login'
                ? '100% 0%'
                : viewMode === 'dashboard'
                ? '0% 100%'
                : '38% 62%'
          }}
        >
          {/* LEFT: AUTHENTICATION / LOGIN VIEW */}
          {(viewMode === 'split' || viewMode === 'login') && (
            <div className="split-login-pane">
              <h1>Step up<br />your career</h1>
              <p className="pane-subtitle">Sign in to manage your professional journey</p>

              <form onSubmit={handleDemoLogin}>
                <div className="split-form-group">
                  <label>Refined email</label>
                  <div className="split-input-box">
                    <IconMail size={18} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                    />
                  </div>
                </div>

                <div className="split-form-group">
                  <label>Password</label>
                  <div className="split-input-box">
                    <IconLock size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="split-login-btn">
                  {loginStatus || 'Log In'}
                </button>
              </form>

              <div className="split-login-footer">
                <a href="#forgot">Forgot password?</a>
                <a href="#signup" className="highlight">Sign up now</a>
              </div>
            </div>
          )}

          {/* RIGHT: ADMINISTRATION DASHBOARD VIEW */}
          {(viewMode === 'split' || viewMode === 'dashboard') && (
            <div className="split-dashboard-pane">
              {/* Sidebar */}
              <aside className="split-dash-sidebar">
                <div className="dash-brand-mark">
                  <div className="dash-logo-icon">
                    <IconBrandLogo size={18} color="#fff" />
                  </div>
                  <strong style={{ fontSize: '15px', color: 'var(--text-strong)' }}>uptoskills</strong>
                </div>

                {['Dashboard', 'Employees', 'Performance', 'Reports', 'Settings', 'Profile'].map((item) => (
                  <button
                    key={item}
                    className={`split-sidebar-btn ${activeNav === item ? 'active' : ''}`}
                    onClick={() => setActiveNav(item)}
                  >
                    {item === 'Dashboard' && <IconGrid size={16} />}
                    {item === 'Employees' && <IconUsers size={16} />}
                    {item === 'Performance' && <IconActivity size={16} />}
                    {item === 'Reports' && <IconFileText size={16} />}
                    {item === 'Settings' && <IconSettings size={16} />}
                    {item === 'Profile' && <IconAward size={16} />}
                    <span>{item}</span>
                  </button>
                ))}
              </aside>

              {/* Main Administration View */}
              <main className="split-dash-main">
                <div className="dash-header-row">
                  <h2>Administration</h2>
                  <div className="dash-header-actions">
                    <button className="dash-icon-btn" aria-label="Search">
                      <IconFileText size={15} />
                    </button>
                    <button className="dash-icon-btn" aria-label="Notifications">
                      <IconActivity size={15} />
                    </button>
                    <div className="dash-profile-pill">
                      <div className="dash-user-avatar">SC</div>
                    </div>
                  </div>
                </div>

                {/* User Snapshot Card */}
                <div className="dash-user-hero">
                  <div className="dash-hero-avatar">
                    <IconBriefcase size={24} />
                  </div>
                  <div className="dash-hero-details">
                    <h4>Welcome Back, Sarah Chen</h4>
                    <p>Lead Talent Administrator &bull; Enterprise Governance Panel</p>
                  </div>
                </div>

                {/* Key Metrics Stats Row */}
                <div className="dash-metrics-row">
                  {/* Total Employees */}
                  <div className="dash-metric-card">
                    <div className="dash-metric-header">
                      <span>Total Employees</span>
                      <span style={{ color: 'var(--cobalt)', fontWeight: '800' }}>+12%</span>
                    </div>
                    <div className="dash-metric-number">1,248</div>
                    <div className="dash-mini-bars">
                      <div className="dash-mini-bar cobalt" style={{ height: '35%' }}></div>
                      <div className="dash-mini-bar cobalt" style={{ height: '65%' }}></div>
                      <div className="dash-mini-bar cobalt" style={{ height: '50%' }}></div>
                      <div className="dash-mini-bar cobalt" style={{ height: '90%' }}></div>
                      <div className="dash-mini-bar cobalt" style={{ height: '70%' }}></div>
                    </div>
                  </div>

                  {/* Performance Score */}
                  <div className="dash-metric-card">
                    <div className="dash-metric-header">
                      <span>Performance Score</span>
                      <span style={{ color: 'var(--coral)', fontWeight: '800' }}>+5%</span>
                    </div>
                    <div className="dash-metric-number">94%</div>
                    <div className="dash-mini-bars">
                      <div className="dash-mini-bar coral" style={{ height: '40%' }}></div>
                      <div className="dash-mini-bar coral" style={{ height: '60%' }}></div>
                      <div className="dash-mini-bar coral" style={{ height: '80%' }}></div>
                      <div className="dash-mini-bar coral" style={{ height: '65%' }}></div>
                      <div className="dash-mini-bar coral" style={{ height: '95%' }}></div>
                    </div>
                  </div>

                  {/* Active Jobs */}
                  <div className="dash-metric-card">
                    <div className="dash-metric-header">
                      <span>Active Jobs</span>
                      <span style={{ color: 'var(--cobalt)', fontWeight: '800' }}>+8%</span>
                    </div>
                    <div className="dash-metric-number">35</div>
                    <div style={{ height: '32px', display: 'flex', alignItems: 'center' }}>
                      <svg width="100%" height="24" viewBox="0 0 100 24" fill="none">
                        <path d="M0 18 C25 15, 50 4, 75 14, 100 6" stroke="var(--cobalt)" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>

                  {/* Certifications */}
                  <div className="dash-metric-card">
                    <div className="dash-metric-header">
                      <span>Certifications</span>
                      <span style={{ color: 'var(--coral)', fontWeight: '800' }}>+15%</span>
                    </div>
                    <div className="dash-metric-number">112</div>
                    <div style={{ height: '32px', display: 'flex', alignItems: 'center' }}>
                      <svg width="100%" height="24" viewBox="0 0 100 24" fill="none">
                        <path d="M0 20 C20 12, 45 22, 70 8, 100 12" stroke="var(--coral)" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Quick Actions Row */}
                <div className="dash-actions-row">
                  <div className="dash-row-title">Quick Actions</div>
                  <div className="dash-actions-btn-group">
                    <button className="action-trigger-btn cobalt-filled" onClick={() => navigate('/admin/dashboard')}>
                      Add New Employee
                    </button>
                    <button className="action-trigger-btn coral-filled" onClick={() => navigate('/admin/dashboard')}>
                      Post Job
                    </button>
                    <button className="action-trigger-btn coral-filled" onClick={() => navigate('/admin/dashboard')}>
                      Create Report
                    </button>
                    <button className="action-trigger-btn coral-filled" onClick={() => navigate('/admin/dashboard')}>
                      View Feedback
                    </button>
                  </div>
                </div>

                {/* Recent Activity Table */}
                <div>
                  <div className="dash-row-title">Recent Activity</div>
                  <div className="dash-table-wrap">
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Title</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: '700' }}>Sarah Chen</td>
                          <td>Enterprise Solutions</td>
                          <td><span className="dash-status-pill success">Verified</span></td>
                          <td><IconChevronRight size={14} color="var(--muted)" /></td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '700' }}>Sarah Parrish</td>
                          <td>Talent Director</td>
                          <td><span className="dash-status-pill success">Active</span></td>
                          <td><IconChevronRight size={14} color="var(--muted)" /></td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '700' }}>Jason Sturen</td>
                          <td>Product Management</td>
                          <td><span className="dash-status-pill coral">Pending</span></td>
                          <td><IconChevronRight size={14} color="var(--muted)" /></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </main>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
