import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useCertificateDraft from "../hooks/useCertificateDraft";
import { finalizeCertificate } from "../services/admin.service";
import CertificatePreview from "../components/CertificatePreview";
import Loading from "../../shared/components/Loading";
import Toast from "../../shared/components/Toast";
import "./CertificateReviewPage.css";

const CertificateReviewPage = () => {
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

  const [finalizing, setFinalizing] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleSave = async () => {
    setActionError(null);
    setSuccessMessage(null);

    try {
      await saveDraft();
      setSuccessMessage("Draft saved successfully.");
    } catch (err) {
      setActionError(err.message || "Failed to save draft.");
    }
  };

  const handleFinalize = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to finalize and send this certificate? You will not be able to edit the draft afterward.",
    );

    if (!confirmed) return;

    setFinalizing(true);
    setActionError(null);
    setSuccessMessage(null);

    try {
      const response = await finalizeCertificate(id);

      if (response.emailSent === false) {
        setActionError(
          response.emailError ||
            "Certificate was finalized, but email delivery failed.",
        );
        return;
      }

      setSuccessMessage(
        response.message || "Certificate finalized and sent successfully.",
      );
    } catch (err) {
      setActionError(err.message || "Failed to finalize certificate.");
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return <Loading message="Loading certificate draft..." />;
  }

  if (error) {
    return <Toast message={error} type="error" />;
  }

  if (!draft) {
    return <div>Certificate draft not found.</div>;
  }

  return (
    <div className="certificate-review-page">
      <div className="certificate-review-heading">
        <button
          type="button"
          className="certificate-back-button"
          onClick={() => navigate("/admin/dashboard")}
        >
          <span className="back-arrow">←</span>
          Back to Dashboard
        </button>

        <p className="admin-eyebrow">CERTIFICATE DESK</p>

        <h1>Certificate Review</h1>

        <p>
          Review, edit and finalize the certificate before sending it to the
          intern.
        </p>
      </div>

      <Toast
        message={actionError}
        type="error"
        onClose={() => setActionError(null)}
      />

      <Toast
        message={successMessage}
        type="success"
        onClose={() => setSuccessMessage(null)}
      />

      <div className="certificate-review-layout">
        <section className="certificate-editor-panel">
          <div className="certificate-editor-header">
            <p className="admin-eyebrow">EDITOR</p>
            <h2>Edit Certificate HTML</h2>
          </div>

          <textarea
            className="certificate-html-editor"
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            disabled={finalizing}
            spellCheck={false}
          />

          <div className="certificate-review-actions">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || finalizing}
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>

            <button
              type="button"
              onClick={handleFinalize}
              disabled={saving || finalizing}
            >
              {finalizing ? "Finalizing & Sending..." : "Finalize & Send"}
            </button>
          </div>
        </section>

        <section className="certificate-preview-panel">
          <div className="certificate-editor-header">
            <p className="admin-eyebrow">PREVIEW</p>
            <h2>Certificate Preview</h2>
          </div>

          <CertificatePreview htmlContent={htmlContent} />
        </section>
      </div>
    </div>
  );
};

export default CertificateReviewPage;
