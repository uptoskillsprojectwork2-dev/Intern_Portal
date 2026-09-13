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
  certificateType: CERTIFICATE_TYPES[0],
  htmlContent: `<!DOCTYPE html>
<html>
  <body>
    <h1>Certificate of Completion</h1>

    <p>
      This certifies that {{fullName}}
      has successfully completed the internship.
    </p>
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