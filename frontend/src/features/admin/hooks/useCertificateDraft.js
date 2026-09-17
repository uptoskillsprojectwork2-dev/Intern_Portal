import { useEffect, useState } from "react";
import {
  getCertificateDraft,
  updateCertificateDraft,
} from "../services/admin.service";

const useCertificateDraft = (id) => {
  const [draft, setDraft] = useState(null);
  const [htmlContent, setHtmlContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchDraft = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const data = await getCertificateDraft(id);

      const certificate = data.certificate || data;

      setDraft(certificate);
      setHtmlContent(certificate.htmlContent || "");
    } catch (err) {
      console.error("Failed to fetch certificate draft:", err);

      setError(
        err.response?.data?.message ||
        "Failed to load certificate draft"
      );
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!id) return;

    try {
      setSaving(true);
      setError(null);

      const data = await updateCertificateDraft(
        id,
        htmlContent
      );

      const updated = data.certificate || data;

      setDraft(updated);
      setHtmlContent(updated.htmlContent || htmlContent);

      return updated;
    } catch (err) {
      console.error("Failed to update certificate draft:", err);

      setError(
        err.response?.data?.message ||
        "Failed to save certificate draft"
      );

      throw err;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchDraft();
  }, [id]);

  return {
    draft,
    htmlContent,
    setHtmlContent,
    loading,
    saving,
    error,
    fetchDraft,
    saveDraft,
  };
};

export default useCertificateDraft;