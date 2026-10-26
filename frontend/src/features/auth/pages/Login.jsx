import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { formatRateLimitError } from '../../../shared/utils/formatRateLimitError';
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
    }, 6000);
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
        setErrors((prev) => ({ ...prev, password: 'Intern code or password is required.' }));
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
      setLoading(false);
      const friendlyMsg = formatRateLimitError(error, error.message || 'Invalid email or password.');
      notify('error', friendlyMsg);
    }
  };

  return (
    <div className="auth-page">
      {notification && (
        <div className={`notification ${notification.type}`} role="alert" aria-live="assertive">
          <span className="notification-icon">{notification.type === 'error' ? '⚠' : '✓'}</span>
          <span>{notification.message}</span>
          <button className="close-btn" aria-label="Close notification" onClick={() => setNotification(null)}>✕</button>
        </div>
      )}

      <div className="brand-panel">
        <div className="brand">
          <span className="brand-icon">🎓</span>
          <strong>uptoskills</strong>
        </div>

        <div className="brand-content">
          <h1>Step up your career with <em>in-demand skills</em></h1>
          <p>Everything you need to manage your internship journey in one secure place.</p>

          <div className="feature-card">
            <span>NEW PATHWAY</span>
            <h2>AI-Powered Skill Assessments</h2>
            <p>Get customized learning recommendations based on your current skill levels and career goals.</p>
          </div>
        </div>

        <small>Copyright © 2026 UptoSkills</small>
      </div>

      <div className="form-side">
        <div className="auth-card">
          <h2>Welcome Back</h2>
          <p className="sub">Sign in to access your assigned dashboard.</p>

          <form onSubmit={submit} noValidate aria-label="Sign in form">
            <label className="field" htmlFor="login-email">
              <b>Email Address</b>
              <div
                className={`input-wrap ${isEmailInvalid ? 'invalid' : isEmailValid ? 'valid' : ''
                  }`}
              >
                <span className="input-icon" aria-hidden="true">✉</span>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  placeholder="e.g. intern@uptoskills.com"
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-required="true"
                  aria-invalid={isEmailInvalid ? 'true' : 'false'}
                  aria-describedby={isEmailInvalid ? 'login-email-error' : undefined}
                />
              </div>
              {isEmailInvalid && (
                <span className="field-error" id="login-email-error">{errors.email}</span>
              )}
            </label>

            <label className="field" htmlFor="login-password">
              <b>Intern Code or Password</b>
              <div
                className={`input-wrap ${isPasswordInvalid ? 'invalid' : isPasswordValid ? 'valid' : ''
                  }`}
              >
                <span className="input-icon" aria-hidden="true">🔒</span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Intern code or password"
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-required="true"
                  aria-invalid={isPasswordInvalid ? 'true' : 'false'}
                  aria-describedby={isPasswordInvalid ? 'login-password-error' : undefined}
                />
                <button
                  type="button"
                  className="eye"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '👁' : '👁‍🗨'}
                </button>
              </div>
              {isPasswordInvalid && (
                <span className="field-error" id="login-password-error">{errors.password}</span>
              )}
            </label>

            <button
              type="submit"
              className="primary"
              id="login-submit-btn"
              disabled={loading}
              style={{ marginTop: '16px' }}
            >
              {loading ? <span className="spinner" aria-hidden="true"></span> : 'Sign In'}
            </button>
          </form>

          <Link className="auth-link" to="/forgot-password">Forgot Password?</Link>
        </div>
      </div>
    </div>
  );
}