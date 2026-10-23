import React from 'react';
import ChangePasswordForm from '../components/ChangePasswordForm';
import './SettingsPage.css';

export default function SettingsPage({ profile, onProfileUpdated }) {
  const hasPassword = Boolean(profile?.passwordSetAt || profile?.hasPassword);

  return (
    <div className="settings-page-wrapper" aria-label="Settings Page">
      {/* Overview Status Banner */}
      <div className="settings-header-banner">
        <div>
          <h1 className="settings-header-title">
            <i className="bi bi-gear-fill" style={{ color: 'var(--accent, #6366f1)' }}></i>
            Security & Account Settings
          </h1>
          <p className="settings-header-sub">
            Manage your authentication credentials, login password, and security preferences.
          </p>
        </div>
        <div>
          <span className={`settings-status-pill ${hasPassword ? 'secured' : 'initial'}`}>
            <i className={hasPassword ? 'bi bi-shield-check' : 'bi bi-exclamation-triangle-fill'}></i>
            {hasPassword ? 'Password Set' : 'Intern Code Login'}
          </span>
        </div>
      </div>

      {/* Change Password Form */}
      <ChangePasswordForm
        hasPassword={hasPassword}
        onSuccess={onProfileUpdated}
      />
    </div>
  );
}
