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
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const isEmailValid = touched.email && !errors.email && values.email.trim() && validateEmail(values.email);
  const isEmailInvalid = touched.email && errors.email;

  const isPasswordValid = touched.password && !errors.password && values.password.trim().length > 0;
  const isPasswordInvalid = touched.password && errors.password;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));

    if (name === 'email') {
      if (!value.trim()) {
        setErrors((prev) => ({ ...prev, email: 'Email is required.' }));
      } else if (!validateEmail(value)) {
        setErrors((prev) => ({ ...prev, email: 'Please enter a valid email address.' }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.email;
          return next;
        });
      }
    }

    if (name === 'password') {
      if (!value) {
        setErrors((prev) => ({ ...prev, password: 'Password is required.' }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.password;
          return next;
        });
      }
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
            {notification.type === 'error' ? <IconClose size={14} /> : <IconCheck size={14} />}
          </span>
          <span>{notification.message}</span>
          <button className="close-btn" onClick={() => setNotification(null)} aria-label="Close notification">
            <IconClose size={12} />
          </button>
        </div>
      )}

      <div className="brand-panel">
        <div className="brand">
          <span className="brand-icon">
            <IconBrandLogo size={22} color="#ffffff" />
          </span>
          <strong>uptoskills</strong>
        </div>

        <div className="brand-content">
          <div className="brand-badge-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(0, 71, 171, 0.08)', color: 'var(--cobalt)', fontSize: '13px', fontWeight: '800', marginBottom: '20px', border: '1px solid rgba(0, 71, 171, 0.15)' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--coral)' }}></span>
            ENTERPRISE TALENT PLATFORM
          </div>

          <h1 style={{ fontWeight: '900', letterSpacing: '-1.5px', color: 'var(--text-strong)' }}>
            Step up your career
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '18px', lineHeight: '1.5', marginTop: '12px' }}>
            Sign in to manage your professional journey, oversee interns, and accelerate verified certifications.
          </p>

          <div className="feature-card" style={{ marginTop: '36px', border: '1px solid var(--border)', borderRadius: '18px', padding: '24px', background: 'var(--card)', boxShadow: 'var(--shadow)' }}>
            <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '12px', color: '#ffffff', background: 'linear-gradient(135deg, var(--coral), var(--coral-hover))', fontWeight: '800', fontSize: '11px', letterSpacing: '0.8px' }}>
              HIGH PERFORMANCE
            </span>
            <h2 style={{ fontSize: '19px', margin: '16px 0 8px', color: 'var(--text-strong)', fontWeight: '800' }}>
              Precision Analytics & Lifecycle
            </h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px', lineHeight: '1.45' }}>
              Streamlined administrative workflows with automated retention policies, archived account auditing, and verified credential management.
            </p>
          </div>
        </div>

        <small style={{ marginTop: 'auto', paddingTop: '24px', color: 'var(--muted)', fontSize: '13px' }}>
          Copyright © 2026 UptoSkills
        </small>
      </div>

      <div className="form-side">
        <div className="auth-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <h2 style={{ color: 'var(--text-strong)', fontWeight: '800', letterSpacing: '-0.8px', margin: 0 }}>
              Welcome Back
            </h2>
            <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(255, 111, 97, 0.1)', color: 'var(--coral)', fontSize: '11px', fontWeight: '800' }}>
              SECURE ACCESS
            </span>
          </div>
          <p className="sub">Sign in to access your assigned administration dashboard.</p>

          <form onSubmit={submit} noValidate>
            <label className="field">
              <b>Email Address</b>
              <div
                className={`input-wrap ${isEmailInvalid ? 'invalid' : isEmailValid ? 'valid' : ''}`}
              >
                <span className="input-icon" style={{ display: 'flex', alignItems: 'center', color: 'var(--muted)' }}>
                  <IconMail size={18} />
                </span>
                <input
                  type="email"
                  name="email"
                  placeholder="e.g. admin@uptoskills.com"
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="email"
                />
              </div>
              {isEmailInvalid && (
                <span className="field-error">{errors.email}</span>
              )}
            </label>

            <label className="field">
              <b>Password</b>
              <div
                className={`input-wrap ${isPasswordInvalid ? 'invalid' : isPasswordValid ? 'valid' : ''}`}
              >
                <span className="input-icon" style={{ display: 'flex', alignItems: 'center', color: 'var(--muted)' }}>
                  <IconLock size={18} />
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
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {showPassword ? <IconEyeOff size={18} color="var(--muted)" /> : <IconEye size={18} color="var(--muted)" />}
                </button>
              </div>
              {isPasswordInvalid && (
                <span className="field-error">{errors.password}</span>
              )}
            </label>

            <button
              type="submit"
              className="primary"
              disabled={loading}
              style={{ marginTop: '18px' }}
            >
              {loading ? <span className="spinner"></span> : 'Log In'}
            </button>
          </form>

          <Link className="auth-link" to="/forgot-password">Forgot Password?</Link>
        </div>
      </div>
    </div>
  );
}