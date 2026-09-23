import { useState } from 'react';

const TYPES = [
  ['offer_letter', 'Offer Letter'],
  ['bonafide', 'Bonafide'],
  ['ojt_certificate', 'OJT Certificate'],
  ['experience_letter', 'Experience Letter'],
  ['completion_certificate', 'Completion Certificate'],
  ['intern_of_month', 'Intern of the Month'],
  ['league_winner', 'League Winner'],
  ['custom', 'Custom'],
];

const DYNAMIC_FIELDS = [
  ['{{fullName}}', "Intern's full name"],
  ['{{name}}', "Intern's name"],
  ['{{email}}', "Intern's email"],
  ['{{mobileNo}}', 'Mobile number'],
  ['{{internCode}}', 'Intern code'],
  ['{{domain}}', 'Internship domain'],
  ['{{startDate}}', 'Internship start date'],
  ['{{endDate}}', 'Internship end date'],
  ['{{requestNumber}}', 'Certificate ID'],
  ['{{certificateType}}', 'Certificate type'],
  ['{{reason}}', 'Certificate reason'],
  ['{{requestId}}', 'Request ID'],
];

const emptyForm = {
  name: '',
  certificateType: 'completion_certificate',
  htmlContent: '',
  isActive: true,
};

const getFormFromTemplate = (template) => (
  template
    ? {
        name: template.name || '',
        certificateType:
          template.certificateType || 'completion_certificate',
        htmlContent: template.htmlContent || '',
        isActive: Boolean(template.isActive),
      }
    : emptyForm
);

const buildPreviewHtml = (html) => {
  if (!html) {
    return `
      <!DOCTYPE html>
      <html>
        <body style="
          margin:0;
          padding:40px;
          font-family:Arial, sans-serif;
          color:#6b7280;
          background:#f8fafc;
          text-align:center;
        ">
          <h3 style="margin-bottom:8px;">Certificate Preview</h3>
          <p>Enter HTML content to see the certificate preview.</p>
        </body>
      </html>
    `;
  }

  return html
    .replaceAll('{{fullName}}', 'Alex Johnson')
    .replaceAll('{{name}}', 'Alex Johnson')
    .replaceAll('{{domain}}', 'Full Stack Development')
    .replaceAll('{{startDate}}', 'August 1, 2026')
    .replaceAll('{{endDate}}', 'September 1, 2026')
    .replaceAll('{{internCode}}', 'UPT-2026-001')
    .replaceAll('{{requestNumber}}', 'CERT-2026-0001')
    .replaceAll('{{certificateType}}', 'completion_certificate')
    .replaceAll('{{email}}', 'alex@example.com')
    .replaceAll('{{mobileNo}}', '+91 98765 43210')
    .replaceAll('{{reason}}', 'Internship completion')
    .replaceAll('{{requestId}}', 'REQ-2026-0001');
};

export default function TemplateForm({ template, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => getFormFromTemplate(template));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [copiedField, setCopiedField] = useState('');

  const change = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const copyField = async (field) => {
    try {
      await navigator.clipboard.writeText(field);

      setCopiedField(field);

      setTimeout(() => {
        setCopiedField('');
      }, 1500);
    } catch {
      setCopiedField('');
    }
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.htmlContent.trim()) {
      setError('Template name and HTML content are required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
      });

      if (!template) {
        setForm(emptyForm);
      }
    } catch (submitError) {
      setError(
        submitError.message || 'Unable to save template.'
      );
    } finally {
      setSaving(false);
    }
  };

  const previewHtml = buildPreviewHtml(form.htmlContent);

  return (
    <form className="template-form" onSubmit={submit}>
      <div className="template-form-heading">
        <div>
          <p className="admin-eyebrow">
            {template ? 'EDIT TEMPLATE' : 'NEW TEMPLATE'}
          </p>

          <h3>
            {template
              ? 'Edit certificate template'
              : 'Create certificate template'}
          </h3>
        </div>

        {template && (
          <button
            type="button"
            className="template-secondary-button"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>

      <div className="template-form-grid">
        <label className="admin-field">
          <span>Name</span>

          <input
            value={form.name}
            onChange={(event) =>
              change('name', event.target.value)
            }
            placeholder="Internship Completion"
          />
        </label>

        <label className="admin-field">
          <span>Certificate type</span>

          <select
            value={form.certificateType}
            onChange={(event) =>
              change(
                'certificateType',
                event.target.value
              )
            }
          >
            {TYPES.map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Dynamic fields */}
      <div
        className="dynamic-fields-panel"
        style={{
          marginTop: '20px',
          marginBottom: '20px',
          padding: '18px',
          border: '1px solid #d8dce8',
          borderRadius: '12px',
          background: '#f8f9fd',
        }}
      >
        <div
          style={{
            marginBottom: '12px',
          }}
        >
          <strong
            style={{
              display: 'block',
              fontSize: '14px',
              marginBottom: '4px',
              color: '#172033',
            }}
          >
            Dynamic Fields
          </strong>

          <small
            style={{
              fontSize: '12px',
              color: '#6b7280',
            }}
          >
            Use these placeholders to automatically insert
            intern-specific information into every certificate.
          </small>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '8px',
          }}
        >
          {DYNAMIC_FIELDS.map(([field, description]) => (
            <button
              key={field}
              type="button"
              onClick={() => copyField(field)}
              title={`Copy ${field}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d8dce8',
                borderRadius: '8px',
                background: '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>
                <span
                  style={{
                    display: 'block',
                    fontFamily:
                      '"SFMono-Regular", Consolas, monospace',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#4f46b5',
                    marginBottom: '3px',
                  }}
                >
                  {field}
                </span>

                <span
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    color: '#6b7280',
                  }}
                >
                  {description}
                </span>
              </span>

              <span
                style={{
                  flexShrink: 0,
                  fontSize: '10px',
                  color:
                    copiedField === field
                      ? '#059669'
                      : '#7c8194',
                  fontWeight: '700',
                }}
              >
                {copiedField === field
                  ? 'Copied'
                  : 'Copy'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <label className="admin-field template-html-field">
        <span>HTML content</span>

        <textarea
          value={form.htmlContent}
          onChange={(event) =>
            change('htmlContent', event.target.value)
          }
          placeholder={`<div class="certificate">
  <h1>Certificate of Completion</h1>

  <p>
    This certifies that
    <strong>{{fullName}}</strong>
    completed an internship in
    {{domain}}.
  </p>

  <p>
    {{startDate}} – {{endDate}}
  </p>

  <p>
    Intern Code: {{internCode}}
  </p>
</div>`}
          rows={13}
        />

        <div
          className="certificate-live-preview"
          style={{
            marginTop: '24px',
            border: '1px solid #d8dce8',
            borderRadius: '12px',
            background: '#f8fafc',
            overflow: 'hidden',
          }}
        >
          <div
            className="certificate-preview-heading"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid #d8dce8',
              background: '#ffffff',
            }}
          >
            <div>
              <strong
                style={{
                  display: 'block',
                  fontSize: '14px',
                  color: '#172033',
                }}
              >
                Live Preview
              </strong>

              <small
                style={{
                  color: '#6b7280',
                  fontSize: '11px',
                }}
              >
                Sample certificate data
              </small>
            </div>

            <span
              style={{
                fontSize: '11px',
                padding: '5px 9px',
                borderRadius: '999px',
                background: '#eef2ff',
                color: '#4338ca',
              }}
            >
              Preview
            </span>
          </div>

          <div
            style={{
              padding: '20px',
              overflow: 'auto',
              background: '#eef1f7',
            }}
          >
            <iframe
              title="Certificate live preview"
              srcDoc={previewHtml}
              sandbox=""
              style={{
                display: 'block',
                width: '100%',
                minHeight: '650px',
                border: '1px solid #cfd5e2',
                borderRadius: '6px',
                background: '#ffffff',
                boxShadow:
                  '0 8px 25px rgba(15, 23, 42, 0.08)',
              }}
            />
          </div>
        </div>
      </label>

      <label className="template-active-checkbox">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(event) =>
            change('isActive', event.target.checked)
          }
        />

        <span>
          Make this template active for its certificate type
        </span>
      </label>

      {error && (
        <p className="admin-status error" role="alert">
          {error}
        </p>
      )}

      <button
        className="template-primary-button"
        type="submit"
        disabled={saving}
      >
        {saving
          ? 'Saving…'
          : template
            ? 'Save changes'
            : 'Create template'}
      </button>
    </form>
  );
}