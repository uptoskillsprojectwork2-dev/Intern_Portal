import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { resetPassword as resetPasswordRequest } from '../services/auth.service';
import { IconBrandLogo, IconLock, IconEye, IconEyeOff, IconCheck, IconClose } from '../../shared/components/Icons';
import '../../../app/App.css';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const data = await resetPasswordRequest(token, newPassword);
      setSuccess(data.message || 'Password successfully updated.');
    } catch (requestError) {
      setError(requestError.message || 'Something went wrong, please try again');
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
            Security Credential Update
          </div>

          <h1>
            Set your new <span className="grad-word">password</span>
          </h1>

          <p>
            Choose a secure, strong password to regain full access to your administrative internship portal.
          </p>

          <div className="login-chips" style={{ marginTop: '36px' }}>
            <div className="login-chip">
              <div className="login-chip-icon">
                <IconLock size={16} />
              </div>
              <div className="login-chip-text">
                <strong>Strong Encryption</strong>
                <span>Argon2 / bcrypt password hashing</span>
              </div>
            </div>
            <div className="login-chip">
              <div className="login-chip-icon">
                <IconCheck size={16} />
              </div>
              <div className="login-chip-text">
                <strong>Session Protection</strong>
                <span>Invalidates old session tokens</span>
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
            <h2>Set new password</h2>
            <p className="sub">Create a new secure password for your account.</p>
          </div>

          {success ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="notification success">
                <span className="notification-icon">
                  <IconCheck size={14} />
                </span>
                <span>{success}</span>
              </div>
              <Link className="primary auth-button-link" to="/login" style={{ textAlign: 'center', padding: '12px', borderRadius: 'var(--r-md)' }}>
                Proceed to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <label className="field">
                <b>New Password</b>
                <div className="input-wrap">
                  <span className="input-icon">
                    <IconLock size={17} color="var(--text-subtle)" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </button>
                </div>
              </label>

              <label className="field">
                <b>Confirm New Password</b>
                <div className="input-wrap">
                  <span className="input-icon">
                    <IconLock size={17} color="var(--text-subtle)" />
                  </span>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </button>
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

              <button type="submit" className="primary" disabled={loading} style={{ marginTop: '8px' }}>
                {loading ? <span className="spinner" /> : 'Update Password'}
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