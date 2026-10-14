import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/auth.service';
import { IconBrandLogo, IconMail, IconCheck, IconClose } from '../../shared/components/Icons';
import '../../../app/App.css';

const genericError = 'Something went wrong, please try again';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const data = await forgotPassword(email.trim().toLowerCase());
      setMessage(data.message || 'If an account exists, a reset link has been dispatched.');
    } catch {
      setError(genericError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* ── LEFT HERO ── */}
      <div className="brand-panel">
        <div className="brand-panel-grid" aria-hidden="true" />

        <div className="brand">
          <span className="brand-icon">
            <IconBrandLogo size={20} color="#fff" />
          </span>
          uptoskills
        </div>

        <div className="brand-content">
          <div className="login-badge-pill">
            <span className="login-badge-dot" />
            Account Security & Recovery
          </div>

          <h1>
            Recover your <span className="grad-word">access</span>
          </h1>

          <p>
            Enter your staff account email. We'll send you a secure verification link to reset your credentials.
          </p>

          <div className="login-chips" style={{ marginTop: '36px' }}>
            <div className="login-chip">
              <div className="login-chip-icon">
                <IconMail size={16} />
              </div>
              <div className="login-chip-text">
                <strong>Encrypted Delivery</strong>
                <span>One-time secure token link</span>
              </div>
            </div>
            <div className="login-chip">
              <div className="login-chip-icon">
                <IconCheck size={16} />
              </div>
              <div className="login-chip-text">
                <strong>Fast Recovery</strong>
                <span>Instant verification flow</span>
              </div>
            </div>
          </div>
        </div>

        <small className="brand-footer">
          Protected by enterprise security · © 2026 UptoSkills
        </small>
      </div>

      {/* ── RIGHT FORM ── */}
      <div className="form-side">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Reset password</h2>
            <p className="sub">Enter your email and we will send a recovery link.</p>
          </div>

          {message ? (
            <div className="notification success" style={{ marginBottom: '20px' }}>
              <span className="notification-icon">
                <IconCheck size={14} />
              </span>
              <span>{message}</span>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <label className="field">
                <b>Work Email</b>
                <div className="input-wrap">
                  <span className="input-icon">
                    <IconMail size={17} color="var(--text-subtle)" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="e.g. staff@uptoskills.com"
                    required
                    autoFocus
                  />
                </div>
              </label>

              {error && (
                <div className="notification error" style={{ margin: '14px 0' }}>
                  <span className="notification-icon">
                    <IconClose size={13} />
                  </span>
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="primary" disabled={loading || !email.trim()} style={{ marginTop: '8px' }}>
                {loading ? <span className="spinner" /> : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <Link className="auth-link" to="/login">
              ← Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}