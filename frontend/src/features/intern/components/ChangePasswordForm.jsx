import { useState } from 'react';
import { useIntern } from '../hooks/useIntern';
import { setPassword as apiSetPassword } from '../services/intern.service';
import Toast from '../../../shared/components/Toast';
import './ChangePasswordForm.css';

export default function ChangePasswordForm() {
  const { profile, setProfile } = useIntern();
  const hasPassword = Boolean(profile?.passwordSetAt);

  const [formData, setFormData] = useState({
    currentSecret: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Password rule tests
  const hasMinLength = formData.newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(formData.newPassword);
  const hasNumber = /\d/.test(formData.newPassword);
  const hasSpecial = /[^a-zA-Z0-9]/.test(formData.newPassword);

  const passedCount = [hasMinLength, hasLetter, hasNumber].filter(Boolean).length;
  let strengthLabel = 'Too weak';
  let strengthClass = 'weak';
  if (passedCount === 3) {
    if (formData.newPassword.length >= 10 && hasSpecial) {
      strengthLabel = 'Strong';
      strengthClass = 'strong';
    } else {
      strengthLabel = 'Good';
      strengthClass = 'medium';
    }
  } else if (passedCount === 2) {
    strengthLabel = 'Fair';
    strengthClass = 'fair';
  }

  const validateField = (name, value, allValues = formData) => {
    let error = '';
    if (name === 'currentSecret') {
      if (!value.trim()) {
        error = hasPassword
          ? 'Current password is required.'
          : 'Intern code or current password is required.';
      }
    } else if (name === 'newPassword') {
      if (!value) {
        error = 'New password is required.';
      } else if (value.length < 8) {
        error = 'Password must be at least 8 characters long.';
      } else if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
        error = 'Password must contain at least one letter and one number.';
      }
    } else if (name === 'confirmPassword') {
      if (!value) {
        error = 'Please confirm your new password.';
      } else if (value !== allValues.newPassword) {
        error = 'Passwords do not match.';
      }
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextFormData = { ...formData, [name]: value };
    setFormData(nextFormData);

    if (touched[name]) {
      const err = validateField(name, value, nextFormData);
      setErrors((prev) => ({ ...prev, [name]: err }));
    }

    if (name === 'newPassword' && touched.confirmPassword) {
      const confirmErr = validateField('confirmPassword', nextFormData.confirmPassword, nextFormData);
      setErrors((prev) => ({ ...prev, confirmPassword: confirmErr }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const currentErr = validateField('currentSecret', formData.currentSecret);
    const newErr = validateField('newPassword', formData.newPassword);
    const confirmErr = validateField('confirmPassword', formData.confirmPassword);

    const allErrors = {
      currentSecret: currentErr,
      newPassword: newErr,
      confirmPassword: confirmErr,
    };
    setErrors(allErrors);
    setTouched({
      currentSecret: true,
      newPassword: true,
      confirmPassword: true,
    });

    if (currentErr || newErr || confirmErr) {
      return;
    }

    setLoading(true);
    try {
      const res = await apiSetPassword({
        currentSecret: formData.currentSecret.trim(),
        newPassword: formData.newPassword,
      });

      setToast({
        type: 'success',
        message: hasPassword
          ? 'Password changed successfully!'
          : 'Password setup complete! From now on, use your password to log in.',
      });

      if (setProfile) {
        setProfile((prev) => ({
          ...prev,
          passwordSetAt: res.passwordSetAt || new Date().toISOString(),
        }));
      }

      setFormData({
        currentSecret: '',
        newPassword: '',
        confirmPassword: '',
      });
      setTouched({});
      setErrors({});
    } catch (err) {
      const serverMsg =
        err.response?.data?.errors?.[0]?.msg ||
        err.response?.data?.message ||
        err.message ||
        'Failed to set password. Please try again.';
      setToast({ type: 'error', message: serverMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-card">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="cp-header">
        <div className="cp-icon-wrap" aria-hidden="true">
          🔐
        </div>
        <div>
          <h2 className="cp-title">
            {hasPassword ? 'Change Password' : 'Set Your Password'}
          </h2>
          <p className="cp-subtitle">
            {hasPassword
              ? 'Update your account login password below.'
              : 'Set a personal password so you no longer need to log in with your intern code.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="cp-form">
        {/* Current Secret / Password */}
        <div className="cp-field">
          <label htmlFor="currentSecret" className="cp-label">
            {hasPassword ? 'Current Password' : 'Intern Code or Current Password'}
            <span className="cp-required" aria-hidden="true">*</span>
          </label>
          <div className={`cp-input-wrap ${touched.currentSecret && errors.currentSecret ? 'has-error' : ''}`}>
            <input
              id="currentSecret"
              name="currentSecret"
              type={showCurrent ? 'text' : 'password'}
              value={formData.currentSecret}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={hasPassword ? 'Enter current password' : 'Enter your intern code (e.g. INT-001)'}
              autoComplete="current-password"
              aria-required="true"
              aria-invalid={Boolean(touched.currentSecret && errors.currentSecret)}
              aria-describedby={touched.currentSecret && errors.currentSecret ? 'currentSecret-error' : undefined}
            />
            <button
              type="button"
              className="cp-eye-btn"
              onClick={() => setShowCurrent(!showCurrent)}
              aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
            >
              {showCurrent ? '👁️' : '🙈'}
            </button>
          </div>
          {touched.currentSecret && errors.currentSecret && (
            <p id="currentSecret-error" className="cp-error-text" role="alert">
              {errors.currentSecret}
            </p>
          )}
        </div>

        {/* New Password */}
        <div className="cp-field">
          <label htmlFor="newPassword" className="cp-label">
            New Password
            <span className="cp-required" aria-hidden="true">*</span>
          </label>
          <div className={`cp-input-wrap ${touched.newPassword && errors.newPassword ? 'has-error' : ''}`}>
            <input
              id="newPassword"
              name="newPassword"
              type={showNew ? 'text' : 'password'}
              value={formData.newPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              aria-required="true"
              aria-invalid={Boolean(touched.newPassword && errors.newPassword)}
              aria-describedby={touched.newPassword && errors.newPassword ? 'newPassword-error' : undefined}
            />
            <button
              type="button"
              className="cp-eye-btn"
              onClick={() => setShowNew(!showNew)}
              aria-label={showNew ? 'Hide new password' : 'Show new password'}
            >
              {showNew ? '👁️' : '🙈'}
            </button>
          </div>
          {touched.newPassword && errors.newPassword && (
            <p id="newPassword-error" className="cp-error-text" role="alert">
              {errors.newPassword}
            </p>
          )}

          {/* Password strength meter and rules */}
          {formData.newPassword.length > 0 && (
            <div className="cp-strength-box">
              <div className="cp-strength-bar-wrap">
                <div className={`cp-strength-bar ${strengthClass}`} />
              </div>
              <span className={`cp-strength-text ${strengthClass}`}>
                Strength: {strengthLabel}
              </span>
            </div>
          )}

          <div className="cp-rules-list">
            <span className={`cp-rule-item ${hasMinLength ? 'met' : ''}`}>
              {hasMinLength ? '✓' : '○'} At least 8 characters
            </span>
            <span className={`cp-rule-item ${hasLetter ? 'met' : ''}`}>
              {hasLetter ? '✓' : '○'} At least one letter
            </span>
            <span className={`cp-rule-item ${hasNumber ? 'met' : ''}`}>
              {hasNumber ? '✓' : '○'} At least one number
            </span>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="cp-field">
          <label htmlFor="confirmPassword" className="cp-label">
            Confirm New Password
            <span className="cp-required" aria-hidden="true">*</span>
          </label>
          <div className={`cp-input-wrap ${touched.confirmPassword && errors.confirmPassword ? 'has-error' : ''}`}>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Re-enter your new password"
              autoComplete="new-password"
              aria-required="true"
              aria-invalid={Boolean(touched.confirmPassword && errors.confirmPassword)}
              aria-describedby={touched.confirmPassword && errors.confirmPassword ? 'confirmPassword-error' : undefined}
            />
            <button
              type="button"
              className="cp-eye-btn"
              onClick={() => setShowConfirm(!showConfirm)}
              aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirm ? '👁️' : '🙈'}
            </button>
          </div>
          {touched.confirmPassword && errors.confirmPassword && (
            <p id="confirmPassword-error" className="cp-error-text" role="alert">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="cp-action-row">
          <button
            type="submit"
            className="cp-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="cp-spinner" aria-hidden="true" />
            ) : hasPassword ? (
              'Change Password'
            ) : (
              'Set Password'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
