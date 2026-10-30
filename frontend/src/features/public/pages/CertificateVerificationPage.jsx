import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const PUBLIC_VERIFY_URL = 'http://localhost:3000/api/public/certificates/verify';

export default function CertificateVerificationPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [certificate, setCertificate] = useState(null);
  const [error, setError] = useState('');

  const query = useMemo(() => ({
    certificateNumber: searchParams.get('certificateNumber') || '',
    verificationCode: searchParams.get('verificationCode') || '',
    verifyId: searchParams.get('verifyId') || ''
  }), [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    if (!params.toString()) {
      setStatus('error');
      setError('Missing verification data. Please scan a valid certificate QR code.');
      return;
    }

    fetch(`${PUBLIC_VERIFY_URL}?${params.toString()}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message || 'Verification failed');
        }
        setCertificate(data.certificate || null);
        setStatus(data.certificate?.isValid ? 'valid' : 'invalid');
      })
      .catch((err) => {
        setStatus('error');
        setError(err.message || 'Verification failed');
      });
  }, [query]);

  return (
    <div style={{ maxWidth: 720, margin: '60px auto', padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <div style={{ border: '1px solid #dbe2ea', borderRadius: 16, padding: 32, background: status === 'valid' ? '#ecfdf5' : status === 'invalid' ? '#fff1f2' : '#f8fafc' }}>
        <h1 style={{ marginTop: 0 }}>Certificate Verification</h1>

        {status === 'loading' && <p>Checking certificate status…</p>}

        {status === 'error' && (
          <div>
            <p style={{ color: '#b91c1c', fontWeight: 700 }}>Verification unavailable</p>
            <p>{error}</p>
          </div>
        )}

        {status === 'valid' && certificate && (
          <div>
            <p style={{ fontSize: 28, color: '#166534', fontWeight: 700 }}>✅ Verified</p>
            <p><strong>Certificate No:</strong> {certificate.certificateNumber}</p>
            <p><strong>Type:</strong> {certificate.certificateType}</p>
            <p><strong>Issued:</strong> {new Date(certificate.issuedDate).toLocaleDateString()}</p>
            <p><strong>Status:</strong> {certificate.status}</p>
            <p><strong>Verification ID:</strong> {certificate.verifyId}</p>
          </div>
        )}

        {status === 'invalid' && certificate && (
          <div>
            <p style={{ fontSize: 28, color: '#b91c1c', fontWeight: 700 }}>⚠️ Invalid or revoked</p>
            <p><strong>Certificate No:</strong> {certificate.certificateNumber}</p>
            <p><strong>Status:</strong> {certificate.status}</p>
            {certificate.revocationReason && <p><strong>Reason:</strong> {certificate.revocationReason}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
