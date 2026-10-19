import { useEffect, useMemo, useRef, useState } from "react";
import CertificateTemplateEditor from "../components/CertificateTemplateEditor";
import Toast from "../../../shared/components/Toast";
import {
  createCertificateTemplate,
  getCertificateTemplates,
  getTemplatePlaceholders,
  updateCertificateTemplate,
} from "../services/admin.service";
import "../components/CertificateTemplateEditor.css";

const SAMPLE_DATA = {
  fullName: "Sarvesh Choudhary",
  internName: "Sarvesh Choudhary",
  internCode: "UPT-2026-001",
  domain: "Web Development",
  department: "Web Development",
  startDate: "01 October 2026",
  endDate: "31 December 2026",
  issueDate: "06 October 2026",
  issuedDate: "06 October 2026",
  requestNumber: "CERT-2026-00019",
  certificateNumber: "CERT-2026-00019",
  certificateTitle: "Certificate of Completion",
  qrCodeUrl: "https://example.com/verify/CERT-2026-00019",
};

const SAMPLE_QR_SVG = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#ffffff"/><path d="M10,10 h30 v30 h-30 z M15,15 v20 h20 v-20 z M20,20 h10 v10 h-10 z" fill="#0f172a"/><path d="M60,10 h30 v30 h-30 z M65,15 v20 h20 v-20 z M70,20 h10 v10 h-10 z" fill="#0f172a"/><path d="M10,60 h30 v30 h-30 z M15,65 v20 h20 v-20 z M20,70 h10 v10 h-10 z" fill="#0f172a"/><rect x="48" y="15" width="8" height="8" fill="#0f172a"/><rect x="48" y="30" width="8" height="8" fill="#0f172a"/><rect x="15" y="48" width="8" height="8" fill="#0f172a"/><rect x="30" y="48" width="8" height="8" fill="#0f172a"/><rect x="48" y="48" width="12" height="12" fill="#0f172a"/><rect x="68" y="48" width="8" height="8" fill="#0f172a"/><rect x="48" y="68" width="8" height="8" fill="#0f172a"/><rect x="68" y="68" width="16" height="16" fill="#0f172a"/></svg>')}`;

const starterHtml = `<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"><style>@page{size:A4 landscape;margin:0}*{box-sizing:border-box}body{margin:0;width:1123px;height:794px;padding:40px;background:#fff;color:#0f172a;font-family:'Inter',sans-serif;text-align:center}.certificate{border:12px solid #0f172a;outline:3px solid #d97706;outline-offset:-6px;height:714px;padding:48px 36px;background:#ffffff;display:flex;flex-direction:column;justify-content:space-between;align-items:center;position:relative}h1{font-family:'Playfair Display',serif;color:#0f172a;font-size:46px;margin:8px 0}h2{font-family:'Playfair Display',serif;color:#d97706;font-size:38px;margin:8px 0;border-bottom:2px solid #0f172a;display:inline-block;padding-bottom:4px}p{font-size:18px;color:#334155;margin:6px 0}.sig-block{border-top:1px solid #0f172a;width:240px;padding-top:8px;font-size:14px;color:#0f172a;font-weight:600}</style></head><body><main class="certificate"><p style="text-transform:uppercase;letter-spacing:3px;font-size:14px;color:#64748b;margin:0 0 4px">UPTOSKILL OFFICIAL CREDENTIAL</p><h1>{{certificateTitle}}</h1><p style="font-style:italic;margin:6px 0">This certificate is proudly presented to</p><h2>{{fullName}}</h2><p style="max-width:760px;margin:12px auto">For successful completion of the internship program in <strong>{{domain}}</strong> from <strong>{{startDate}}</strong> to <strong>{{endDate}}</strong>.</p><div style="width:100%;display:flex;justify-content:space-between;align-items:flex-end;padding:0 30px"><div class="sig-block"><p style="margin:0">Authorized Signatory</p><small style="color:#64748b;font-weight:400">Director</small></div><div style="width:80px;height:80px"><img width="80" height="80" src="{{qrCodeUrl}}" alt="QR Code" style="object-fit:contain"></div><div class="sig-block"><p style="margin:0">{{issueDate}}</p><small style="color:#64748b;font-weight:400">Date of Issue</small></div></div><p style="font-size:11px;color:#94a3b8;font-family:monospace;margin:6px 0 0">Ref: {{requestNumber}} | Intern Code: {{internCode}}</p></main></body></html>`;

function getTemplateHtml(template) {
  return template?.htmlContent || template?.content || starterHtml;
}

function replacePlaceholders(html) {
  if (!html) return "";

  let previewHtml = html;

  // Replace qrCodeUrl placeholders with image tags so raw text never overflows
  previewHtml = previewHtml.replace(
    /src=["']\{\{\s*qrCodeUrl\s*\}\}["']/gi,
    `src="${SAMPLE_QR_SVG}"`
  );
  previewHtml = previewHtml.replace(
    /\{\{\s*qrCodeUrl\s*\}\}/gi,
    `<img src="${SAMPLE_QR_SVG}" alt="QR Code" style="width:100%;height:100%;object-fit:contain;display:block;" />`
  );

  Object.entries(SAMPLE_DATA).forEach(([key, value]) => {
    if (key !== "qrCodeUrl") {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      previewHtml = previewHtml.replace(placeholder, value);
    }
  });

  return previewHtml;
}

export default function CertificateTemplateEditorPage({ embedded = false }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [placeholders, setPlaceholders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingPlaceholders, setLoadingPlaceholders] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const [previewMode, setPreviewMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [workingHtml, setWorkingHtml] = useState("");
  const [editorController, setEditorController] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [templateDetails, setTemplateDetails] = useState({
    templateCode: "",
    templateName: "",
    certificateType: "custom",
    title: "Certificate",
    status: "draft",
  });
  const isDirtyRef = useRef(false);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    const warnBeforeUnload = (event) => {
      if (!isDirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const confirmLinkNavigation = (event) => {
      const link = event.target.closest?.("a[href]");
      if (!isDirtyRef.current || !link || link.target === "_blank" || link.hasAttribute("download")) return;
      const next = new URL(link.href, window.location.href);
      if (next.origin !== window.location.origin || next.href === window.location.href) return;
      if (!window.confirm("You have unsaved template changes. Leave this page and discard them?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    document.addEventListener("click", confirmLinkNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      document.removeEventListener("click", confirmLinkNavigation, true);
    };
  }, []);

  const [zoom, setZoom] = useState(0.70);
  const [autoFit, setAutoFit] = useState(true);
  const canvasWrapRef = useRef(null);

  useEffect(() => {
    if (!autoFit || !canvasWrapRef.current) return;
    const calculateFit = () => {
      if (!canvasWrapRef.current) return;
      const availableWidth = canvasWrapRef.current.clientWidth - 48;
      if (availableWidth > 320) {
        const fitScale = Math.min(1.0, Math.max(0.4, Number((availableWidth / 1123).toFixed(2))));
        setZoom(fitScale);
      }
    };
    calculateFit();
    const ro = new ResizeObserver(calculateFit);
    ro.observe(canvasWrapRef.current);
    return () => ro.disconnect();
  }, [autoFit]);

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) {
      return null;
    }

    return (
      templates.find(
        (template) => template._id === selectedTemplateId
      ) || null
    );
  }, [selectedTemplateId, templates]);

  /*
   * Load certificate templates
   */
  useEffect(() => {
    let mounted = true;

    const loadTemplates = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getCertificateTemplates();

        if (!mounted) return;

        const templateList = response?.templates || [];

        const validTemplates = templateList.filter(
          (template) =>
            template?._id &&
            template?.templateCode &&
            template?.templateName
        );

        setTemplates(validTemplates);

        if (validTemplates.length > 0) {
          const selected = validTemplates[0];
          setSelectedTemplateId(selected._id);
          setWorkingHtml(getTemplateHtml(selected));
          setTemplateDetails({
            templateCode: selected.templateCode || "",
            templateName: selected.templateName || "",
            certificateType: selected.certificateType || "custom",
            title: selected.title || selected.templateName || "Certificate",
            status: selected.status || "draft",
          });
        }
      } catch (err) {
        console.error("Failed to load certificate templates:", err);

        if (!mounted) return;

        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load certificate templates."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadTemplates();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Load supported placeholders
   */
  useEffect(() => {
    let mounted = true;

    const loadPlaceholders = async () => {
      try {
        setLoadingPlaceholders(true);

        const response = await getTemplatePlaceholders();

        if (!mounted) return;

        setPlaceholders(response?.placeholders || []);
      } catch (err) {
        console.error("Failed to load placeholders:", err);

        if (!mounted) return;

        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load template placeholders."
        );
      } finally {
        if (mounted) {
          setLoadingPlaceholders(false);
        }
      }
    };

    loadPlaceholders();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Save template
   */
  const handleSave = async (htmlContent) => {
    if (!createMode && !selectedTemplate?._id) {
      throw new Error("Select a certificate template or create a new one.");
    }

    if (createMode && Object.values(templateDetails).some((value) => !value.trim())) {
      throw new Error("Complete the template code, name, certificate type, and title before saving.");
    }

    if (!htmlContent || !htmlContent.trim()) {
      throw new Error("Template HTML cannot be empty.");
    }

    try {
      setSaving(true);
      setError("");

      const response = createMode
        ? await createCertificateTemplate({ ...templateDetails, htmlContent })
        : await updateCertificateTemplate(selectedTemplate._id, { ...templateDetails, htmlContent });

      const updatedTemplate = response?.template;
      if (updatedTemplate) {
        setTemplates((currentTemplates) => createMode
          ? [updatedTemplate, ...currentTemplates]
          : currentTemplates.map((template) => template._id === updatedTemplate._id ? updatedTemplate : template));
        setSelectedTemplateId(updatedTemplate._id);
        setWorkingHtml(htmlContent);
        setCreateMode(false);
      }

      setIsDirty(false);
      setToast({
        type: "success",
        message: createMode ? "Certificate template created successfully." : "Certificate template saved successfully."
      });
      return true;
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Unable to save certificate template.";
      setError(message);
      setToast({ type: "error", message });
      throw new Error(message, { cause: err });
    } finally {
      setSaving(false);
    }
  };

  const startNewTemplate = () => {
    if (isDirty && !window.confirm("Discard unsaved template changes?")) return;
    setTemplateDetails({ templateCode: "", templateName: "", certificateType: "custom", title: "Certificate", status: "draft" });
    setCreateMode(true);
    setWorkingHtml(starterHtml);
    setIsDirty(false);
    setEditorController(null);
    setPreviewMode(false);
    setError("");
  };

  const handleTemplateChange = (event) => {
    if (isDirty && !window.confirm("Discard unsaved template changes?")) return;
    const id = event.target.value;
    setSelectedTemplateId(id);
    const nextTemplate = templates.find((template) => template._id === id);
    setWorkingHtml(getTemplateHtml(nextTemplate));
    if (nextTemplate) {
      setTemplateDetails({
        templateCode: nextTemplate.templateCode || "",
        templateName: nextTemplate.templateName || "",
        certificateType: nextTemplate.certificateType || "custom",
        title: nextTemplate.title || nextTemplate.templateName || "Certificate",
        status: nextTemplate.status || "draft",
      });
    }
    setCreateMode(false);
    setIsDirty(false);
    setEditorController(null);
    setError("");
    setPreviewMode(false);
  };

  const handleEditorChange = (html) => {
    setWorkingHtml(html);
  };

  const handleEditorDirtyChange = (dirty) => {
    setIsDirty(dirty);
  };

  const handleEditorReady = (controller) => {
    setEditorController(controller);
  };

  const handlePlaceholderClick = (placeholder) => {
    if (editorController && !previewMode) {
      editorController.insertPlaceholder(placeholder);
      setToast({ type: "success", message: `Inserted ${placeholder}` });
    } else {
      navigator.clipboard?.writeText(placeholder);
      setToast({ type: "success", message: `Copied ${placeholder} to clipboard` });
    }
  };

  /*
   * Generate preview HTML
   */
  const previewHtml = useMemo(() => {
    const html = createMode || isDirty ? workingHtml : getTemplateHtml(selectedTemplate);
    if (!html) {
      return "";
    }

    return replacePlaceholders(html);
  }, [createMode, isDirty, selectedTemplate, workingHtml]);

  /*
   * Loading state
   */
  if (loading) {
    return (
      <div className="certificate-template-state" role="status">
        <p>Loading certificate templates…</p>
      </div>
    );
  }

  /*
   * Error state when templates could not load
   */
  if (error && templates.length === 0) {
    return (
      <div className="certificate-template-error" role="alert">
        <p>{error}</p>
        <button type="button" className="btn-template-secondary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="certificate-template-editor-page">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Standalone Header (only shown if not embedded in admin dashboard) */}
      {!embedded && (
        <header className="admin-page-header" style={{ marginBottom: "20px" }}>
          <p className="admin-eyebrow">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>
            CERTIFICATE TEMPLATES
          </p>
          <h1>{createMode ? "Create Certificate Template" : "Certificate Template Editor"}</h1>
          <p>Design, edit, preview, and save certificate templates on an A4 landscape editor.</p>
        </header>
      )}

      {/* Toolbar / Template Selector Card */}
      <div className="certificate-template-toolbar-card">
        <div className="certificate-template-toolbar-top">
          {!createMode ? (
            <div className="certificate-template-select-group">
              <label htmlFor="certificate-template-select">Select Certificate Template</label>
              <select
                id="certificate-template-select"
                className="certificate-template-select"
                value={selectedTemplateId}
                onChange={handleTemplateChange}
              >
                {templates.map((template) => (
                  <option key={template._id} value={template._id}>
                    {template.templateName} ({template.templateCode})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <p className="admin-eyebrow">NEW TEMPLATE</p>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Configure Template Metadata</h3>
            </div>
          )}

          <div className="certificate-template-header-actions">
            {!createMode ? (
              <button type="button" className="btn-template-primary" onClick={startNewTemplate}>
                <span>+</span> New Template
              </button>
            ) : (
              <button
                type="button"
                className="btn-template-secondary"
                onClick={() => {
                  setCreateMode(false);
                  if (templates.length > 0) {
                    const first = templates[0];
                    setSelectedTemplateId(first._id);
                    setWorkingHtml(getTemplateHtml(first));
                  }
                }}
              >
                Cancel New
              </button>
            )}

            <button
              type="button"
              className="btn-template-secondary"
              onClick={() => setPreviewMode((value) => !value)}
            >
              <i className={previewMode ? "bi bi-pencil-square" : "bi bi-eye-fill"} style={{ marginRight: 6 }}></i>
              {previewMode ? "Edit Template" : "Preview with Sample Data"}
            </button>
          </div>
        </div>

        {/* Template metadata fields */}
        <div className="certificate-template-create-fields">
          <label>
            Template Code
            <input
              required
              placeholder="e.g. comp_cert_v2"
              value={templateDetails.templateCode}
              onChange={(event) => {
                setIsDirty(true);
                setTemplateDetails((current) => ({ ...current, templateCode: event.target.value }));
              }}
            />
          </label>

          <label>
            Template Name
            <input
              required
              placeholder="e.g. Completion Certificate"
              value={templateDetails.templateName}
              onChange={(event) => {
                setIsDirty(true);
                setTemplateDetails((current) => ({ ...current, templateName: event.target.value }));
              }}
            />
          </label>

          <label>
            Certificate Type
            <select
              value={templateDetails.certificateType}
              onChange={(event) => {
                setIsDirty(true);
                setTemplateDetails((current) => ({ ...current, certificateType: event.target.value }));
              }}
            >
              <option value="custom">Custom</option>
              <option value="completion">Completion Certificate</option>
              <option value="bonafide">Bonafide Certificate</option>
              <option value="experience">Experience Letter</option>
              <option value="ojt">OJT Certificate</option>
              <option value="intern_of_month">Intern of the Month</option>
              <option value="league_winner">League Winner</option>
              <option value="offer_letter">Offer Letter</option>
            </select>
          </label>

          <label>
            Display Title
            <input
              required
              placeholder="e.g. Certificate of Completion"
              value={templateDetails.title}
              onChange={(event) => {
                setIsDirty(true);
                setTemplateDetails((current) => ({ ...current, title: event.target.value }));
              }}
            />
          </label>

          <label>
            Status
            <select
              value={templateDetails.status}
              onChange={(event) => {
                setIsDirty(true);
                setTemplateDetails((current) => ({ ...current, status: event.target.value }));
              }}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>

        {!createMode && selectedTemplate && (
          <small className="certificate-template-version">
            Current Version: v{selectedTemplate.version || 1} &nbsp;·&nbsp; Type: {selectedTemplate.certificateType || "custom"} &nbsp;·&nbsp; Status: {selectedTemplate.status || "draft"}
          </small>
        )}
      </div>

      {/* Main Two-Column Workspace */}
      <div className="certificate-template-workspace">
        {/* Editor or Preview Card */}
        <div className="certificate-editor-card">
          <div className="certificate-editor-top-actions">
            <div>
              <h2>{previewMode ? "A4 Landscape Preview (Sample Data)" : "Visual Template Canvas"}</h2>
              <small style={{ color: "var(--text-muted)" }}>
                {previewMode
                  ? "Rendered output with mock candidate data as it appears in generated PDFs."
                  : "Drag, drop, and format certificate typography, logos, and dynamic placeholders."}
              </small>
            </div>

            <div className="certificate-editor-top-controls">
              {/* Zoom Controls */}
              <div className="certificate-zoom-bar">
                <button
                  type="button"
                  title="Zoom Out"
                  onClick={() => {
                    setAutoFit(false);
                    setZoom((prev) => Math.max(0.4, Number((prev - 0.05).toFixed(2))));
                  }}
                >
                  −
                </button>
                <span className="certificate-zoom-label">{Math.round(zoom * 100)}%</span>
                <button
                  type="button"
                  title="Zoom In"
                  onClick={() => {
                    setAutoFit(false);
                    setZoom((prev) => Math.min(1.5, Number((prev + 0.05).toFixed(2))));
                  }}
                >
                  +
                </button>
                <button
                  type="button"
                  className={`certificate-zoom-btn ${autoFit ? "active" : ""}`}
                  title="Fit to Screen"
                  onClick={() => setAutoFit(true)}
                >
                  Fit
                </button>
                <button
                  type="button"
                  className={`certificate-zoom-btn ${!autoFit && zoom === 1 ? "active" : ""}`}
                  title="100% Size"
                  onClick={() => {
                    setAutoFit(false);
                    setZoom(1);
                  }}
                >
                  100%
                </button>
              </div>

              {/* Selected Element Nudge & Position Bar */}
              {selectedElement && !previewMode && (
                <div className="certificate-nudge-bar" title="Position & Nudge Selected Element">
                  <span className="certificate-nudge-label">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="5 9 2 12 5 15"></polyline>
                      <polyline points="9 5 12 2 15 5"></polyline>
                      <polyline points="15 19 12 22 9 19"></polyline>
                      <polyline points="19 9 22 12 19 15"></polyline>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                      <line x1="12" y1="2" x2="12" y2="22"></line>
                    </svg>
                    <strong>{selectedElement.name}</strong>
                    {selectedElement.left !== "auto" && <span>X: {selectedElement.left}</span>}
                    {selectedElement.top !== "auto" && <span>Y: {selectedElement.top}</span>}
                  </span>
                  <div className="certificate-nudge-arrows">
                    <button
                      type="button"
                      title="Move Left (ArrowLeft)"
                      onClick={() => editorController?.nudgeSelected?.(-5, 0)}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      title="Move Up (ArrowUp)"
                      onClick={() => editorController?.nudgeSelected?.(0, -5)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      title="Move Down (ArrowDown)"
                      onClick={() => editorController?.nudgeSelected?.(0, 5)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      title="Move Right (ArrowRight)"
                      onClick={() => editorController?.nudgeSelected?.(5, 0)}
                    >
                      →
                    </button>
                  </div>
                </div>
              )}

              {/* Primary Save Button in Header */}
              {!previewMode && (
                <button
                  type="button"
                  className="btn-template-primary btn-save-template-header"
                  disabled={saving}
                  onClick={async () => {
                    if (!editorController) return;
                    try {
                      const html = editorController.getHtml();
                      const ok = await handleSave(html);
                      if (ok) {
                        editorController.markSaved();
                      }
                    } catch (err) {
                      console.error("Save error:", err);
                    }
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  {saving ? "Saving…" : isDirty ? "Save Changes *" : "Save Template"}
                </button>
              )}
            </div>
          </div>

          <div ref={canvasWrapRef} className="certificate-editor-canvas-wrap">
            <div
              className="certificate-canvas-stage"
              style={{
                width: `${Math.round(1123 * zoom)}px`,
                height: `${Math.round(794 * zoom)}px`,
              }}
            >
              <div
                className="certificate-canvas-viewport"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                }}
              >
                {previewMode ? (
                  <iframe
                    title="Certificate Preview"
                    srcDoc={previewHtml}
                    className="certificate-preview-frame"
                  />
                ) : (
                  <CertificateTemplateEditor
                    key={createMode ? "new-template" : selectedTemplate?._id || "new-template"}
                    initialHtml={createMode ? starterHtml : getTemplateHtml(selectedTemplate)}
                    onSave={handleSave}
                    onChange={handleEditorChange}
                    onDirtyChange={handleEditorDirtyChange}
                    onEditorReady={handleEditorReady}
                    onComponentSelect={setSelectedElement}
                    saving={saving}
                    hideSaveButton={true}
                    zoom={zoom}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Placeholders & Sample Data */}
        <aside className="certificate-sidebar-panel">
          {/* Available Placeholders */}
          <div className="certificate-sidebar-card">
            <h3>Dynamic Placeholders</h3>
            <p style={{ margin: "0 0 12px", fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Click to insert into editor or copy to clipboard:
            </p>

            {loadingPlaceholders ? (
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Loading placeholders…</p>
            ) : placeholders.length === 0 ? (
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>No placeholders available.</p>
            ) : (
              <ul className="certificate-placeholder-list">
                {placeholders.map((placeholder) => (
                  <li key={placeholder}>
                    <button
                      type="button"
                      className="certificate-placeholder-button"
                      onClick={() => handlePlaceholderClick(placeholder)}
                      title="Click to insert or copy"
                    >
                      <code>{placeholder}</code>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Insert ↵</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Sample Data Reference */}
          <div className="certificate-sidebar-card">
            <h3>Sample Preview Data</h3>
            <div className="certificate-sample-data-list">
              <div className="certificate-sample-data-row">
                <span>Name</span>
                <strong>{SAMPLE_DATA.fullName}</strong>
              </div>
              <div className="certificate-sample-data-row">
                <span>Intern Code</span>
                <strong className="mono">{SAMPLE_DATA.internCode}</strong>
              </div>
              <div className="certificate-sample-data-row">
                <span>Domain</span>
                <strong>{SAMPLE_DATA.domain}</strong>
              </div>
              <div className="certificate-sample-data-row">
                <span>Request No.</span>
                <strong className="mono">{SAMPLE_DATA.requestNumber}</strong>
              </div>
              <div className="certificate-sample-data-row">
                <span>Date Range</span>
                <strong>{SAMPLE_DATA.startDate} — {SAMPLE_DATA.endDate}</strong>
              </div>
              <div className="certificate-sample-data-row">
                <span>Issue Date</span>
                <strong>{SAMPLE_DATA.issueDate}</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
