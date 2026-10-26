import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/auth.service';
import { formatRateLimitError } from '../../../shared/utils/formatRateLimitError';
import '../../../app/App.css';

const genericError = 'Something went wrong, please try again';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [devLink, setDevLink] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setDevLink('');
    setError('');

    try {
      const data = await forgotPassword(email.trim().toLowerCase());
      setMessage(data.message);
      if (data.devResetLink) {
        setDevLink(data.devResetLink);
      }
    } catch (err) {
      const friendlyMsg = formatRateLimitError(err, err.response?.data?.message || genericError);
      setError(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="brand-panel">
        <div className="brand">
          <span className="brand-icon">🎓</span>
          <strong>uptoskills</strong>
        </div>
        <div className="brand-content">
          <h1>Keep your <em>progress moving</em></h1>
          <p>Get back into your secure internship workspace.</p>
        </div>
        <small>Copyright © 2026 UptoSkills</small>
      </div>

      <div className="form-side">
        <div className="auth-card">
          <h2>Forgot Password?</h2>
          <p className="sub">Enter your account email and we will send a reset link.</p>

          {message ? (
            <div className="auth-status success" role="status">
              <p>{message}</p>
              {devLink && (
                <p style={{ marginTop: '12px' }}>
                  <a href={devLink} style={{ color: 'var(--accent-1)', textDecoration: 'underline', fontWeight: 600 }}>
                    Click here to reset your password (Dev Link)
                  </a>
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={submit} noValidate aria-label="Forgot password form">
              <label className="field" htmlFor="forgot-email">
                <b>Email Address</b>
                <div className="input-wrap">
                  <span className="input-icon" aria-hidden="true">✉</span>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="e.g. intern@uptoskills.com"
                    required
                    aria-required="true"
                    aria-describedby={error ? "forgot-email-error" : undefined}
                  />
                </div>
              </label>

              {error && <div className="auth-status error" id="forgot-email-error" role="alert">{error}</div>}

              <button type="submit" className="primary" disabled={loading || !email.trim()}>
                {loading ? <span className="spinner" aria-hidden="true"></span> : 'Send Reset Link'}
              </button>
            </form>
          )}

          <Link className="auth-link" to="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}