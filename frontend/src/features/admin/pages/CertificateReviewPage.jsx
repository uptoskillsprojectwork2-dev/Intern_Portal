import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useCertificateDraft from "../hooks/useCertificateDraft";
import { finalizeCertificate } from "../services/admin.service";
import CertificateTemplateEditor from "../components/CertificateTemplateEditor";
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
    return <div className="certificate-not-found">Certificate draft not found.</div>;
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
          Visually review, customize, and finalize the certificate draft before delivering it to the intern.
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

      {/* Review Action Bar */}
      <div className="certificate-review-action-bar">
        <div className="draft-meta-info">
          <span className="draft-badge">Active Draft</span>
          <span className="draft-cert-num">{draft.certificateNumber}</span>
          <span className="draft-intern-name">
            Recipient: <strong>{draft.userId?.fullName || draft.internCode}</strong> ({draft.userId?.email || ""})
          </span>
        </div>

        <div className="draft-action-buttons">
          <button
            type="button"
            className="btn-review-save"
            onClick={handleSave}
            disabled={saving || finalizing}
          >
            {saving ? "Saving Draft..." : "Save Draft"}
          </button>

          <button
            type="button"
            className="btn-review-finalize"
            onClick={handleFinalize}
            disabled={saving || finalizing}
          >
            {finalizing ? "Finalizing & Sending..." : "Finalize & Send"}
          </button>
        </div>
      </div>

      {actionError && (
        <div className="review-error-banner" role="alert">
          <span>{actionError}</span>
          <button
            type="button"
            className="btn-retry-action"
            onClick={() => {
              setActionError(null);
              handleSave();
            }}
          >
            Retry Save
          </button>
        </div>
      )}

      {/* Visual Editor Workspace */}
      <div className="certificate-review-editor-container">
        <CertificateTemplateEditor
          key={draft._id}
          initialHtml={htmlContent}
          onChange={setHtmlContent}
          onSave={handleSave}
          onSaveTemplate={handleSave}
          saving={saving}
          templateTitle={`${draft.certificateNumber || "Draft"} - ${draft.userId?.fullName || "Certificate"}`}
        />
      </div>
    </div>
  );
};

export default CertificateReviewPage;
