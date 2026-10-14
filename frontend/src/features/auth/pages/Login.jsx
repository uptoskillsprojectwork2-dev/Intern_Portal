import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  IconBrandLogo,
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconCheck,
  IconClose,
  IconTrendingUp,
  IconActivity
} from '../../shared/components/Icons';
import '../../../app/App.css';
import './Login.css';

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
  const [loginError, setLoginError] = useState('');

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
    if (loginError) setLoginError('');

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
    setLoginError('');

    // Mark touched on submit attempt
    setTouched({ email: true, password: true });

    let hasError = false;
    if (!values.email.trim()) {
      setErrors((p) => ({ ...p, email: 'Email is required.' }));
      hasError = true;
    } else if (!validateEmail(values.email)) {
      setErrors((p) => ({ ...p, email: 'Please enter a valid email address.' }));
      hasError = true;
    }
    if (!values.password) {
      setErrors((p) => ({ ...p, password: 'Password is required.' }));
      hasError = true;
    }

    if (hasError) return;

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
      const errMsg = error.message || 'Invalid email or password.';
      setLoginError(errMsg);
      notify('error', errMsg);
    }
  };

  return (
    <div className="login-page">
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

      {/* ── LEFT HERO PANEL (brand side) ── */}
      <div className="login-brand-panel">
        {/* Depth glows & pattern */}
        <div className="login-bg-glow-indigo" aria-hidden="true" />
        <div className="login-bg-glow-orange" aria-hidden="true" />
        <div className="login-bg-pattern" aria-hidden="true" />

        {/* Brand header */}
        <header className="login-brand-header login-anim-0">
          <div className="login-brand-logo">
            <span className="login-brand-icon">
              <IconBrandLogo size={20} color="#fff" />
            </span>
            <span>uptoskills</span>
          </div>
        </header>

        {/* Hero content */}
        <div className="login-brand-content">
          <div className="login-eyebrow-pill login-anim-1">
            <span className="login-eyebrow-dot" aria-hidden="true" />
            <span>Enterprise Talent Platform</span>
          </div>

          <h1 className="login-headline login-anim-2">
            Step up your{' '}
            <span className="login-grad-word">career</span>
          </h1>

          <p className="login-subtext login-anim-2">
            Sign in to manage your professional journey, oversee interns, and accelerate verified certifications.
          </p>

          {/* Product preview card (mirrors dashboard stat-card style) */}
          <div className="login-product-card login-anim-3" aria-hidden="true">
            <div className="login-product-card-top">
              {/* Metric 1: Active Interns with Indigo sparkline */}
              <div className="login-product-metric">
                <div className="login-metric-header">
                  <span className="login-metric-label">Active Interns</span>
                  <span className="login-metric-badge cobalt">
                    <IconTrendingUp size={11} /> 1,280 active
                  </span>
                </div>
                <div className="login-metric-value">1,280</div>
                <div className="login-metric-chart">
                  <svg width="100%" height="24" viewBox="0 0 140 24" fill="none">
                    <path
                      d="M0 18 C25 14 45 4 75 14 C105 24 120 8 140 10"
                      stroke="var(--accent)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      opacity="0.85"
                    />
                  </svg>
                </div>
              </div>

              <div className="login-metric-divider" />

              {/* Metric 2: Completion Rate with Orange sparkline */}
              <div className="login-product-metric">
                <div className="login-metric-header">
                  <span className="login-metric-label">Completion Rate</span>
                  <span className="login-metric-badge coral">
                    <IconActivity size={11} /> 98.4%
                  </span>
                </div>
                <div className="login-metric-value">98.4%</div>
                <div className="login-metric-chart">
                  <svg width="100%" height="24" viewBox="0 0 140 24" fill="none">
                    <path
                      d="M0 20 C20 16 50 20 80 8 C110 0 125 14 140 6"
                      stroke="var(--coral)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      opacity="0.85"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Static status row with small pulsing dot instead of spinner */}
            <div className="login-product-status">
              <span className="login-status-dot" aria-hidden="true" />
              <span>Lifecycle Engine · Auto-retention & archiving</span>
            </div>
          </div>

          {/* Three lighter feature rows */}
          <div className="login-features">
            <div className="login-feature-item login-anim-4">
              <div className="login-feature-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div className="login-feature-text">
                <strong>Verified Certificates</strong>
                <span>Auto-generated & PDF-rendered</span>
              </div>
            </div>

            <div className="login-feature-item login-anim-4">
              <div className="login-feature-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div className="login-feature-text">
                <strong>Team Management</strong>
                <span>Assign interns to Team Leaders</span>
              </div>
            </div>

            <div className="login-feature-item login-anim-5">
              <div className="login-feature-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <div className="login-feature-text">
                <strong>Live Analytics</strong>
                <span>Telemetry & retention policies</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quiet brand footer */}
        <footer className="login-brand-footer login-anim-5">
          © 2026 UptoSkills
        </footer>
      </div>

      {/* ── RIGHT FORM PANEL (form side) ── */}
      <div className="login-form-side">
        {/* Mobile brand header (shown on <= 1024px) */}
        <div className="login-mobile-brand login-anim-0">
          <span className="login-brand-icon">
            <IconBrandLogo size={18} color="#fff" />
          </span>
          <span>uptoskills</span>
        </div>

        {/* Form Card */}
        <div className="login-card login-anim-card">
          <div className="login-card-header">
            <span className="login-card-badge">
              <span className="login-card-badge-dot" aria-hidden="true" />
              Secure Access
            </span>
            <h2 className="login-card-title">Welcome back</h2>
            <p className="login-card-sub">Sign in to access your administration dashboard.</p>
          </div>

          <form onSubmit={submit} noValidate>
            {/* Email Address */}
            <div className="login-field">
              <label htmlFor="login-email" className="login-label">
                Email Address
              </label>
              <div className={`login-input-wrap ${isEmailInvalid ? 'invalid' : isEmailValid ? 'valid' : ''}`}>
                <span className="login-input-icon">
                  <IconMail size={16} />
                </span>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  placeholder="name@company.com"
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="email"
                  aria-invalid={isEmailInvalid ? 'true' : 'false'}
                  aria-describedby={isEmailInvalid ? 'login-email-error' : undefined}
                />
              </div>
              {isEmailInvalid && (
                <span id="login-email-error" className="login-field-error" role="alert">
                  <IconClose size={12} /> {errors.email}
                </span>
              )}
            </div>

            {/* Password */}
            <div className="login-field">
              <label htmlFor="login-password" className="login-label">
                Password
              </label>
              <div className={`login-input-wrap ${isPasswordInvalid ? 'invalid' : isPasswordValid ? 'valid' : ''}`}>
                <span className="login-input-icon">
                  <IconLock size={16} />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="current-password"
                  aria-invalid={isPasswordInvalid ? 'true' : 'false'}
                  aria-describedby={isPasswordInvalid ? 'login-password-error' : undefined}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
              {isPasswordInvalid && (
                <span id="login-password-error" className="login-field-error" role="alert">
                  <IconClose size={12} /> {errors.password}
                </span>
              )}
            </div>

            {/* Forgot password link */}
            <div className="login-forgot-row">
              <Link className="login-forgot-link" to="/forgot-password">
                Forgot password?
              </Link>
            </div>

            {/* Failed login inline error banner */}
            {loginError && (
              <div className="login-error-banner" role="alert" aria-live="polite">
                <span className="login-error-banner-icon">
                  <IconClose size={12} />
                </span>
                <span>{loginError}</span>
              </div>
            )}

            {/* Primary Submit Button */}
            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="login-spinner" aria-hidden="true" />
                  <span>Signing in...</span>
                </>
              ) : (
                'Sign in to Dashboard'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}