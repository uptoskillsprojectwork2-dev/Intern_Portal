import { useState } from 'react';
import ChangePasswordForm from '../components/ChangePasswordForm';
import { updateProfile } from '../services/intern.service';
import Toast from '../../../shared/components/Toast';
import './SettingsPage.css';

export default function SettingsPage({ profile, onProfileUpdated }) {
  const [editingMobile, setEditingMobile] = useState(false);
  const [mobileNo, setMobileNo] = useState(profile?.mobileNo || '');
  const [mobileError, setMobileError] = useState('');
  const [savingMobile, setSavingMobile] = useState(false);
  const [toast, setToast] = useState(null);

  const cancelMobile = () => {
    setMobileNo(profile?.mobileNo || '');
    setMobileError('');
    setEditingMobile(false);
  };

  const saveMobile = async (event) => {
    event.preventDefault();
    if (!/^\d{10}$/.test(mobileNo.trim())) {
      setMobileError('Enter a valid 10-digit mobile number.');
      return;
    }
    setMobileError('');
    setSavingMobile(true);
    try {
      const response = await updateProfile({ mobileNo: mobileNo.trim() });
      onProfileUpdated(response.user);
      setEditingMobile(false);
      setToast({ type: 'success', message: 'Mobile number updated.' });
    } catch (error) {
      setToast({ type: 'error', message: error.response?.data?.message || 'Unable to update mobile number.' });
    } finally { setSavingMobile(false); }
  };

  return (
    <section className="intern-settings-page">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <header><p className="settings-eyebrow">ACCOUNT</p><h2>Profile and security</h2><p>Keep your contact details current and choose a password for your account.</p></header>

      <section className="intern-settings-card">
        <div className="settings-section-heading"><div><h3>Mobile number</h3><p>Used for account contact details.</p></div>
          {!editingMobile && <button type="button" className="settings-secondary" onClick={() => setEditingMobile(true)}>Edit</button>}
        </div>
        {editingMobile ? (
          <form className="intern-settings-form mobile-edit-form" onSubmit={saveMobile} noValidate>
            <label htmlFor="profile-mobile">Mobile number</label>
            <input id="profile-mobile" type="tel" inputMode="numeric" maxLength={10} value={mobileNo} onChange={(event) => setMobileNo(event.target.value.replace(/\D/g, ''))} aria-invalid={Boolean(mobileError)} />
            {mobileError && <small className="settings-error" role="alert">{mobileError}</small>}
            <div className="settings-actions"><button type="submit" disabled={savingMobile}>{savingMobile ? 'Saving…' : 'Save'}</button><button type="button" className="settings-secondary" onClick={cancelMobile} disabled={savingMobile}>Cancel</button></div>
          </form>
        ) : <p className="settings-mobile-value">{profile?.mobileNo || 'No mobile number added'}</p>}
      </section>

      <section className="intern-settings-card">
        <div className="settings-section-heading"><div><h3>Sign-in password</h3><p>{profile?.passwordSetAt ? 'Your intern code no longer works as a sign-in secret.' : 'Use your intern code once to choose a password.'}</p></div></div>
        <ChangePasswordForm passwordSet={Boolean(profile?.passwordSetAt)} onSuccess={(message) => {
          onProfileUpdated({ ...profile, passwordSetAt: new Date().toISOString() });
          setToast({ type: 'success', message });
        }} onError={(message) => setToast({ type: 'error', message })} />
      </section>
    </section>
  );
}
