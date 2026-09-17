import "./TemplateForm.css";
import { useEffect, useState } from "react";

const CERTIFICATE_TYPES = [
  "offer_letter",
  "bonafide",
  "ojt_certificate",
  "experience_letter",
  "completion_certificate",
  "intern_of_month",
  "league_winner",
  "custom",
];

const EMPTY_FORM = {
  name: "",
  certificateType: "completion_certificate",

  htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />

  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
    }

    body {
      font-family: Georgia, "Times New Roman", serif;
      background: white;
      color: #1f2937;
    }

    .certificate {
      width: 297mm;
      height: 210mm;
      padding: 5mm;
      background: #ffffff;
      border: 7mm solid #0867d8;
    }

    .certificate-inner {
      width: 100%;
      height: 100%;
      border: 0.7mm solid #d6ad32;
      padding: 18mm 25mm;
      position: relative;
      text-align: center;
    }

    .brand {
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 2px;
      color: #0867d8;
      margin-bottom: 8mm;
    }

    .title {
      margin: 0;
      font-size: 32px;
      letter-spacing: 5px;
      font-weight: bold;
      color: #1f2937;
    }

    .subtitle {
      margin-top: 4mm;
      font-size: 15px;
      letter-spacing: 3px;
      color: #6b7280;
    }

    .intro {
      margin-top: 4mm;
      font-size: 15px;
      color: #4b5563;
    }

    .intern-name {
      margin: 5mm 0 3mm;
      font-size: 34px;
      font-weight: bold;
      color: #0867d8;
    }

    .domain {
      font-size: 18px;
      font-weight: bold;
      color: #1f2937;
    }

    .dates {
      margin-top: 3mm;
      font-size: 13px;
      color: #6b7280;
    }

    .details {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      position: absolute;
      left: 25mm;
      right: 25mm;
      bottom: 16mm;
    }

    .detail-block {
      text-align: left;
      font-size: 11px;
      color: #6b7280;
    }

    .detail-block.right {
      text-align: right;
    }

    .detail-label {
      font-weight: bold;
      color: #1f2937;
    }

    .verification {
      position: absolute;
      bottom: 6mm;
      left: 0;
      right: 0;
      font-size: 9px;
      color: #9ca3af;
    }

    .signature {
      position: absolute;
      bottom: 15mm;
      left: 50%;
      transform: translateX(-50%);
      width: 45mm;
      border-top: 1px solid #9ca3af;
      padding-top: 2mm;
      font-size: 10px;
      color: #6b7280;
    }
  </style>
</head>

<body>
  <div class="certificate">
    <div class="certificate-inner">

      <div class="brand">
        UPTOSKILLS
      </div>

      <h1 class="title">
        CERTIFICATE
      </h1>

      <div class="subtitle">
        OF INTERNSHIP COMPLETION
      </div>

      <div class="intro">
        This certificate is proudly presented to
      </div>

      <div class="intern-name">
        {{fullName}}
      </div>

      <div class="domain">
        {{domain}}
      </div>

      <div class="dates">
        Internship Period: {{startDate}} — {{endDate}}
      </div>

      <div class="signature">
        Authorized Signatory
      </div>

      <div class="details">
        <div class="detail-block">
          <div class="detail-label">Certificate ID</div>
          {{certificateNumber}}
        </div>

        <div class="detail-block right">
          <div class="detail-label">Issued On</div>
          {{issueDate}}
        </div>
      </div>

      <div class="verification">
        Verification Code: {{verificationCode}}
      </div>

    </div>
  </div>
</body>
</html>`,
};

const prettyType = (value) => value.replaceAll("_", " ");

export default function TemplateForm({
  editingTemplate,
  onSave,
  onCancel,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // When editing, load selected template into form
  useEffect(() => {
    if (!editingTemplate) {
      setForm(EMPTY_FORM);
      return;
    }

    setForm({
      name:
        editingTemplate.name ||
        editingTemplate.templateName ||
        "",

      certificateType:
        editingTemplate.certificateType ||
        CERTIFICATE_TYPES[0],

      htmlContent:
        editingTemplate.htmlContent ||
        editingTemplate.content ||
        "",
    });
  }, [editingTemplate]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    setError(null);

    // Basic validation
    if (
      !form.name.trim() ||
      !form.htmlContent.trim()
    ) {
      setError(
        "Template name and HTML content are required."
      );

      return;
    }

    setSaving(true);

    try {
      await onSave({
        name: form.name.trim(),
        certificateType: form.certificateType,
        htmlContent: form.htmlContent,
      });

      // Clear form after creating
      if (!editingTemplate) {
        setForm(EMPTY_FORM);
      }
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="template-form-panel"
      aria-labelledby="template-form-title"
    >
      <div className="template-panel-heading">

        <div className="admin-form-icon">
          HTML
        </div>

        <div>
          <p className="admin-eyebrow">
            TEMPLATE MANAGEMENT
          </p>

          <h2 id="template-form-title">
            {editingTemplate
              ? "Edit template"
              : "Create a template"}
          </h2>

          <p>
            Create the HTML that will be used later
            to generate certificate drafts.
          </p>
        </div>

      </div>

      <form onSubmit={submit}>

        <div className="admin-form-grid">

          {/* Template Name */}
          <label className="admin-field">
            <span>Template name</span>

            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                updateField(
                  "name",
                  event.target.value
                )
              }
              placeholder="Internship Completion Certificate"
              required
            />
          </label>

          {/* Certificate Type */}
          <label className="admin-field">
            <span>Certificate type</span>

            <select
              value={form.certificateType}
              onChange={(event) =>
                updateField(
                  "certificateType",
                  event.target.value
                )
              }
            >
              {CERTIFICATE_TYPES.map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {prettyType(type)}
                </option>
              ))}
            </select>
          </label>

        </div>

        {/* HTML Content */}
        <label className="admin-field template-html-field">

          <span>HTML content</span>

          <textarea
            value={form.htmlContent}
            onChange={(event) =>
              updateField(
                "htmlContent",
                event.target.value
              )
            }
            rows={15}
            placeholder="Write the certificate HTML here..."
            required
          />

        </label>

        {/* Error */}
        {error && (
          <p
            className="admin-status error"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Buttons */}
        <div className="template-form-actions">

          <button
            className="admin-submit"
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : editingTemplate
                ? "Update template"
                : "Create template"}
          </button>

          {editingTemplate && (
            <button
              type="button"
              className="template-secondary-button"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
          )}

        </div>

      </form>
    </section>
  );
}