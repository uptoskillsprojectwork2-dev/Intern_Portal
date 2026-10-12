import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { IconBrandLogo, IconMail, IconLock, IconEye, IconEyeOff, IconCheck, IconClose } from '../../shared/components/Icons';
import '../../../app/App.css';

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

export default function Login() {
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState(null);

  const { handleLogin } = useAuth();
  const navigate = useNavigate();

  const notify = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const isEmailValid   = touched.email    && !errors.email    && values.email.trim()    && validateEmail(values.email);
  const isEmailInvalid = touched.email    && errors.email;
  const isPasswordValid   = touched.password && !errors.password && values.password.trim().length > 0;
  const isPasswordInvalid = touched.password && errors.password;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (name === 'email') {
      if (!value.trim())            setErrors((p) => ({ ...p, email: 'Email is required.' }));
      else if (!validateEmail(value)) setErrors((p) => ({ ...p, email: 'Please enter a valid email address.' }));
      else                            setErrors((p) => { const n = { ...p }; delete n.email; return n; });
    }
    if (name === 'password') {
      if (!value) setErrors((p) => ({ ...p, password: 'Password is required.' }));
      else        setErrors((p) => { const n = { ...p }; delete n.password; return n; });
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await handleLogin(values.email.trim().toLowerCase(), values.password);
      setLoading(false);
      notify('success', 'Logged in successfully!');
      const userData = data.user || data;
      navigate(`/${userData.role}/dashboard`);
    } catch (error) {
      console.error(error);
      setLoading(false);
      notify('error', error.message || 'Invalid email or password.');
    }
  };

  return (
    <div className="auth-page">
      {notification && (
        <div className={`notification ${notification.type}`}>
          <span className="notification-icon">
            {notification.type === 'error' ? <IconClose size={13} /> : <IconCheck size={13} />}
          </span>
          <span>{notification.message}</span>
          <button className="close-btn" onClick={() => setNotification(null)} aria-label="Close notification">
            <IconClose size={12} />
          </button>
        </div>
      )}

      {/* ── LEFT HERO ── */}
      <div className="brand-panel">
        {/* Grid texture overlay */}
        <div className="brand-panel-grid" aria-hidden="true" />

        {/* Brand */}
        <div className="brand">
          <span className="brand-icon">
            <IconBrandLogo size={20} color="#fff" />
          </span>
          uptoskills
        </div>

        {/* Hero content */}
        <div className="brand-content">
          <div className="login-badge-pill">
            <span className="login-badge-dot" />
            Enterprise Talent Platform
          </div>

          <h1>
            Step up your{' '}
            <span className="grad-word">career</span>
          </h1>

          <p>
            Sign in to manage your professional journey, oversee interns, and accelerate verified certifications.
          </p>

          {/* Floating glass preview card */}
          <div className="login-preview-card" aria-hidden="true">
            <div className="login-preview-stats">
              <div className="login-preview-stat">
                <div className="login-preview-stat-val">—</div>
                <div className="login-preview-stat-label">Interns</div>
              </div>
              <div className="login-preview-stat">
                <div className="login-preview-stat-val">—</div>
                <div className="login-preview-stat-label">Certs</div>
              </div>
              <div className="login-preview-stat">
                <div className="login-preview-stat-val">—%</div>
                <div className="login-preview-stat-label">Rate</div>
              </div>
            </div>
            <div className="login-preview-ring">
              <svg className="ring-svg" width="44" height="44" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="4" />
                <circle cx="22" cy="22" r="18" fill="none" stroke="url(#rg)" strokeWidth="4"
                  strokeDasharray="113" strokeDashoffset="28" strokeLinecap="round"
                  transform="rotate(-90 22 22)" />
                <defs>
                  <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#06B6D4" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="login-preview-ring-info">
                <strong>Lifecycle Engine</strong>
                <span>Auto-retention & archiving active</span>
              </div>
            </div>
          </div>

          {/* Feature chips */}
          <div className="login-chips" style={{ marginTop: '28px' }}>
            <div className="login-chip">
              <div className="login-chip-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div className="login-chip-text">
                <strong>Verified Certificates</strong>
                <span>Auto-generated & PDF-rendered</span>
              </div>
            </div>
            <div className="login-chip">
              <div className="login-chip-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div className="login-chip-text">
                <strong>Team Management</strong>
                <span>Assign interns to Team Leaders</span>
              </div>
            </div>
            <div className="login-chip">
              <div className="login-chip-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <div className="login-chip-text">
                <strong>Live Analytics</strong>
                <span>Telemetry & retention policies</span>
              </div>
            </div>
          </div>
        </div>

        <small>Copyright © 2026 UptoSkills · All rights reserved</small>
      </div>

      {/* ── RIGHT FORM ── */}
      <div className="form-side">
        <div className="auth-card">
          <div className="auth-card-header">
            <span className="auth-secure-badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Secure Access
            </span>
            <h2>Welcome back</h2>
            <p className="sub">Sign in to access your administration dashboard.</p>
          </div>

          <form onSubmit={submit} noValidate>
            <label className="field">
              <b>Email Address</b>
              <div className={`input-wrap ${isEmailInvalid ? 'invalid' : isEmailValid ? 'valid' : ''}`}>
                <span className="input-icon">
                  <IconMail size={16} />
                </span>
                <input
                  type="email"
                  name="email"
                  placeholder="admin@uptoskills.com"
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="email"
                />
              </div>
              {isEmailInvalid && <span className="field-error">{errors.email}</span>}
            </label>

            <label className="field">
              <b>Password</b>
              <div className={`input-wrap ${isPasswordInvalid ? 'invalid' : isPasswordValid ? 'valid' : ''}`}>
                <span className="input-icon">
                  <IconLock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="eye"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
              {isPasswordInvalid && <span className="field-error">{errors.password}</span>}
            </label>

            <div className="auth-forgot-row">
              <Link className="auth-forgot-link" to="/forgot-password">Forgot password?</Link>
            </div>

            <button
              type="submit"
              className="primary"
              disabled={loading}
              style={{ marginTop: '6px' }}
            >
              {loading ? <span className="spinner" /> : 'Sign in to Dashboard'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}