import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCertificateDraft, updateCertificateDraft } from '../services/admin.service';
import './CertificateReviewPage.css';

const formatDisplayDate = (date) => {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default function CertificateReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [certificate, setCertificate] = useState(null);
  const [editedHtml, setEditedHtml] = useState('');
  const [initialHtml, setInitialHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let active = true;

    if (!id) {
      Promise.resolve().then(() => {
        if (active) {
          setError('No certificate ID provided');
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }

    getCertificateDraft(id)
      .then((response) => {
        if (!active) return;
        const cert = response.certificate || response;
        setCertificate(cert);
        const html = cert.htmlContent || '';
        setEditedHtml(html);
        setInitialHtml(html);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load certificate draft');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  const handleSave = async () => {
    if (saving) return;

    if (!editedHtml.trim()) {
      setError('Certificate HTML cannot be empty');
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await updateCertificateDraft(id, editedHtml);
      const updated = response.certificate || response;
      setCertificate((prev) => ({ ...prev, ...updated }));
      setInitialHtml(editedHtml);
      setFeedback(`Draft saved successfully at ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      setError(err.message || 'Failed to save certificate draft');
    } finally {
      setSaving(false);
    }
  };

  const hasUnsavedChanges = editedHtml !== initialHtml;

  if (loading) {
    return (
      <div className="cert-review-shell">
        <div className="cert-review-state-box">
          <h2>Loading Certificate Draft</h2>
          <p>Fetching certificate template and recipient data...</p>
        </div>
      </div>
    );
  }

  if (error && !certificate) {
    return (
      <div className="cert-review-shell">
        <div className="cert-review-state-box">
          <h2 style={{ color: 'var(--error, #ef4444)' }}>Certificate Unavailable</h2>
          <p>{error}</p>
          <button
            type="button"
            className="cert-review-back-btn"
            onClick={() => navigate('/admin/dashboard')}
          >
            ← Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const intern = certificate?.userId || {};
  const isEditable = certificate?.status === 'draft';

  return (
    <div className="cert-review-shell">
      {/* Top Navigation Bar */}
      <header className="cert-review-topbar">
        <div className="cert-review-nav">
          <button
            type="button"
            className="cert-review-back-btn"
            onClick={() => navigate('/admin/dashboard')}
          >
            ← Back
          </button>
          <div className="cert-review-title-group">
            <h1>
              <span>Review Certificate</span>
              <span className={`cert-status-tag ${certificate?.status}`}>
                {certificate?.status || 'draft'}
              </span>
            </h1>
          </div>
        </div>

        <div className="cert-review-top-actions">
          {hasUnsavedChanges && (
            <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>
              ● Unsaved changes
            </span>
          )}
          <button
            type="button"
            className="cert-save-btn"
            onClick={handleSave}
            disabled={saving || !isEditable || (!hasUnsavedChanges && !feedback)}
          >
            {saving ? 'Saving Draft...' : 'Save Draft'}
          </button>
        </div>
      </header>

      {/* Recipient / Certificate Metadata Strip */}
      <section className="cert-meta-bar" aria-label="Certificate Metadata">
        <div className="cert-meta-item">
          <span>Certificate Number</span>
          <strong>{certificate?.certificateNumber || '—'}</strong>
        </div>
        <div className="cert-meta-item">
          <span>Intern Name</span>
          <strong>{intern.fullName || '—'}</strong>
        </div>
        <div className="cert-meta-item">
          <span>Intern Code</span>
          <strong>{certificate?.internCode || intern.internCode || '—'}</strong>
        </div>
        <div className="cert-meta-item">
          <span>Domain</span>
          <strong>{certificate?.domain || intern.domain || '—'}</strong>
        </div>
        <div className="cert-meta-item">
          <span>Certificate Type</span>
          <strong>{certificate?.certificateType?.replace(/_/g, ' ') || '—'}</strong>
        </div>
        <div className="cert-meta-item">
          <span>Duration</span>
          <strong>
            {formatDisplayDate(certificate?.startDate || intern.startDate)} –{' '}
            {formatDisplayDate(certificate?.endDate || intern.endDate)}
          </strong>
        </div>
      </section>

      {/* Alerts */}
      {feedback && (
        <div className="cert-review-alert success" role="status" style={{ marginTop: '16px' }}>
          <span>✓ {feedback}</span>
          <button
            type="button"
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
            onClick={() => setFeedback(null)}
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="cert-review-alert error" role="alert" style={{ marginTop: '16px' }}>
          <span>⚠ {error}</span>
          <button
            type="button"
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Split Content Workspace */}
      <main className="cert-review-content">
        {/* Left Column: Source HTML Editor */}
        <section className="cert-panel" aria-label="HTML Source Editor">
          <div className="cert-panel-header">
            <h2>Source HTML Template</h2>
            <span className="cert-panel-tag">
              {editedHtml.length} characters · {isEditable ? 'Editable Draft' : 'Read-only'}
            </span>
          </div>
          <div className="cert-editor-container">
            <textarea
              className="cert-html-textarea"
              value={editedHtml}
              onChange={(e) => {
                setEditedHtml(e.target.value);
                if (feedback) setFeedback(null);
              }}
              disabled={!isEditable || saving}
              placeholder="Certificate HTML content..."
              spellCheck={false}
              aria-label="Certificate HTML editor"
            />
          </div>
        </section>

        {/* Right Column: Live Certificate Preview */}
        <section className="cert-panel" aria-label="Live Certificate Preview">
          <div className="cert-panel-header">
            <h2>Live Certificate Preview</h2>
            <span className="cert-panel-tag">Instant rendering</span>
          </div>
          <div className="cert-preview-container">
            <iframe
              className="cert-preview-frame"
              title="Certificate Live Preview"
              srcDoc={editedHtml}
              sandbox="allow-same-origin"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
