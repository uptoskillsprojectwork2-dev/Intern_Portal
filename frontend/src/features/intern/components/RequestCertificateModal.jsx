import { useState } from 'react';
import useCertificateRequests from '../hooks/useCertificateRequests';
import './RequestCertificateModal.css';

const TYPES = ['offer_letter', 'bonafide', 'ojt_certificate', 'experience_letter', 'completion_certificate', 'intern_of_month', 'league_winner', 'custom'];

export default function RequestCertificateModal({ onClose }) {
  const { submitRequest } = useCertificateRequests();
  const [certificateType, setCertificateType] = useState(TYPES[0]);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submitRequest({ certificateType, reason });
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="request-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="request-modal" role="dialog" aria-modal="true" aria-labelledby="request-modal-title">
        <div className="request-modal-header"><div><p className="request-eyebrow">CERTIFICATE DESK</p><h2 id="request-modal-title">Request a certificate</h2></div><button type="button" className="request-close" onClick={onClose} aria-label="Close">×</button></div>
        <form onSubmit={submit}>
          <label className="request-field">Certificate type<select value={certificateType} onChange={(event) => setCertificateType(event.target.value)}>{TYPES.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}</select></label>
          <label className="request-field">Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows="4" required placeholder="Tell us why you need this certificate" /></label>
          {error && <p className="request-inline-error" role="alert">{error}</p>}
          <button className="request-submit" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit request'}</button>
        </form>
      </section>
    </div>
  );
}