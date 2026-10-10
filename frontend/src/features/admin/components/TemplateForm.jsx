import "./TemplateForm.css";
import { useState } from "react";
import CertificateTemplateEditor from "./CertificateTemplateEditor";
import {
  DEFAULT_CERTIFICATE_DOCUMENT,
  getTemplateForCertificateType,
} from "./certificatePresets";

const CERTIFICATE_TYPES = [
  "offer_letter",
  "bonafide",
  "ojt_certificate",
  "experience_letter",
  "experience_letter_detailed",
  "completion_certificate",
  "intern_of_month",
  "league_winner",
  "custom",
];

const DEFAULT_HTML = DEFAULT_CERTIFICATE_DOCUMENT;

const EMPTY_FORM = {
  name: "",
  templateCode: "",
  title: "",
  certificateType: "completion_certificate",
  htmlContent: DEFAULT_HTML,
};

const prettyType = (value) => value.replaceAll("_", " ");

export default function TemplateForm({
  editingTemplate,
  templates = [],
  onSave,
  onCancel,
}) {
  const [prevEditingTemplate, setPrevEditingTemplate] = useState(editingTemplate);
  const [form, setForm] = useState(() => (
    editingTemplate
      ? {
          name: editingTemplate.name || editingTemplate.templateName || "",
          templateCode: editingTemplate.templateCode || "",
          title: editingTemplate.title || editingTemplate.name || "",
          certificateType:
            editingTemplate.certificateType || "completion_certificate",
          htmlContent:
            editingTemplate.htmlContent ||
            editingTemplate.content ||
            DEFAULT_HTML,
        }
      : EMPTY_FORM
  ));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (editingTemplate !== prevEditingTemplate) {
    setPrevEditingTemplate(editingTemplate);
    setForm(
      editingTemplate
        ? {
            name: editingTemplate.name || editingTemplate.templateName || "",
            templateCode: editingTemplate.templateCode || "",
            title: editingTemplate.title || editingTemplate.name || "",
            certificateType:
              editingTemplate.certificateType || "completion_certificate",
            htmlContent:
              editingTemplate.htmlContent ||
              editingTemplate.content ||
              DEFAULT_HTML,
          }
        : EMPTY_FORM
    );
  }

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCertificateTypeChange = (newType) => {
    const matching =
      templates.find((t) => t.certificateType === newType && t.status === "active") ||
      templates.find((t) => t.certificateType === newType);

    const newHtml =
      matching?.content ||
      matching?.htmlContent ||
      getTemplateForCertificateType(newType);

    const pretty = prettyType(newType)
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    const defaultTitle = matching?.title || pretty;
    const defaultName = matching?.templateName || `${pretty} Template`;
    const defaultCode =
      matching?.templateCode ||
      `TPL-${newType.toUpperCase().replace(/_/g, "-")}-01`;

    setForm((current) => ({
      ...current,
      certificateType: newType,
      htmlContent: newHtml,
      name: !editingTemplate ? defaultName : current.name,
      title: !editingTemplate ? defaultTitle : current.title,
      templateCode: !editingTemplate ? defaultCode : current.templateCode,
    }));
  };

  const submit = async (event) => {
    if (event?.preventDefault) event.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.htmlContent.trim()) {
      setError("Template name and HTML content are required.");
      return;
    }

    if (!/\{\{\s*(fullName|internName|studentName)\s*\}\}/i.test(form.htmlContent)) {
      setError("Certificate HTML must include a recipient name placeholder (such as {{fullName}} or {{InternName}}).");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        templateName: form.name.trim(),
        templateCode: form.templateCode.trim() || undefined,
        title: form.title.trim() || form.name.trim(),
        certificateType: form.certificateType,
        htmlContent: form.htmlContent,
      });

      if (!editingTemplate) setForm(EMPTY_FORM);
    } catch (saveError) {
      setError(saveError?.message || "Unable to save certificate template.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="template-form-panel"
      aria-labelledby="template-form-title"
    >
      <form onSubmit={submit}>
        <div className="template-top-fields-card">
          <div className="template-top-grid">
            <label className="template-top-field">
              <span className="template-top-label">TEMPLATE NAME</span>
              <input
                type="text"
                className="template-top-input"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="ojt Template"
                required
              />
            </label>

            <label className="template-top-field">
              <span className="template-top-label">TEMPLATE CODE</span>
              <input
                type="text"
                className="template-top-input"
                value={form.templateCode}
                onChange={(event) =>
                  updateField("templateCode", event.target.value)
                }
                placeholder="TPL-OJT-01"
              />
            </label>

            <label className="template-top-field">
              <span className="template-top-label">CERTIFICATE TITLE</span>
              <input
                type="text"
                className="template-top-input"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="OJT"
              />
            </label>

            <label className="template-top-field">
              <span className="template-top-label">CERTIFICATE TYPE</span>
              <select
                className="template-top-input template-top-select"
                value={form.certificateType}
                onChange={(event) =>
                  handleCertificateTypeChange(event.target.value)
                }
              >
                {CERTIFICATE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {prettyType(type)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="template-editor-wrapper">
          <CertificateTemplateEditor
            key={`${editingTemplate?._id || "new"}-${form.certificateType}`}
            initialHtml={form.htmlContent}
            onChange={(html) => updateField("htmlContent", html)}
            onSaveTemplate={submit}
            saving={saving}
            templateTitle={form.title || form.name}
          />
        </div>

        {error && (
          <p className="admin-status error" role="alert" style={{ marginTop: "12px" }}>
            {error}
          </p>
        )}

        {editingTemplate && (
          <div className="template-form-cancel-row">
            <button
              type="button"
              className="template-secondary-button"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel Editing
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
