import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIntern } from '../hooks/useIntern';
import { useAuth } from '../../auth/hooks/useAuth';
import { updateProfile } from '../services/intern.service';
import ChangePasswordForm from '../components/ChangePasswordForm';
import NotificationBell from '../../../shared/components/NotificationBell';
import Toast from '../../../shared/components/Toast';
import './InternDashboard.css';
import './SettingsPage.css';
import '../../../app/App.css';

const getInitials = (name = '') =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function SettingsPage() {
  const { profile, setProfile } = useIntern();
  const { handleLogout } = useAuth();
  const navigate = useNavigate();

  // Mobile editing state
  const [isEditingMobile, setIsEditingMobile] = useState(false);
  const [mobileValue, setMobileValue] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [mobileLoading, setMobileLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (profile?.mobileNo) {
      setMobileValue(profile.mobileNo);
    }
  }, [profile?.mobileNo]);

  const onLogout = () => {
    handleLogout();
    navigate('/login');
  };

  const validateMobile = (val) => {
    const clean = String(val).trim();
    if (!clean) {
      return 'Mobile number is required.';
    }
    if (!/^\d{10}$/.test(clean)) {
      return 'Mobile number must be exactly 10 digits.';
    }
    return '';
  };

  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobileValue(val);
    if (mobileError) {
      setMobileError(validateMobile(val));
    }
  };

  const handleSaveMobile = async (e) => {
    e.preventDefault();
    const err = validateMobile(mobileValue);
    if (err) {
      setMobileError(err);
      return;
    }

    setMobileLoading(true);
    try {
      const res = await updateProfile({ mobileNo: mobileValue.trim() });
      setToast({ type: 'success', message: 'Mobile number updated successfully!' });
      setIsEditingMobile(false);
      setMobileError('');

      if (setProfile) {
        setProfile((prev) => ({
          ...prev,
          mobileNo: res.user?.mobileNo || mobileValue.trim(),
        }));
      }
    } catch (error) {
      const msg =
        error.response?.data?.errors?.[0]?.msg ||
        error.response?.data?.message ||
        'Failed to update mobile number.';
      setToast({ type: 'error', message: msg });
    } finally {
      setMobileLoading(false);
    }
  };

  const handleCancelMobile = () => {
    setIsEditingMobile(false);
    setMobileValue(profile?.mobileNo || '');
    setMobileError('');
  };

  const initials = profile ? getInitials(profile.fullName) : '?';

  return (
    <div className="intern-dashboard-page">
      {/* ─── Top Navbar ─── */}
      <nav className="id-navbar">
        <div className="id-brand">
          <span className="id-brand-icon">🚀</span>
          uptoskills
        </div>

        <div className="id-nav-right">
          <NotificationBell role="intern" />
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
            <span>↩</span> Logout
          </button>
        </div>
      </nav>

      {/* ─── Sidebar ─── */}
      <aside className="id-sidebar" role="navigation" aria-label="Sidebar">
        <p className="id-sidebar-label">Main Menu</p>
        <nav className="id-sidebar-nav">
          <button
            id="sidebar-nav-dashboard"
            className="id-nav-item"
            onClick={() => navigate('/intern/dashboard')}
          >
            <span className="id-nav-icon">🏠</span>
            Dashboard
          </button>
          <button
            id="sidebar-nav-certificates"
            className="id-nav-item"
            onClick={() => navigate('/intern/dashboard?view=certificates')}
          >
            <span className="id-nav-icon">📄</span>
            Certificates
          </button>
          <button
            id="sidebar-nav-settings"
            className="id-nav-item active"
            onClick={() => {}}
          >
            <span className="id-nav-icon">⚙️</span>
            Settings
          </button>
        </nav>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="id-main settings-main">
        {toast && (
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        )}

        {/* Page header */}
        <header className="id-page-header">
          <h1 className="id-greeting">
            Account <em>Settings</em> ⚙️
          </h1>
          <p className="id-subtext">
            Manage your personal profile and security credentials.
          </p>
        </header>

        <div className="settings-grid">
          {/* Profile Details & Mobile Editing Section */}
          <section className="settings-card" aria-labelledby="profile-settings-title">
            <div className="settings-card-header">
              <div className="settings-card-icon">👤</div>
              <div>
                <h2 id="profile-settings-title" className="settings-card-title">
                  Profile Information
                </h2>
                <p className="settings-card-subtitle">
                  View your account info and update your contact mobile number.
                </p>
              </div>
            </div>

            <div className="settings-profile-list">
              <div className="settings-profile-item">
                <span className="sp-label">Full Name</span>
                <span className="sp-value">{profile?.fullName || '—'}</span>
              </div>

              <div className="settings-profile-item">
                <span className="sp-label">Email Address</span>
                <span className="sp-value">{profile?.email || '—'}</span>
              </div>

              <div className="settings-profile-item">
                <span className="sp-label">Intern Code</span>
                <span className="sp-value sp-code">{profile?.internCode || '—'}</span>
              </div>

              <div className="settings-profile-item">
                <span className="sp-label">Domain</span>
                <span className="sp-value">{profile?.domain || '—'}</span>
              </div>

              {/* Editable Mobile Number */}
              <div className="settings-profile-item mobile-item">
                <span className="sp-label">Mobile Number</span>
                {!isEditingMobile ? (
                  <div className="sp-mobile-view">
                    <span className="sp-value">{profile?.mobileNo || 'Not provided'}</span>
                    <button
                      type="button"
                      id="edit-mobile-btn"
                      className="sp-edit-btn"
                      onClick={() => {
                        setMobileValue(profile?.mobileNo || '');
                        setIsEditingMobile(true);
                      }}
                      aria-label="Edit mobile number"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSaveMobile} className="sp-mobile-form" noValidate>
                    <div className="sp-mobile-input-wrap">
                      <input
                        id="mobileNo"
                        name="mobileNo"
                        type="tel"
                        value={mobileValue}
                        onChange={handleMobileChange}
                        placeholder="10-digit mobile number"
                        maxLength={10}
                        autoFocus
                        className={mobileError ? 'has-error' : ''}
                        aria-invalid={Boolean(mobileError)}
                        aria-describedby={mobileError ? 'mobile-error-msg' : undefined}
                      />
                      <div className="sp-mobile-btn-group">
                        <button
                          type="submit"
                          id="save-mobile-btn"
                          className="sp-btn save"
                          disabled={mobileLoading}
                        >
                          {mobileLoading ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          id="cancel-mobile-btn"
                          className="sp-btn cancel"
                          onClick={handleCancelMobile}
                          disabled={mobileLoading}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                    {mobileError && (
                      <p id="mobile-error-msg" className="sp-field-error" role="alert">
                        {mobileError}
                      </p>
                    )}
                  </form>
                )}
              </div>

              <div className="settings-profile-item">
                <span className="sp-label">Member Since</span>
                <span className="sp-value">{formatDate(profile?.createdAt)}</span>
              </div>
            </div>
          </section>

          {/* Change Password Form Section */}
          <section className="settings-password-section" aria-label="Security and password settings">
            <ChangePasswordForm />
          </section>
        </div>
      </main>
    </div>
  );
}
