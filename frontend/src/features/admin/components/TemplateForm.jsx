import React, { useState, useEffect, useCallback } from 'react';
import CertificateTemplateEditor from './CertificateTemplateEditor';
import {
  getAllTemplates,
  getTemplateByType,
  createTemplate,
  updateTemplate,
  activateTemplate
} from '../services/admin.service';
import Toast from '../../../shared/components/Toast';
import './TemplateForm.css';

const CERTIFICATE_TYPES = [
  { value: 'completion_certificate', label: 'Internship Completion Certificate' },
  { value: 'bonafide', label: 'Bonafide Certificate' },
  { value: 'offer_letter', label: 'Internship Offer Letter' },
  { value: 'ojt_certificate', label: 'On-the-Job Training Certificate' },
  { value: 'experience_letter', label: 'Experience Letter' },
  { value: 'intern_of_month', label: 'Intern of the Month Award' },
  { value: 'league_winner', label: 'League Winner Certificate' },
  { value: 'custom', label: 'Custom Recognition Certificate' }
];

/**
 * TemplateForm Component
 *
 * Allows Administrator to visually create and edit certificate templates
 * using GrapesJS CertificateTemplateEditor instead of raw textarea markup.
 */
export default function TemplateForm() {
  const [selectedType, setSelectedType] = useState('completion_certificate');
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Form fields
  const [templateCode, setTemplateCode] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [htmlContent, setHtmlContent] = useState('');

  // Fetch active template for the selected certificate type
  const loadTemplate = useCallback(async (type) => {
    setLoading(true);
    setToast(null);
    try {
      const res = await getTemplateByType(type);
      const data = res?.template;
      if (data) {
        setTemplate(data);
        setTemplateCode(data.templateCode || '');
        setTemplateName(data.templateName || '');
        setTitle(data.title || '');
        setDescription(data.description || '');
        setHtmlContent(data.content || '');
      } else {
        setTemplate(null);
        setHtmlContent('<div>{{fullName}}</div>');
      }
    } catch (err) {
      // 404 means no active template yet for this type
      setTemplate(null);
      setTemplateCode(`TPL-${type.toUpperCase().slice(0, 4)}-01`);
      setTemplateName(`${type.replace(/_/g, ' ')} Template`);
      setTitle(type.replace(/_/g, ' '));
      setHtmlContent('<div><h1>Certificate</h1><h2>{{fullName}}</h2></div>');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplate(selectedType);
  }, [selectedType, loadTemplate]);

  // Save template from visual editor
  const handleSaveEditor = async (newHtml) => {
    setToast(null);
    setHtmlContent(newHtml);

    try {
      if (template?._id) {
        // Update existing template
        const payload = {
          templateName: templateName || template.templateName,
          title: title || template.title,
          description,
          content: newHtml
        };
        const updated = await updateTemplate(template._id, payload);
        setTemplate(updated.template || { ...template, ...payload });
        setToast({
          type: 'success',
          message: `✓ Template for '${selectedType}' updated successfully.`
        });
      } else {
        // Create new template
        const payload = {
          templateCode: templateCode || `TPL-${Date.now()}`,
          templateName: templateName || `${selectedType} Template`,
          certificateType: selectedType,
          title: title || 'Certificate',
          description,
          content: newHtml,
          status: 'active'
        };
        const created = await createTemplate(payload);
        setTemplate(created.template);
        setToast({
          type: 'success',
          message: `✓ New template created and activated for '${selectedType}'.`
        });
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err.message || 'Failed to save template.'
      });
      throw err;
    }
  };

  // Activate template if draft
  const handleActivate = async () => {
    if (!template?._id) return;
    try {
      await activateTemplate(template._id);
      setToast({
        type: 'success',
        message: '✓ Template is now active for PDF generation.'
      });
      loadTemplate(selectedType);
    } catch (err) {
      setToast({
        type: 'error',
        message: err.message || 'Failed to activate template.'
      });
    }
  };

  return (
    <div className="template-form-shell">
      {/* Type Selector Bar */}
      <div className="template-form-header">
        <div>
          <h2>Visual Certificate Template Studio</h2>
          <p>Visually customize layout, branding, fonts, and placeholders for each credential type.</p>
        </div>

        <div className="template-type-select-wrap">
          <label htmlFor="certificate-type-select">Certificate Type:</label>
          <select
            id="certificate-type-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            {CERTIFICATE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {toast && (
        <div style={{ marginBottom: '16px' }}>
          <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
        </div>
      )}

      {/* Meta Controls */}
      <div className="template-meta-bar">
        <div className="template-meta-item">
          <label>Template Code:</label>
          <input
            type="text"
            value={templateCode}
            onChange={(e) => setTemplateCode(e.target.value)}
            disabled={!!template?._id}
            placeholder="e.g. TPL-COMP-01"
          />
        </div>

        <div className="template-meta-item">
          <label>Display Title:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Certificate Title"
          />
        </div>

        <div className="template-meta-status">
          <span>Status: <strong>{template?.status || 'New'}</strong></span>
          {template?.status !== 'active' && template?._id && (
            <button type="button" className="template-activate-btn" onClick={handleActivate}>
              Set as Active
            </button>
          )}
        </div>
      </div>

      {/* Visual Editor Workspace */}
      {loading ? (
        <div className="template-loading-box">
          <p>Loading template layout...</p>
        </div>
      ) : (
        <CertificateTemplateEditor
          key={`${selectedType}-${template?._id || 'new'}`}
          initialHtml={htmlContent}
          onSave={handleSaveEditor}
          title={`Editing: ${CERTIFICATE_TYPES.find((t) => t.value === selectedType)?.label || selectedType}`}
        />
      )}
    </div>
  );
}
