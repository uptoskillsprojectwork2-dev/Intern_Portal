import { useState } from 'react';
import { setPassword } from '../services/intern.service';

const passwordIsValid = (value) => value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);

export default function ChangePasswordForm({ passwordSet, onSuccess, onError }) {
  const [values, setValues] = useState({ currentSecret: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const change = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!values.currentSecret) nextErrors.currentSecret = 'Enter your intern code or current password.';
    if (!passwordIsValid(values.newPassword)) nextErrors.newPassword = 'Use at least 8 characters, including a letter and a number.';
    if (values.confirmPassword !== values.newPassword) nextErrors.confirmPassword = 'Passwords do not match.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      const response = await setPassword({ currentSecret: values.currentSecret, newPassword: values.newPassword });
      setValues({ currentSecret: '', newPassword: '', confirmPassword: '' });
      onSuccess(response.message || 'Password updated successfully.');
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to update password. Please try again.';
      setErrors({ form: message });
      onError?.(message);
    } finally { setLoading(false); }
  };

  return (
    <form className="intern-settings-form" onSubmit={submit} noValidate>
      <h3>Change password</h3>
      <label htmlFor="current-secret">{passwordSet ? 'Current Password' : 'Intern Code or Current Password'}</label>
      <input id="current-secret" name="currentSecret" type={show ? 'text' : 'password'} autoComplete="current-password" value={values.currentSecret} onChange={change} aria-invalid={Boolean(errors.currentSecret)} aria-describedby={errors.currentSecret ? 'current-secret-error' : undefined} />
      {errors.currentSecret && <small id="current-secret-error" className="settings-error" role="alert">{errors.currentSecret}</small>}
      <label htmlFor="new-password">New Password</label>
      <input id="new-password" name="newPassword" type={show ? 'text' : 'password'} autoComplete="new-password" value={values.newPassword} onChange={change} aria-invalid={Boolean(errors.newPassword)} aria-describedby={errors.newPassword ? 'new-password-error' : 'password-strength-hint'} />
      <small id="password-strength-hint" className="settings-hint">At least 8 characters, with a letter and a number.</small>
      {errors.newPassword && <small id="new-password-error" className="settings-error" role="alert">{errors.newPassword}</small>}
      <label htmlFor="confirm-password">Confirm New Password</label>
      <input id="confirm-password" name="confirmPassword" type={show ? 'text' : 'password'} autoComplete="new-password" value={values.confirmPassword} onChange={change} aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined} />
      {errors.confirmPassword && <small id="confirm-password-error" className="settings-error" role="alert">{errors.confirmPassword}</small>}
      <label className="settings-show-password"><input type="checkbox" checked={show} onChange={(event) => setShow(event.target.checked)} /> Show passwords</label>
      {errors.form && <p className="settings-error" role="alert">{errors.form}</p>}
      <button type="submit" disabled={loading}>{loading ? 'Updating…' : passwordSet ? 'Update Password' : 'Set Password'}</button>
    </form>
  );
}
