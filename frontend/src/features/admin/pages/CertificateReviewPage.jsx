import { useState } from 'react';
import CertificatePreview from '../components/CertificatePreview';
import useCertificateDraft from '../hooks/useCertificateDraft';
import './CertificateReviewPage.css';

const CertificateReviewPage = () => {
  const {
    draft,
    loading,
    error,
  } = useCertificateDraft();

  const [html, setHtml] = useState(`
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      text-align: center;
      padding: 80px 40px;
    }

    .certificate {
      border: 8px solid #222;
      padding: 60px 30px;
      min-height: 400px;
    }

    h1 {
      font-size: 36px;
      margin-bottom: 30px;
    }

    h2 {
      font-size: 28px;
    }

    p {
      font-size: 18px;
    }
  </style>
</head>

<body>
  <div class="certificate">
    <h1>Certificate of Internship</h1>

    <p>This certificate is proudly presented to</p>

    <h2>Candidate Name</h2>

    <p>
      for successfully completing the internship program.
    </p>

    <p>UPTOSKILL</p>
  </div>
</body>
</html>
  `);

  return (
    <div className="certificate-review-page">
      <div className="certificate-review-header">
        <p className="admin-eyebrow">CERTIFICATE ENGINE</p>

        <h1>Review Certificate</h1>

        <p>
          Review and edit the certificate before finalization.
        </p>
      </div>

      {loading && <p>Loading certificate draft...</p>}

      {error && <p>{error}</p>}

      {draft && (
        <p>
          Draft: {draft.certificateNumber || draft.id || 'Certificate'}
        </p>
      )}

      <div className="certificate-review-layout">
        <section className="certificate-editor">
          <div className="review-card-header">
            <h2>Edit Certificate HTML</h2>
            <span>Draft</span>
          </div>

          <textarea
            value={html}
            onChange={(event) => setHtml(event.target.value)}
            className="certificate-html-editor"
            spellCheck="false"
          />
        </section>

        <section className="certificate-preview-panel">
          <div className="review-card-header">
            <h2>Preview</h2>
          </div>

          <CertificatePreview html={html} />
        </section>
      </div>
    </div>
  );
};

export default CertificateReviewPage;