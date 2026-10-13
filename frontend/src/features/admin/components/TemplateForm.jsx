import { useState, useEffect } from 'react';
import { getAllTemplates, getTemplateByType, createTemplate, updateTemplate } from '../services/admin.service';
import CertificateTemplateEditor from './CertificateTemplateEditor';
import Toast from '../../../shared/components/Toast';
import './TemplateForm.css';

const TEMPLATE_TYPES = [
  { type: 'completion_certificate', label: 'Completion Certificate' },
  { type: 'offer_letter', label: 'Offer Letter' },
  { type: 'bonafide', label: 'Bonafide Certificate' },
  { type: 'ojt', label: 'On-the-Job Training' },
  { type: 'experience_letter', label: 'Experience Letter' },
  { type: 'intern_of_the_month', label: 'Intern of the Month' },
  { type: 'league_winner', label: 'League Winner' },
  { type: 'custom', label: 'Custom Certificate' }
];

export default function TemplateForm() {
  const [selectedType, setSelectedType] = useState('completion_certificate');
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [initialHtml, setInitialHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Metadata form state
  const [templateName, setTemplateName] = useState('');
  const [templateCode, setTemplateCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const loadTemplate = async (type) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTemplateByType(type);
      if (data.template) {
        setCurrentTemplate(data.template);
        setInitialHtml(data.template.content || '');
        setTemplateName(data.template.templateName || '');
        setTemplateCode(data.template.templateCode || '');
        setTitle(data.template.title || '');
        setDescription(data.template.description || '');
      } else {
        setCurrentTemplate(null);
        setInitialHtml('');
      }
    } catch (err) {
      // 404 is okay (new template mode)
      setCurrentTemplate(null);
      setInitialHtml('');
      setTemplateName(`${type.replace(/_/g, ' ')} Template`);
      setTemplateCode(`TPL-${type.toUpperCase().slice(0, 4)}-01`);
      setTitle(type.replace(/_/g, ' ').toUpperCase());
      setDescription(`Template for ${type}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplate(selectedType);
  }, [selectedType]);

  const handleSaveHtml = async (htmlContent) => {
    setError(null);
    try {
      if (currentTemplate && currentTemplate._id) {
        // Update existing template
        const updated = await updateTemplate(currentTemplate._id, {
          templateName,
          title,
          description,
          content: htmlContent
        });
        setCurrentTemplate(updated.template);
        setToast({ type: 'success', message: `Updated template for ${selectedType}!` });
      } else {
        // Create new template
        const created = await createTemplate({
          templateCode: templateCode || `TPL-${selectedType.toUpperCase().slice(0, 4)}-01`,
          templateName: templateName || `${selectedType} Template`,
          certificateType: selectedType,
          title: title || selectedType,
          description,
          content: htmlContent
        });
        setCurrentTemplate(created.template);
        setToast({ type: 'success', message: `Created template for ${selectedType}!` });
      }
    } catch (err) {
      setError(err.message || 'Failed to save template');
      setToast({ type: 'error', message: err.message || 'Validation failed' });
      throw err;
    }
  };

  return (
    <div className="template-form-shell">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <header className="template-form-header">
        <div>
          <h2>Certificate Template Designer</h2>
          <p>Visually edit and customize master certificate layouts per type.</p>
        </div>

        <div className="type-selector-group">
          <label htmlFor="template-type-select">Select Certificate Type:</label>
          <select
            id="template-type-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            {TEMPLATE_TYPES.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {error && (
        <div className="template-form-error-banner">
          <span>⚠ {error}</span>
        </div>
      )}

      {loading ? (
        <div className="template-form-loading">
          <div className="spinner-ring" />
          <p>Loading template layout...</p>
        </div>
      ) : (
        <div className="template-form-body">
          <div className="template-meta-row">
            <div className="meta-field">
              <label>Template Name</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template Name"
              />
            </div>

            <div className="meta-field">
              <label>Template Code</label>
              <input
                type="text"
                value={templateCode}
                onChange={(e) => setTemplateCode(e.target.value)}
                placeholder="TPL-XXX-01"
                disabled={!!currentTemplate}
              />
            </div>

            <div className="meta-field">
              <label>Certificate Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Official Title"
              />
            </div>
          </div>

          <CertificateTemplateEditor
            key={currentTemplate?._id || selectedType}
            initialHtml={initialHtml}
            onSave={handleSaveHtml}
          />
        </div>
      )}
    </div>
  );
}
