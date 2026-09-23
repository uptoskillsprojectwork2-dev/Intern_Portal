import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import CertificatePreview from "../components/CertificatePreview";
import useCertificateDraft from "../hooks/useCertificateDraft";
import { finalizeCertificate } from "../services/admin.service";
import "./CertificateReviewPage.css";

export default function CertificateReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    draft,
    htmlContent,
    setHtmlContent,
    loading,
    saving,
    error,
    saveDraft,
  } = useCertificateDraft(id);

  const [finalizing, setFinalizing] = React.useState(false);
  const [finalizeError, setFinalizeError] = React.useState("");

  const handleSave = async () => {
    try {
      await saveDraft();
      window.alert("Certificate draft saved successfully.");
    } catch {
      // The hook already stores the error message.
    }
  };

  const handleFinalize = async () => {
    try {
      setFinalizing(true);
      setFinalizeError("");

      // Make sure the latest HTML edits are saved before finalizing.
      await saveDraft();

      await finalizeCertificate(id);

      window.alert(
        "Certificate finalized successfully and sent to the intern's email."
      );

      navigate("/admin/dashboard");
    } catch (err) {
      setFinalizeError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to finalize and send certificate."
      );
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <main className="certificate-review-page">
        <div className="certificate-review-card">
          <p>Loading certificate draft...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="certificate-review-page">
        <div className="certificate-review-card">
          <h2>Unable to load certificate draft</h2>
          <p>{error}</p>

          <button
            type="button"
            className="review-back-button"
            onClick={() => navigate("/admin/dashboard")}
          >
            ← Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="certificate-review-page">
      <header className="certificate-review-header">
        <div>
          <button
            type="button"
            className="review-back-button"
            onClick={() => navigate("/admin/dashboard")}
          >
            ← Back to dashboard
          </button>

          <p className="admin-eyebrow">CERTIFICATE REVIEW</p>

          <h1>Review certificate draft</h1>

          <p>
            Certificate ID: <strong>{id}</strong>
          </p>

          {draft?.requestId?.requestNumber && (
            <p>
              Request: <strong>{draft.requestId.requestNumber}</strong>
            </p>
          )}
        </div>

        <div className="certificate-review-actions">
          <button
            type="button"
            className="review-save-button"
            onClick={handleSave}
            disabled={saving || finalizing}
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>

          <button
            type="button"
            className="review-finalize-button"
            onClick={handleFinalize}
            disabled={saving || finalizing}
          >
            {finalizing ? "Finalizing & Sending..." : "Finalize & Send"}
          </button>
        </div>
      </header>

      {finalizeError && (
        <div className="certificate-review-error">
          {finalizeError}
        </div>
      )}

      <section className="certificate-review-grid">
        <div className="certificate-review-card">
          <div className="certificate-review-card-heading">
            <h2>Edit HTML</h2>
            <span>Live draft</span>
          </div>

          <textarea
            className="certificate-review-editor"
            value={htmlContent}
            onChange={(event) => setHtmlContent(event.target.value)}
            spellCheck="false"
          />
        </div>

        <div className="certificate-review-card">
          <div className="certificate-review-card-heading">
            <h2>Preview</h2>
            <span>Live HTML</span>
          </div>

          <CertificatePreview html={htmlContent} />
        </div>
      </section>
    </main>
  );
}