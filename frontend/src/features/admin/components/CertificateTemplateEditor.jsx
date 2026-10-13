import { useEffect, useRef, useState, useCallback } from 'react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import { getPlaceholders } from '../services/admin.service';
import Toast from '../../../shared/components/Toast';
import './CertificateTemplateEditor.css';

const DUMMY_SAMPLE_DATA = {
  fullName: 'Jane Doe',
  internCode: 'INT-2026-098',
  domain: 'Full Stack Engineering',
  startDate: '12 Jan 2026',
  endDate: '12 Apr 2026',
  issueDate: '15 Apr 2026',
  requestNumber: 'REQ-2026-0042',
  certificateTitle: 'Internship Completion Certificate',
  qrCodeUrl: ''
};

/**
 * Extracts <style> contents and body innerHTML from a full HTML document.
 * GrapesJS setComponents() parses full HTML documents into nested
 * <html>/<head>/<body> components, with <style> CSS NOT applied to the canvas.
 * This helper splits the document so only body content goes to setComponents()
 * and <style> rules are injected via editor.addStyle().
 *
 * @param {string} html - Full HTML string (may or may not be a complete document)
 * @returns {{ styles: string, bodyContent: string }}
 */
const splitHtmlDocument = (html) => {
  if (!html || typeof html !== 'string') return { styles: '', bodyContent: '' };

  const styleTags = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  const styles = styleTags
    .map((tag) => tag.replace(/<\/?style[^>]*>/gi, ''))
    .join('\n');

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyContent = bodyMatch
    ? bodyMatch[1]
    : html.replace(/<!DOCTYPE[^>]*>/gi, '').replace(/<\/?(html|head|body)\b[^>]*>/gi, '');

  return { styles, bodyContent: bodyContent.trim() };
};

export default function CertificateTemplateEditor({ initialHtml = '', onSave, readOnly = false }) {
  const containerRef = useRef(null);
  const editorInstanceRef = useRef(null);

  const [initializing, setInitializing] = useState(true);
  const [placeholders, setPlaceholders] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [toast, setToast] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  // Unsaved changes warning on tab close/nav
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Load placeholders
  const loadPlaceholdersList = useCallback(async () => {
    setFetchError(null);
    try {
      const data = await getPlaceholders();
      setPlaceholders(data.placeholders || []);
    } catch (err) {
      setFetchError(err.message || 'Failed to fetch placeholders.');
    }
  }, []);

  useEffect(() => {
    loadPlaceholdersList();
  }, [loadPlaceholdersList]);

  // Initialize GrapesJS
  useEffect(() => {
    if (!containerRef.current) return;

    setInitializing(true);
    let editor = null;

    try {
      editor = grapesjs.init({
        container: containerRef.current,
        fromElement: false,
        height: '650px',
        width: 'auto',
        storageManager: false,
        noticeOnUnload: false,
        canvas: {
          styles: [
            'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap'
          ]
        },
        deviceManager: {
          devices: [
            {
              name: 'A4 Landscape',
              width: '1123px',
              height: '794px'
            }
          ]
        }
      });

      if (initialHtml) {
        const { styles, bodyContent } = splitHtmlDocument(initialHtml);

        if (styles) {
          editor.addStyle(styles);
        }
        if (bodyContent) {
          editor.setComponents(bodyContent);
        }
      }

      // Track changes
      editor.on('component:update', () => setIsDirty(true));
      editor.on('style:update', () => setIsDirty(true));

      editorInstanceRef.current = editor;
      setInitializing(false);
    } catch (err) {
      console.error('Failed to initialize GrapesJS editor:', err);
      setFetchError('Failed to initialize visual editor.');
      setInitializing(false);
    }

    return () => {
      if (editor) {
        try {
          editor.destroy();
        } catch {
          // ignore cleanup error
        }
        editorInstanceRef.current = null;
      }
    };
  }, [initialHtml]);

  // Insert placeholder into editor
  const handleInsertPlaceholder = (key) => {
    const editor = editorInstanceRef.current;
    if (!editor) return;

    const token = `{{${key}}}`;
    const selected = editor.getSelected();

    if (selected && selected.is('text')) {
      const currentContent = selected.get('content') || '';
      selected.set('content', currentContent + ' ' + token);
    } else {
      editor.addComponents(`<span class="cert-placeholder">${token}</span>`);
    }
    setIsDirty(true);
  };

  // Extract combined HTML & CSS as a valid full HTML document
  const getCombinedHtml = () => {
    const editor = editorInstanceRef.current;
    if (!editor) return initialHtml;

    const html = editor.getHtml();
    const css = editor.getCss();
    const fontStyles = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Certificate Template</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${fontStyles}" rel="stylesheet">
  <style>
${css}
  </style>
</head>
<body>
${html}
</body>
</html>`;
  };

  // Save handler
  const handleSave = async () => {
    if (!onSave) return;
    const combined = getCombinedHtml();

    setSaveLoading(true);
    setSaveError(null);
    try {
      await onSave(combined);
      setIsDirty(false);
      setToast({ type: 'success', message: 'Template saved successfully!' });
    } catch (err) {
      setSaveError(err.message || 'Failed to save template.');
      setToast({ type: 'error', message: err.message || 'Failed to save template.' });
    } finally {
      setSaveLoading(false);
    }
  };

  // Preview with sample data
  const handleOpenPreview = () => {
    let combined = getCombinedHtml();

    // Substitute sample data placeholders
    Object.entries(DUMMY_SAMPLE_DATA).forEach(([k, val]) => {
      const regex = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g');
      combined = combined.replace(regex, val);
    });

    setPreviewHtml(combined);
    setShowPreviewModal(true);
  };

  return (
    <div className="template-editor-wrapper">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Editor Top Toolbar */}
      <div className="template-editor-toolbar">
        <div className="toolbar-left">
          <h3>Visual Certificate Editor</h3>
          <span className="canvas-tag">A4 Landscape (1123 × 794 px)</span>
          {isDirty && <span className="unsaved-dot" title="Unsaved changes">● Unsaved</span>}
        </div>

        <div className="toolbar-right">
          <button
            type="button"
            className="btn-editor-secondary"
            onClick={handleOpenPreview}
          >
            👁 Preview with Sample Data
          </button>
          {!readOnly && (
            <button
              type="button"
              className="btn-editor-primary"
              onClick={handleSave}
              disabled={saveLoading || initializing}
            >
              {saveLoading ? 'Saving...' : '💾 Save Template'}
            </button>
          )}
        </div>
      </div>

      {/* Save Error Alert with Retry */}
      {saveError && (
        <div className="editor-error-alert" role="alert">
          <span>⚠ {saveError}</span>
          <button type="button" onClick={handleSave} className="btn-editor-retry">
            Retry Save
          </button>
        </div>
      )}

      {/* Main Workspace Layout: Side Placeholder Panel + GrapesJS Canvas */}
      <div className="template-editor-workspace">
        {/* Placeholder Panel */}
        <aside className="editor-placeholder-panel">
          <h4>Placeholders</h4>
          <p className="placeholder-hint">Click a token to insert into template:</p>

          {fetchError && (
            <div className="placeholder-error">
              <p>{fetchError}</p>
              <button type="button" onClick={loadPlaceholdersList} className="btn-editor-retry">
                Retry Load
              </button>
            </div>
          )}

          <div className="placeholder-list">
            {placeholders.map((p) => (
              <button
                key={p.key}
                type="button"
                className="placeholder-chip"
                onClick={() => handleInsertPlaceholder(p.key)}
                title={p.description || p.source}
              >

                <code>{`{{${p.key}}}`}</code>
                <small>{p.description || p.source}</small>
              </button>
            ))}
          </div>
        </aside>

        {/* GrapesJS Canvas Area */}
        <main className="editor-canvas-container">
          {initializing && (
            <div className="editor-skeleton-loader">
              <div className="spinner-ring" />
              <p>Initializing visual certificate canvas...</p>
            </div>
          )}
          <div
            ref={containerRef}
            className={`grapesjs-canvas-host ${initializing ? 'hidden' : ''}`}
          />
        </main>
      </div>

      {/* Sample Data Preview Modal */}
      {showPreviewModal && (
        <div className="editor-preview-modal-backdrop" onClick={() => setShowPreviewModal(false)}>
          <div className="editor-preview-modal-content" onClick={(e) => e.stopPropagation()}>
            <header className="editor-preview-modal-header">
              <h4>Certificate Preview (Sample Data)</h4>
              <button
                type="button"
                className="preview-modal-close"
                onClick={() => setShowPreviewModal(false)}
              >
                ✕
              </button>
            </header>
            <div className="editor-preview-modal-body">
              <iframe
                title="Certificate Sample Preview"
                srcDoc={previewHtml}
                className="preview-iframe"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
