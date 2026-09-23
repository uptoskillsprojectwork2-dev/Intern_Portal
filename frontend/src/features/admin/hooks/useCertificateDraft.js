import { useEffect, useState } from "react";
import {
  getCertificateDraft,
  updateCertificateDraft,
} from "../services/admin.service.js";

const useCertificateDraft = (certificateId) => {
  const [draft, setDraft] = useState(null);
  const [htmlContent, setHtmlContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchDraft = async () => {
      if (!certificateId) {
        if (!cancelled) {
          setDraft(null);
          setHtmlContent("");
          setLoading(false);
        }
        return;
      }

      try {
        const response = await getCertificateDraft(certificateId);
        const certificate = response?.certificate;

        if (!cancelled) {
          setDraft(certificate || null);
          setHtmlContent(certificate?.htmlContent || "");
          setError("");
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message || "Failed to load certificate draft."
          );
          setLoading(false);
        }
      }
    };

    fetchDraft();

    return () => {
      cancelled = true;
    };
  }, [certificateId]);

  const saveDraft = async () => {
    if (!certificateId) {
      throw new Error("Certificate ID is required.");
    }

    try {
      setSaving(true);
      setError("");

      const response = await updateCertificateDraft(
        certificateId,
        htmlContent
      );

      const updatedCertificate = response?.certificate;

      setDraft(updatedCertificate || null);

      if (updatedCertificate?.htmlContent !== undefined) {
        setHtmlContent(updatedCertificate.htmlContent);
      }

      return updatedCertificate;
    } catch (err) {
      setError(
        err.message || "Failed to save certificate draft."
      );
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return {
    draft,
    htmlContent,
    setHtmlContent,
    loading,
    saving,
    error,
    saveDraft,
  };
};

export default useCertificateDraft;