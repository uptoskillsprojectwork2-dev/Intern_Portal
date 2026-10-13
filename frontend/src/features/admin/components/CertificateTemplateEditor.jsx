import React, { useEffect, useRef, useState, useCallback } from 'react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import { getPlaceholders } from '../services/admin.service';
import Toast from '../../../shared/components/Toast';
import './CertificateTemplateEditor.css';

/**
 * Mock sample data for dynamic placeholder preview
 */
const SAMPLE_PREVIEW_DATA = {
  fullName: 'Alex Morgan',
  internCode: 'INT-2026-0089',
  domain: 'Full Stack Web Development',
  startDate: '12 Jan 2026',
  endDate: '12 Apr 2026',
  issueDate: '15 Apr 2026',
  requestNumber: 'CERT-2026-00089',
  certificateTitle: 'Internship Completion Certificate',
  qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=CERT-2026-00089',
  collegeName: 'National Institute of Technology',
  purpose: 'Academic Degree Fulfillment',
  duration: '3 Months',
  internshipRole: 'Frontend Developer Intern',
  stipend: '₹15,000 / month',
  reportingManager: 'Dr. Sarah Connor',
  mentorName: 'Er. Rajesh Kumar',
  trainingProgram: 'Full Stack Engineering Specialization',
  awardMonth: 'January 2026',
  eventName: 'National Innovation Hackathon',
  position: '1st Place Winner',
  eventDate: '12 Jan 2026',
  place: 'New Delhi'
};

/**
 * CertificateTemplateEditor
 *
 * GrapesJS visual editor component for certificate templates.
 * Enforces A4 landscape canvas (1123 x 794 px).
 * Saves combined <style>...</style> + HTML.
 * Cleans up editor instance on unmount to avoid memory leaks.
 */
export default function CertificateTemplateEditor({
  initialHtml = '',
  onSave,
  readOnly = false,
  title = 'Certificate Template Editor'
}) {
  const editorContainerRef = useRef(null);
  const editorRef = useRef(null);

  const [initializing, setInitializing] = useState(true);
  const [initError, setInitError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState(null);

  // Placeholders
  const [placeholders, setPlaceholders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPlaceholders, setShowPlaceholders] = useState(true);

  // Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  // Fetch placeholders from backend
  useEffect(() => {
    let isMounted = true;
    getPlaceholders()
      .then((res) => {
        if (isMounted) {
          const list = res?.placeholders || res?.data || [];
          setPlaceholders(list);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch placeholders:', err.message);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved template changes.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // Initialize GrapesJS Editor
  const initEditor = useCallback(() => {
    if (!editorContainerRef.current) return;

    if (editorRef.current) {
      editorRef.current.destroy();
      editorRef.current = null;
    }

    try {
      setInitializing(true);
      setInitError(null);

      const editor = grapesjs.init({
        container: editorContainerRef.current,
        fromElement: false,
        height: '794px',
        width: '1123px',
        canvas: {
          styles: [
            'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Inter:wght@300;400;500;600;700&display=swap'
          ]
        },
        storageManager: false, // In-memory state
        panels: {
          defaults: [
            {
              id: 'basic-actions',
              el: '.cert-gjs-panel-actions',
              buttons: [
                {
                  id: 'undo',
                  className: 'fa fa-undo',
                  command: 'core:undo'
                },
                {
                  id: 'redo',
                  className: 'fa fa-repeat',
                  command: 'core:redo'
                }
              ]
            }
          ]
        },
        blockManager: {
          appendTo: '#gjs-blocks',
          blocks: [
            {
              id: 'text-block',
              label: 'Text Element',
              category: 'Typography',
              content: '<div style="font-family: Inter, sans-serif; font-size: 14px; color: #333;">Editable certificate text block</div>'
            },
            {
              id: 'recipient-heading',
              label: 'Recipient Name',
              category: 'Typography',
              content: '<div style="font-family: \'Playfair Display\', serif; font-size: 36px; font-weight: bold; color: #14162e; border-bottom: 2px solid #b8962e; display: inline-block; padding-bottom: 4px;">{{fullName}}</div>'
            },
            {
              id: 'seal-badge',
              label: 'Seal Badge',
              category: 'Elements',
              content: '<div style="width: 76px; height: 76px; border: 2px solid #b8962e; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #b8962e; font-weight: bold;">SEAL</div>'
            }
          ]
        }
      });

      // Load initial content
      if (initialHtml) {
        editor.setComponents(initialHtml);
      }

      // Track modifications
      editor.on('update', () => {
        setIsDirty(true);
      });

      editorRef.current = editor;
      setInitializing(false);
    } catch (err) {
      console.error('GrapesJS initialization failed:', err);
      setInitError(err.message || 'Failed to initialize visual editor.');
      setInitializing(false);
    }
  }, [initialHtml]);

  useEffect(() => {
    initEditor();

    // Destroy on unmount to prevent memory leaks
    return () => {
      if (editorRef.current) {
        try {
          editorRef.current.destroy();
        } catch (e) {
          /* safe cleanup */
        }
        editorRef.current = null;
      }
    };
  }, [initEditor]);

  // Extract combined <style>...</style> + HTML
  const getCombinedHtml = () => {
    if (!editorRef.current) return '';
    const html = editorRef.current.getHtml();
    const css = editorRef.current.getCss();
    return `<style>\n${css}\n</style>\n${html}`;
  };

  // Insert placeholder tag into active text element or fallback to clipboard
  const handleInsertPlaceholder = (key) => {
    if (!editorRef.current) return;

    let inserted = false;
    try {
      const selected = editorRef.current.getSelected();
      
      // Check if a component is selected and is a text-compatible component or has text content
      if (selected) {
        const isTextComponent = selected.is('text') || selected.get('type') === 'text';
        const hasContent = typeof selected.get('content') === 'string' && selected.get('content').length > 0;
        
        // Also check if components children exist or direct view/content
        if (isTextComponent || hasContent) {
          const currentContent = selected.get('content') || '';
          // Append the placeholder cleanly to existing text
          const updatedContent = currentContent ? `${currentContent} ${key}` : key;
          selected.set('content', updatedContent);
          setIsDirty(true);
          inserted = true;
        } else if (selected.components && typeof selected.components === 'function') {
          // If selected container can accept child components, append inline text component
          selected.components().add(`<span style="display:inline-block;">${key}</span>`);
          setIsDirty(true);
          inserted = true;
        }
      }
    } catch (err) {
      console.warn('Direct insertion into selected component failed:', err);
      inserted = false;
    }

    // Always copy to clipboard for convenience
    navigator.clipboard?.writeText(key).catch(() => {});

    if (inserted) {
      setSaveToast({
        type: 'success',
        message: `✓ Inserted ${key} into selected element and copied to clipboard.`
      });
    } else {
      setSaveToast({
        type: 'info',
        message: `📋 Copied ${key} to clipboard! Select a text block in the canvas to insert, or paste (Ctrl+V) directly.`
      });
    }
  };

  // Handle Save
  const handleSaveClick = async () => {
    if (!onSave) return;
    setSaving(true);
    setSaveToast(null);

    const fullContent = getCombinedHtml();

    // Basic frontend verification
    if (!fullContent.includes('{{fullName}}')) {
      setSaveToast({
        type: 'error',
        message: 'Validation Warning: Template must contain {{fullName}} placeholder.'
      });
      setSaving(false);
      return;
    }

    try {
      await onSave(fullContent);
      setIsDirty(false);
      setSaveToast({
        type: 'success',
        message: 'Template saved successfully!'
      });
    } catch (err) {
      setSaveToast({
        type: 'error',
        message: err.message || 'Failed to save template. Please try again.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle Sample Data Preview
  const handleOpenPreview = () => {
    const rawHtml = getCombinedHtml();
    let rendered = rawHtml;

    // Substitute sample values
    Object.entries(SAMPLE_PREVIEW_DATA).forEach(([key, val]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(regex, val);
    });

    setPreviewHtml(rendered);
    setShowPreviewModal(true);
  };

  const filteredPlaceholders = placeholders.filter((p) =>
    p.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="cert-editor-shell">
      {/* Top Action Toolbar */}
      <header className="cert-editor-toolbar">
        <div className="cert-editor-toolbar-left">
          <span className="cert-editor-title">
            <span>🎨</span> {title}
          </span>
          {isDirty ? (
            <span className="cert-editor-dirty-badge">● Unsaved Changes</span>
          ) : (
            <span className="cert-editor-clean-badge">✓ Saved</span>
          )}
        </div>

        <div className="cert-editor-toolbar-actions">
          <button
            type="button"
            className="cert-btn cert-btn-secondary"
            onClick={() => setShowPlaceholders(!showPlaceholders)}
            title="Toggle Placeholder Drawer"
          >
            <span>🏷</span> Placeholders {showPlaceholders ? '▼' : '▶'}
          </button>

          <button
            type="button"
            className="cert-btn cert-btn-gold"
            onClick={handleOpenPreview}
            title="Preview certificate with sample intern data"
          >
            <span>👁</span> Preview with Sample Data
          </button>

          {!readOnly && (
            <button
              type="button"
              className="cert-btn cert-btn-primary"
              onClick={handleSaveClick}
              disabled={saving}
              title="Save current layout & styles"
            >
              <span>💾</span> {saving ? 'Saving...' : 'Save Template'}
            </button>
          )}
        </div>
      </header>

      {/* Global Feedback Toast */}
      {saveToast && (
        <div style={{ padding: '8px 16px' }}>
          <Toast
            type={saveToast.type}
            message={saveToast.message}
            onClose={() => setSaveToast(null)}
          />
        </div>
      )}

      {/* Editor Body */}
      <div className="cert-editor-body-layout">
        {/* Loading Skeleton */}
        {initializing && (
          <div className="cert-skeleton-shell">
            <div className="cert-skeleton-canvas" />
            <p style={{ color: '#94a3b8', fontSize: '13px' }}>
              Initializing A4 Landscape Canvas & Google Fonts...
            </p>
          </div>
        )}

        {/* Error State */}
        {initError && (
          <div className="cert-error-state">
            <div className="cert-error-icon">⚠</div>
            <h3 style={{ color: '#fff', margin: 0 }}>Editor Initialization Failed</h3>
            <p style={{ color: '#94a3b8' }}>{initError}</p>
            <button
              type="button"
              className="cert-btn cert-btn-secondary"
              onClick={initEditor}
            >
              Retry Initialization
            </button>
          </div>
        )}

        {/* GrapesJS Canvas Viewport */}
        <div
          className="cert-canvas-container"
          style={{ display: initializing || initError ? 'none' : 'flex' }}
        >
          <div className="gjs-canvas-wrapper" style={{ width: '1123px', height: '794px' }}>
            <div ref={editorContainerRef} style={{ width: '1123px', height: '794px' }} />
          </div>
        </div>

        {/* Placeholder Side Panel */}
        {showPlaceholders && (
          <aside className="cert-placeholder-panel">
            <div className="cert-ph-header">
              <h3>Available Tags</h3>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {placeholders.length} keys
              </span>
            </div>

            <div className="cert-ph-search">
              <input
                type="text"
                placeholder="Search placeholder..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="cert-ph-list">
              {filteredPlaceholders.map((ph) => (
                <button
                  key={ph.key}
                  type="button"
                  className="cert-ph-item"
                  onClick={() => handleInsertPlaceholder(ph.key)}
                  title={`Click to insert ${ph.key}`}
                >
                  <span className="cert-ph-key">{ph.key}</span>
                  {ph.description && <span className="cert-ph-desc">{ph.description}</span>}
                  {ph.source && <span className="cert-ph-source">Source: {ph.source}</span>}
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* Sample Data Preview Modal */}
      {showPreviewModal && (
        <div className="cert-modal-backdrop" onClick={() => setShowPreviewModal(false)}>
          <div className="cert-modal-box" onClick={(e) => e.stopPropagation()}>
            <header className="cert-modal-header">
              <h3>Preview with Sample Intern Data</h3>
              <button
                type="button"
                className="cert-modal-close"
                onClick={() => setShowPreviewModal(false)}
              >
                ×
              </button>
            </header>
            <div className="cert-modal-body">
              <iframe
                title="Certificate Live Sample Preview"
                className="cert-preview-iframe"
                srcDoc={previewHtml}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
