import React, { useState } from 'react';
import { setPassword } from '../services/intern.service';

export default function ChangePasswordForm({ hasPassword, onSuccess }) {
  const [formData, setFormData] = useState({
    currentSecret: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Password rules validation
  const validateField = (name, value, allValues = formData) => {
    let err = '';
    if (name === 'currentSecret') {
      if (!value.trim()) {
        err = hasPassword ? 'Current password is required' : 'Intern code or current password is required';
      }
    } else if (name === 'newPassword') {
      if (!value) {
        err = 'New password is required';
      } else if (value.length < 8) {
        err = 'Password must be at least 8 characters long';
      } else if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
        err = 'Password must contain at least one letter and one number';
      }
    } else if (name === 'confirmPassword') {
      if (!value) {
        err = 'Please confirm your new password';
      } else if (value !== allValues.newPassword) {
        err = 'Passwords do not match';
      }
    }
    return err;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextData = { ...formData, [name]: value };
    setFormData(nextData);

    if (touched[name]) {
      const err = validateField(name, value, nextData);
      setErrors((prev) => ({ ...prev, [name]: err }));
    }

    if (name === 'newPassword' && touched.confirmPassword) {
      const confirmErr = validateField('confirmPassword', nextData.confirmPassword, nextData);
      setErrors((prev) => ({ ...prev, confirmPassword: confirmErr }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: err }));
  };

  // Strength metrics
  const pwd = formData.newPassword;
  const hasLength = pwd.length >= 8;
  const hasLetter = /[A-Za-z]/.test(pwd);
  const hasNumber = /\d/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

  const passedCount = [hasLength, hasLetter, hasNumber, hasSpecial].filter(Boolean).length;
  let strengthLabel = 'Too weak';
  let strengthColor = 'var(--error, #ef4444)';
  if (hasLength && hasLetter && hasNumber) {
    if (passedCount >= 4) {
      strengthLabel = 'Strong';
      strengthColor = 'var(--success, #10b981)';
    } else {
      strengthLabel = 'Medium';
      strengthColor = 'var(--warning, #f59e0b)';
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    const currentErr = validateField('currentSecret', formData.currentSecret);
    const newErr = validateField('newPassword', formData.newPassword);
    const confirmErr = validateField('confirmPassword', formData.confirmPassword);

    const nextErrors = {
      currentSecret: currentErr,
      newPassword: newErr,
      confirmPassword: confirmErr
    };

    setTouched({ currentSecret: true, newPassword: true, confirmPassword: true });
    setErrors(nextErrors);

    if (currentErr || newErr || confirmErr) {
      return;
    }

    setLoading(true);
    try {
      const res = await setPassword({
        currentSecret: formData.currentSecret.trim(),
        newPassword: formData.newPassword
      });

      showToast('success', res.message || 'Password changed successfully!');
      setFormData({
        currentSecret: '',
        newPassword: '',
        confirmPassword: ''
      });
      setTouched({});
      setErrors({});

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        err.message ||
        'Failed to set password. Please try again.';
      showToast('error', msg);

      if (msg.toLowerCase().includes('current')) {
        setErrors((prev) => ({ ...prev, currentSecret: msg }));
      }
    } finally {
      setLoading(false);
    }
  };

  const secretLabel = hasPassword
    ? 'Current Password'
    : 'Intern Code or Current Password';

  return (
    <div className="change-password-card">
      {toast && (
        <div className={`notification ${toast.type}`} role="alert">
          <span className="notification-icon">
            <i className={toast.type === 'success' ? 'bi bi-check-lg' : 'bi bi-x-lg'}></i>
          </span>
          <span>{toast.message}</span>
          <button
            type="button"
            className="close-btn"
            onClick={() => setToast(null)}
            aria-label="Close notification"
          >
            <i className="bi bi-x"></i>
          </button>
        </div>
      )}

      <div className="card-header-block">
        <div className="card-icon-badge">
          <i className="bi bi-shield-lock-fill"></i>
        </div>
        <div>
          <h2 className="card-title">Password & Credentials</h2>
          <p className="card-subtitle">
            {hasPassword
              ? 'Update your account password using your current password.'
              : 'You are currently using your Intern Code for login. Set a personal password to secure your account.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="change-password-form">
        {/* Field 1: Current Secret */}
        <div className="form-group">
          <label htmlFor="currentSecret" className="form-label">
            {secretLabel}
          </label>
          <div className={`password-input-wrap ${errors.currentSecret ? 'has-error' : ''}`}>
            <span className="input-prefix-icon">
              <i className="bi bi-key-fill"></i>
            </span>
            <input
              id="currentSecret"
              name="currentSecret"
              type={showCurrent ? 'text' : 'password'}
              className="form-input"
              placeholder={hasPassword ? 'Enter current password' : 'Enter your intern code (e.g. INT-XXXX)'}
              value={formData.currentSecret}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="toggle-visibility-btn"
              onClick={() => setShowCurrent(!showCurrent)}
              aria-label={showCurrent ? 'Hide secret' : 'Show secret'}
            >
              <i className={showCurrent ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill'}></i>
            </button>
          </div>
          {errors.currentSecret && (
            <p className="inline-error" role="alert">
              <i className="bi bi-exclamation-circle-fill"></i> {errors.currentSecret}
            </p>
          )}
        </div>

        {/* Field 2: New Password */}
        <div className="form-group">
          <label htmlFor="newPassword" className="form-label">
            New Password
          </label>
          <div className={`password-input-wrap ${errors.newPassword ? 'has-error' : ''}`}>
            <span className="input-prefix-icon">
              <i className="bi bi-lock-fill"></i>
            </span>
            <input
              id="newPassword"
              name="newPassword"
              type={showNew ? 'text' : 'password'}
              className="form-input"
              placeholder="Enter at least 8 characters"
              value={formData.newPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="toggle-visibility-btn"
              onClick={() => setShowNew(!showNew)}
              aria-label={showNew ? 'Hide password' : 'Show password'}
            >
              <i className={showNew ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill'}></i>
            </button>
          </div>
          {errors.newPassword && (
            <p className="inline-error" role="alert">
              <i className="bi bi-exclamation-circle-fill"></i> {errors.newPassword}
            </p>
          )}

          {/* Strength Hint Indicator */}
          {formData.newPassword && (
            <div className="password-strength-box">
              <div className="strength-header">
                <span>Strength: <strong style={{ color: strengthColor }}>{strengthLabel}</strong></span>
              </div>
              <div className="strength-meter-bar">
                <div
                  className="strength-meter-fill"
                  style={{
                    width: `${(passedCount / 4) * 100}%`,
                    backgroundColor: strengthColor
                  }}
                />
              </div>
              <ul className="strength-rules-list">
                <li className={hasLength ? 'passed' : 'pending'}>
                  <i className={hasLength ? 'bi bi-check-circle-fill' : 'bi bi-circle'}></i>
                  At least 8 characters
                </li>
                <li className={hasLetter ? 'passed' : 'pending'}>
                  <i className={hasLetter ? 'bi bi-check-circle-fill' : 'bi bi-circle'}></i>
                  At least one letter
                </li>
                <li className={hasNumber ? 'passed' : 'pending'}>
                  <i className={hasNumber ? 'bi bi-check-circle-fill' : 'bi bi-circle'}></i>
                  At least one number
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Field 3: Confirm Password */}
        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">
            Confirm New Password
          </label>
          <div className={`password-input-wrap ${errors.confirmPassword ? 'has-error' : ''}`}>
            <span className="input-prefix-icon">
              <i className="bi bi-shield-check"></i>
            </span>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              className="form-input"
              placeholder="Re-enter your new password"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="toggle-visibility-btn"
              onClick={() => setShowConfirm(!showConfirm)}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              <i className={showConfirm ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill'}></i>
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="inline-error" role="alert">
              <i className="bi bi-exclamation-circle-fill"></i> {errors.confirmPassword}
            </p>
          )}
        </div>

        <div className="form-actions">
          <button
            type="submit"
            id="save-password-btn"
            className="btn-primary-gradient"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border-sm" aria-hidden="true"></span>
                <span>Updating password...</span>
              </>
            ) : (
              <>
                <i className="bi bi-check2-circle"></i>
                <span>Save Password</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
