import { useEffect, useRef, useState, useMemo } from "react";
import grapesjs from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import "./CertificateTemplateEditor.css";

import {
  CANVAS_SIZES,
  PRESET_TEMPLATES,
  DEFAULT_CERTIFICATE,
  DEFAULT_CERTIFICATE_CSS,
  BLOCKS,
  PLACEHOLDERS,
  splitTemplateDocument,
  buildTemplateDocument,
} from "./certificatePresets";
import { renderPreviewPdf } from "../services/admin.service";

// ============================================================================
// MAIN COMPONENT: CertificateTemplateEditor
// ============================================================================
const CertificateTemplateEditor = ({
  initialHtml = "",
  onChange,
  onSaveTemplate,
  saving = false,
  templateTitle = "",
}) => {
  const editorContainerRef = useRef(null);
  const editorRef = useRef(null);
  const styleManagerRef = useRef(null);
  const layerManagerRef = useRef(null);
  const traitManagerRef = useRef(null);
  const blockManagerRef = useRef(null);

  const onChangeRef = useRef(onChange);
  const lastEmittedHtmlRef = useRef("");

  // Editor states
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [selectedTagInfo, setSelectedTagInfo] = useState("");
  const [activeTab, setActiveTab] = useState("styles"); // styles | traits | layers | blocks
  const [outlineActive, setOutlineActive] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [toast, setToast] = useState(null);
  const [canvasFormat, setCanvasFormat] = useState("a4-landscape");
  const [zoomPercent, setZoomPercent] = useState(100);

  // Undo / Redo
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Modals
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Code editor modal state
  const [editableCode, setEditableCode] = useState("");

  // Placeholders sidebar state
  const [searchToken, setSearchToken] = useState("");
  const [tokenCategory, setTokenCategory] = useState("all");

  // Sample data live preview interactive state
  const [sampleData, setSampleData] = useState({
    fullName: "Aditya Sharma",
    internName: "Aditya Sharma",
    studentName: "Aditya Sharma",
    internCode: "INT-2026-0042",
    domain: "Full Stack Web Development",
    internshipRole: "Full Stack Developer Intern",
    position: "Full Stack Developer Intern",
    internPosition: "Full Stack Developer Intern",
    startDate: "12 Jan 2026",
    endDate: "12 Jul 2026",
    issueDate: "15 Jul 2026",
    certificateNumber: "UPTO-2026-8812",
    verificationCode: "VRF-8812-OK",
    certificateTitle: "Certificate of Completion",
    organizationName: "UPTOSKILLS",
    directorName: "Dr. Rajesh Kumar",
    directorTitle: "Director & Head of Programs",
    requestNumber: "REQ-2026-0819",
    place: "New Delhi, India",
    mentorName: "Dr. Rajesh Kumar",
    hrName: "Academic Lead",
    hrSignature: "Academic Lead",
    programName: "Full Stack Web Development",
    departmentName: "Engineering",
    department: "Engineering",
    academicYear: "2025-2026",
    purpose: "Academic Internship Requirement",
    authorizedName: "Dr. Rajesh Kumar",
    designation: "Director & Head of Programs",
    managerName: "Dr. Rajesh Kumar",
    duration: "6 Months",
    workMode: "Hybrid / Remote",
    mode: "Virtual Internship",
    location: "New Delhi, India",
    stipend: "Performance Based",
    reportingManager: "Dr. Rajesh Kumar",
    authorizedPersonName: "Dr. Rajesh Kumar",
    authorizedPerson: "Dr. Rajesh Kumar",
    authorizedPosition: "Head of Talent Programs",
    companyEmail: "info@uptoskills.com",
    companyPhone: "+91 98765 43210",
    companyWebsite: "www.uptoskills.com",
    companyAddress: "New Delhi, India",
    verificationURL: "https://uptoskills.com/verify",
    month: "July",
    year: "2026",
    leagueName: "Web Innovation Hackathon 2026",
    organizer: "UPTOSKILLS Academy",
    offerNumber: "OFF-2026-042",
  });

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Update Undo/Redo state helper
  const updateUndoRedo = (editorInstance) => {
    const editor = editorInstance || editorRef.current;
    if (!editor || !editor.UndoManager) return;
    try {
      setCanUndo(editor.UndoManager.hasUndo());
      setCanRedo(editor.UndoManager.hasRedo());
    } catch {
      // Safe fallback
    }
  };

  // --------------------------------------------------------------------------
  // GRAPESJS INITIALIZATION
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!editorContainerRef.current || editorRef.current) return undefined;

    const editor = grapesjs.init({
      container: editorContainerRef.current,
      height: "100%",
      width: "100%",
      fromElement: false,
      storageManager: false,
      selectorManager: { componentFirst: true },
      panels: { defaults: [] },
      styleManager: {
        appendTo: styleManagerRef.current,
        sectors: [
          {
            name: "Typography",
            open: true,
            buildProps: [
              "font-family",
              "font-size",
              "font-weight",
              "letter-spacing",
              "color",
              "line-height",
              "text-align",
              "text-transform",
            ],
            properties: [
              {
                name: "Font Family",
                property: "font-family",
                type: "select",
                defaults: "Georgia, serif",
                options: [
                  { id: "Georgia, serif", label: "Georgia (Serif)" },
                  { id: "'Cinzel', serif", label: "Cinzel (Classical Prestige)" },
                  { id: "'Playfair Display', serif", label: "Playfair Display (Luxury Serif)" },
                  { id: "'Montserrat', sans-serif", label: "Montserrat (Clean Sans)" },
                  { id: "'Inter', sans-serif", label: "Inter (Modern Sans)" },
                  { id: "'Great Vibes', cursive", label: "Great Vibes (Cursive Script)" },
                  { id: "Arial, sans-serif", label: "Arial" },
                  { id: "ui-monospace, monospace", label: "Monospace" },
                ],
              },
            ],
          },
          {
            name: "Dimensions & Spacing",
            open: false,
            buildProps: [
              "width",
              "height",
              "max-width",
              "min-height",
              "margin",
              "padding",
            ],
          },
          {
            name: "Colors & Borders",
            open: false,
            buildProps: [
              "background-color",
              "border",
              "border-radius",
              "box-shadow",
              "opacity",
            ],
          },
          {
            name: "Flexbox Layout",
            open: false,
            buildProps: [
              "display",
              "flex-direction",
              "justify-content",
              "align-items",
              "gap",
            ],
          },
        ],
      },
      traitManager: {
        appendTo: traitManagerRef.current,
      },
      layerManager: {
        appendTo: layerManagerRef.current,
      },
      blockManager: {
        appendTo: blockManagerRef.current,
        blocks: BLOCKS,
      },
      canvas: {
        styles: [
          "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Great+Vibes&family=Inter:wght@400;600;700;800&family=Montserrat:wght@400;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap",
        ],
        scripts: [],
      },
    });

    editorRef.current = editor;

    // Component selection events
    editor.on("component:selected", (component) => {
      setSelectedComponent(component);
      const tag = component.get("tagName") || "element";
      const classes = component.getClasses() || [];
      const classStr = classes.length ? `.${classes.join(".")}` : "";
      setSelectedTagInfo(`<${tag}>${classStr}`);
      setActiveTab("styles");
    });

    editor.on("component:deselected", () => {
      setSelectedComponent(null);
      setSelectedTagInfo("");
    });

    // Starting content resolution
    const startingContent = initialHtml || DEFAULT_CERTIFICATE;
    const parsedStartingContent = splitTemplateDocument(startingContent);
    const rawHtml = parsedStartingContent.html || DEFAULT_CERTIFICATE;

    // Only fallback if this is strictly the bare legacy placeholder without modern styling
    const isOldLegacyFallback =
      rawHtml.includes("certificate-inner") &&
      !rawHtml.includes("outer-border") &&
      !rawHtml.includes("background-waves") &&
      !rawHtml.includes("cert-border-inner") &&
      !rawHtml.includes("cert-container");

    const startingHtml =
      isOldLegacyFallback && rawHtml.includes("UPTOSKILLS")
        ? DEFAULT_CERTIFICATE
        : rawHtml;

    const startingCss =
      startingHtml === DEFAULT_CERTIFICATE
        ? DEFAULT_CERTIFICATE_CSS
        : (parsedStartingContent.css || DEFAULT_CERTIFICATE_CSS);

    const initializeCanvas = () => {
      if (editorRef.current !== editor) return;
      editor.setComponents(startingHtml);
      editor.setStyle(startingCss);
      editor.refresh();
      updateUndoRedo(editor);
    };

    initializeCanvas();

    const setFrameDimensions = (format = "a4-landscape") => {
      try {
        const frame = editor.Canvas.getFrames()[0];
        const size = CANVAS_SIZES[format] || CANVAS_SIZES["a4-landscape"];
        if (frame && size) {
          frame.set({ width: size.width, height: size.height });
        }
      } catch {
        // Safe fallback
      }
    };

    setFrameDimensions("a4-landscape");

    const fitCanvas = () => {
      const host = editorContainerRef.current;
      if (!host || !editorRef.current) return;
      const availableWidth = host.clientWidth;
      if (!availableWidth) return;

      try {
        setFrameDimensions(canvasFormat);
        editor.Canvas.fitViewport({ gap: 24 });
        const zoom = Math.round(editor.Canvas.getZoom());
        setZoomPercent(zoom);
        editor.refresh();
      } catch {
        const designWidth = CANVAS_SIZES[canvasFormat]?.width || 1123;
        const zoom = Math.max(
          25,
          Math.min(100, Math.round(((availableWidth - 48) / designWidth) * 100))
        );
        try {
          editor.Canvas.setZoom(zoom);
          setZoomPercent(zoom);
          editor.refresh();
        } catch {
          // Safe fallback
        }
      }
    };

    editor.on("load", () => {
      if (editorRef.current === editor) {
        editor.refresh();
        fitCanvas();
        updateUndoRedo(editor);
      }
    });

    const emitHtml = () => {
      const html = buildTemplateDocument(editor.getHtml(), editor.getCss());
      lastEmittedHtmlRef.current = html;
      onChangeRef.current?.(html);
      updateUndoRedo(editor);
    };

    editor.on("update", emitHtml);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(fitCanvas)
        : null;

    if (resizeObserver && editorContainerRef.current) {
      resizeObserver.observe(editorContainerRef.current);
    }
    window.addEventListener("resize", fitCanvas);

    requestAnimationFrame(() => {
      fitCanvas();
      requestAnimationFrame(fitCanvas);
    });

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", fitCanvas);
      editor.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external initialHtml updates if loaded asynchronously or when type switches
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !initialHtml) return;
    if (initialHtml === lastEmittedHtmlRef.current) return;

    const parsed = splitTemplateDocument(initialHtml);
    const isOldLegacyFallback =
      parsed.html.includes("certificate-inner") &&
      !parsed.html.includes("outer-border") &&
      !parsed.html.includes("background-waves") &&
      !parsed.html.includes("cert-border-inner") &&
      !parsed.html.includes("cert-container");

    const effectiveHtml =
      isOldLegacyFallback && parsed.html.includes("UPTOSKILLS")
        ? DEFAULT_CERTIFICATE
        : (parsed.html || DEFAULT_CERTIFICATE);

    const nextCss =
      effectiveHtml === DEFAULT_CERTIFICATE
        ? DEFAULT_CERTIFICATE_CSS
        : (parsed.css || DEFAULT_CERTIFICATE_CSS);

    editor.setComponents(effectiveHtml);
    editor.setStyle(nextCss);
    editor.refresh();
    lastEmittedHtmlRef.current = initialHtml;
    updateUndoRedo(editor);
  }, [initialHtml]);

  // Whenever activeTab changes (e.g. sidebar opened or closed), refit and refresh the canvas
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const timer = setTimeout(() => {
      try {
        editor.Canvas.fitViewport({ gap: 24 });
        editor.refresh();
      } catch {
        // safe fallback
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [activeTab]);

  // Handle switching paper format / orientation
  const handleSwitchFormat = (formatKey) => {
    setCanvasFormat(formatKey);
    const editor = editorRef.current;
    if (!editor) return;
    const size = CANVAS_SIZES[formatKey];
    if (!size) return;

    try {
      const frame = editor.Canvas.getFrames()[0];
      if (frame) {
        frame.set({ width: size.width, height: size.height });
      }
      editor.Canvas.fitViewport({ gap: 24 });
      setZoomPercent(Math.round(editor.Canvas.getZoom()));
      editor.refresh();
      showToastNotification(`Canvas set to ${size.label}`);
    } catch {
      // Safe fallback
    }
  };

  // Toast helper
  const showToastNotification = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // --------------------------------------------------------------------------
  // PLACEHOLDER TOKEN INSERTION & CLIPBOARD
  // --------------------------------------------------------------------------
  const handleInsertPlaceholder = (token) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selected = editor.getSelected();
    if (selected) {
      if (selected.is("text") || selected.get("type") === "text") {
        const currentContent = selected.get("content") || "";
        selected.set("content", `${currentContent} ${token}`);
      } else {
        selected.append({
          type: "text",
          content: token,
          style: {
            "font-size": "18px",
            color: "#081a36",
            "text-align": "center",
          },
        });
      }
    } else {
      const wrapper = editor.getWrapper();
      const inner =
        wrapper.find(".cert-border-inner")[0] ||
        wrapper.find(".emerald-content-core")[0] ||
        wrapper.find(".certificate-inner")[0] ||
        wrapper;
      inner.append({
        type: "text",
        content: token,
        style: {
          "font-size": "18px",
          color: "#081a36",
          margin: "8px 0",
          "text-align": "center",
        },
      });
    }

    try {
      navigator.clipboard?.writeText(token);
    } catch {
      // Safe fallback
    }

    showToastNotification(`Token ${token} inserted!`);
  };

  const handleCopyPlaceholder = (e, token) => {
    e.stopPropagation();
    try {
      navigator.clipboard?.writeText(token);
      showToastNotification(`Copied ${token} to clipboard!`);
    } catch {
      showToastNotification(`Token: ${token}`);
    }
  };

  // Filtered Placeholders
  const filteredPlaceholders = useMemo(() => {
    return PLACEHOLDERS.filter((item) => {
      const matchesSearch =
        item.token.toLowerCase().includes(searchToken.toLowerCase()) ||
        item.description.toLowerCase().includes(searchToken.toLowerCase());
      const matchesCategory =
        tokenCategory === "all" || item.category === tokenCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchToken, tokenCategory]);

  // --------------------------------------------------------------------------
  // CANVAS ACTIONS (Undo, Redo, Delete, Clone, Zoom, Presets)
  // --------------------------------------------------------------------------
  const handleUndo = () => {
    const editor = editorRef.current;
    if (!editor) return;
    try {
      editor.UndoManager.undo();
      updateUndoRedo(editor);
      showToastNotification("Undo successful");
    } catch {
      // Safe fallback
    }
  };

  const handleRedo = () => {
    const editor = editorRef.current;
    if (!editor) return;
    try {
      editor.UndoManager.redo();
      updateUndoRedo(editor);
      showToastNotification("Redo successful");
    } catch {
      // Safe fallback
    }
  };

  const handleDeleteSelected = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const selected = editor.getSelected();
    if (selected && selected !== editor.getWrapper()) {
      selected.remove();
      setSelectedComponent(null);
      setSelectedTagInfo("");
      showToastNotification("Element deleted");
    }
  };

  const handleCloneSelected = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const selected = editor.getSelected();
    if (selected && selected !== editor.getWrapper()) {
      try {
        const clone = selected.clone();
        selected.parent()?.append(clone);
        editor.select(clone);
        showToastNotification("Element duplicated");
      } catch {
        // Safe fallback
      }
    }
  };

  const handleZoomIn = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const current = editor.Canvas.getZoom();
    const next = Math.min(140, Math.round(current + 10));
    editor.Canvas.setZoom(next);
    setZoomPercent(next);
  };

  const handleZoomOut = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const current = editor.Canvas.getZoom();
    const next = Math.max(25, Math.round(current - 10));
    editor.Canvas.setZoom(next);
    setZoomPercent(next);
  };

  const handleFitViewport = () => {
    const editor = editorRef.current;
    if (!editor) return;
    try {
      const frame = editor.Canvas.getFrames()[0];
      const size = CANVAS_SIZES[canvasFormat];
      if (frame && size) frame.set({ width: size.width, height: size.height });
      editor.Canvas.fitViewport({ gap: 24 });
      setZoomPercent(Math.round(editor.Canvas.getZoom()));
    } catch {
      // Safe fallback
    }
  };

  const handleResetZoom100 = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.Canvas.setZoom(100);
    setZoomPercent(100);
  };

  const handleToggleFullscreen = () => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.Commands.isActive("fullscreen")) {
      editor.Commands.stop("fullscreen");
    } else {
      editor.Commands.run("fullscreen");
    }
  };

  const handleToggleOutlines = () => {
    const editor = editorRef.current;
    if (!editor) return;
    if (outlineActive) {
      editor.Commands.stop("sw-visibility");
      setOutlineActive(false);
    } else {
      editor.Commands.run("sw-visibility");
      setOutlineActive(true);
    }
  };

  const handleTogglePreview = () => {
    const editor = editorRef.current;
    if (!editor) return;
    if (previewMode) {
      editor.Commands.stop("preview");
      setPreviewMode(false);
    } else {
      editor.Commands.run("preview");
      setPreviewMode(true);
    }
  };

  // Apply a preset template from gallery
  const handleApplyPreset = (preset) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.setComponents(preset.html);
    editor.setStyle(preset.css);
    editor.refresh();
    handleSwitchFormat("a4-landscape");
    setShowPresetsModal(false);
    showToastNotification(`Loaded preset: ${preset.name}`);
  };

  // Reset to default blank/standard
  const handleConfirmReset = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.setComponents(DEFAULT_CERTIFICATE);
    editor.setStyle(DEFAULT_CERTIFICATE_CSS);
    editor.refresh();
    handleSwitchFormat("a4-landscape");
    setShowResetConfirm(false);
    showToastNotification("Canvas reset to default template");
  };

  // --------------------------------------------------------------------------
  // EDITABLE CODE MODAL
  // --------------------------------------------------------------------------
  const handleOpenCodeModal = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const doc = buildTemplateDocument(editor.getHtml(), editor.getCss());
    setEditableCode(doc);
    setShowCodeModal(true);
  };

  const handleApplyCodeChanges = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const parsed = splitTemplateDocument(editableCode);
    if (parsed.html) {
      editor.setComponents(parsed.html);
    }
    if (parsed.css) {
      editor.setStyle(parsed.css);
    }
    editor.refresh();
    setShowCodeModal(false);
    showToastNotification("Template updated from code changes!");
  };

  // --------------------------------------------------------------------------
  // INTERACTIVE SAMPLE DATA PREVIEW
  // --------------------------------------------------------------------------
  const [compiledPreviewHtml, setCompiledPreviewHtml] = useState("");

  const generatePreviewDocument = (data = sampleData) => {
    const editor = editorRef.current;
    if (!editor) return "";

    let html = editor.getHtml();
    const css = editor.getCss();

    // Replace all placeholders with sampleData (both exact and case-insensitive)
    Object.entries(data).forEach(([key, val]) => {
      html = html.replaceAll(`{{${key}}}`, val);
      try {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
        html = html.replace(regex, val);
      } catch {
        // Safe regex fallback
      }
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Great+Vibes&family=Inter:wght@400;600;700;800&family=Montserrat:wght@400;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      min-height: 100%;
      background: #0f172a;
      display: flex;
      justify-content: center;
      align-items: center;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @media print {
      @page {
        size: A4 landscape;
        margin: 0;
      }
      html, body {
        width: 100% !important;
        height: 100% !important;
        background: transparent !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .cert-container {
        margin: 0 auto !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
    ${css}
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
  };

  const handleOpenSamplePreview = () => {
    const doc = generatePreviewDocument(sampleData);
    setCompiledPreviewHtml(doc);
    setShowPreviewModal(true);
  };

  const handleSampleFieldChange = (key, value) => {
    const updated = { ...sampleData, [key]: value };
    setSampleData(updated);
    setCompiledPreviewHtml(generatePreviewDocument(updated));
  };

  // Direct High-Resolution PDF Download using Puppeteer engine
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdfDirect = async () => {
    setDownloadingPdf(true);
    try {
      const doc = compiledPreviewHtml || generatePreviewDocument(sampleData);
      const filename = `${(templateTitle || "certificate").toLowerCase().replace(/\s+/g, "-")}-preview.pdf`;
      const response = await renderPreviewPdf(doc, templateTitle || "certificate-preview");

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      showToastNotification("High-definition PDF generated & downloaded!");
    } catch (err) {
      console.warn("Direct PDF generation failed, falling back to browser print:", err);
      showToastNotification("Opening browser print engine...");
      handlePrintPreview();
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Print helper for preview iframe - waits for Google Fonts to load
  const handlePrintPreview = () => {
    const printWin = window.open("", "_blank");
    if (!printWin) {
      showToastNotification("Pop-up blocked! Please allow pop-ups for printing.");
      return;
    }

    const doc = compiledPreviewHtml || generatePreviewDocument(sampleData);
    const printHtml = doc.replace(
      "</body>",
      `<script>
        window.addEventListener('load', () => {
          if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
              setTimeout(() => { window.focus(); window.print(); }, 250);
            });
          } else {
            setTimeout(() => { window.focus(); window.print(); }, 600);
          }
        });
      </script></body>`
    );

    printWin.document.open();
    printWin.document.write(printHtml);
    printWin.document.close();
  };

  // Download HTML file helper
  const handleDownloadHtml = () => {
    const blob = new Blob([compiledPreviewHtml || generatePreviewDocument(sampleData)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(templateTitle || "certificate").toLowerCase().replace(/\s+/g, "-")}-template.html`;
    link.click();
    URL.revokeObjectURL(url);
    showToastNotification("HTML certificate file downloaded");
  };

  return (
    <div className="visual-certificate-editor-card">
      {/* Toast Notification */}
      {toast && <div className="certificate-editor-toast">{toast}</div>}

      {/* Editor Top Navigation Bar */}
      <div className="visual-editor-topbar">
        <div className="visual-editor-title-group">
          <div className="visual-editor-logo-pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="visual-logo-icon">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span>Visual Studio</span>
          </div>

          <h2 className="visual-editor-title">
            {templateTitle || "Visual Certificate Editor"}
          </h2>

          {/* Orientation & Size Switcher */}
          <div className="visual-canvas-size-selector">
            <select
              value={canvasFormat}
              onChange={(e) => handleSwitchFormat(e.target.value)}
              className="canvas-size-select"
              title="Canvas Paper Dimensions"
            >
              {Object.entries(CANVAS_SIZES).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.label} ({item.width} × {item.height})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Controls */}
        <div className="visual-editor-actions">
          {/* Preset Templates Gallery Button */}
          <button
            type="button"
            className="visual-btn-presets"
            onClick={() => setShowPresetsModal(true)}
            title="Browse & apply pre-built certificate designs"
          >
            <span className="preset-sparkle-icon">✦</span>
            <span>Presets Gallery</span>
          </button>

          {/* Sample Data Live Preview Button */}
          <button
            type="button"
            className="visual-btn-preview"
            onClick={handleOpenSamplePreview}
            title="Preview certificate with interactive mock data"
          >
            <svg
              className="visual-btn-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Preview & Test</span>
          </button>

          {/* Save Template Button */}
          <button
            type="button"
            className="visual-btn-save"
            onClick={onSaveTemplate}
            disabled={saving}
          >
            <svg
              className="visual-btn-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <span>{saving ? "Saving..." : "Save Template"}</span>
          </button>
        </div>
      </div>

      {/* Editor Body: Left Placeholders Sidebar + Central Canvas + Right Docked Panel */}
      <div className="visual-editor-body">
        {/* Left Column: Placeholders Sidebar */}
        <aside className="visual-placeholders-sidebar">
          <div className="placeholders-header">
            <div className="placeholders-header-row">
              <h3>Placeholders</h3>
              <span className="token-counter-badge">{filteredPlaceholders.length}</span>
            </div>
            <p>Click token to insert or copy:</p>

            {/* Token Search Bar */}
            <div className="placeholders-search-box">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search placeholders..."
                value={searchToken}
                onChange={(e) => setSearchToken(e.target.value)}
                className="placeholders-search-input"
              />
              {searchToken && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchToken("")}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="category-pills-row">
              {["all", "candidate", "internship", "certificate", "organization"].map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`cat-pill-btn ${tokenCategory === cat ? "active" : ""}`}
                    onClick={() => setTokenCategory(cat)}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="placeholders-list" role="list">
            {filteredPlaceholders.length === 0 ? (
              <div className="no-tokens-found">
                <p>No placeholders matching "{searchToken}"</p>
                <button
                  type="button"
                  className="reset-search-btn"
                  onClick={() => {
                    setSearchToken("");
                    setTokenCategory("all");
                  }}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              filteredPlaceholders.map((item) => (
                <div
                  key={item.token}
                  className="placeholder-token-card"
                  onClick={() => handleInsertPlaceholder(item.token)}
                  title={`Click to insert ${item.token} into canvas`}
                >
                  <div className="token-card-top">
                    <span className="token-chip">{item.token}</span>
                    <button
                      type="button"
                      className="token-copy-icon-btn"
                      onClick={(e) => handleCopyPlaceholder(e, item.token)}
                      title="Copy token text"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                  </div>
                  <div className="token-desc">{item.description}</div>
                  <div className="token-sample">e.g. "{item.example}"</div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Central Workspace: Canvas + Top Toolbar + Docked Panels */}
        <div className="visual-canvas-workspace">
          {/* Header Action Tools */}
          <div className="canvas-header-toolbar">
            <div className="canvas-device-info">
              {/* Undo / Redo controls */}
              <button
                type="button"
                className="canvas-tool-btn"
                onClick={handleUndo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 7v6h6" />
                  <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                </svg>
              </button>

              <button
                type="button"
                className="canvas-tool-btn"
                onClick={handleRedo}
                disabled={!canRedo}
                title="Redo (Ctrl+Y)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 7v6h-6" />
                  <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
                </svg>
              </button>

              <div className="canvas-tool-divider" />

              {/* Selection Actions: Delete, Clone */}
              <button
                type="button"
                className="canvas-tool-btn"
                onClick={handleDeleteSelected}
                disabled={!selectedComponent}
                title="Delete Selected Element (Del)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>

              <button
                type="button"
                className="canvas-tool-btn"
                onClick={handleCloneSelected}
                disabled={!selectedComponent}
                title="Duplicate Selected Element"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>

              <div className="canvas-tool-divider" />

              {/* Reset Canvas to Template */}
              <button
                type="button"
                className="canvas-tool-btn"
                onClick={() => setShowResetConfirm(true)}
                title="Reset canvas to default"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
              </button>
            </div>

            {/* Right Group: Views & Panels Toggles */}
            <div className="canvas-header-tools">
              {/* Outlines Toggle */}
              <button
                type="button"
                className={`canvas-tool-btn ${outlineActive ? "active" : ""}`}
                onClick={handleToggleOutlines}
                title="Toggle Element Outlines"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="3 3" />
                </svg>
              </button>

              {/* Clean Preview Mode */}
              <button
                type="button"
                className={`canvas-tool-btn ${previewMode ? "active" : ""}`}
                onClick={handleTogglePreview}
                title="Canvas Preview Mode"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>

              {/* View/Edit HTML & CSS Code */}
              <button
                type="button"
                className="canvas-tool-btn"
                onClick={handleOpenCodeModal}
                title="View & Edit HTML / CSS Code"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              </button>

              <div className="canvas-tool-divider" />

              {/* Panels: Style Manager */}
              <button
                type="button"
                className={`canvas-tool-btn ${activeTab === "styles" ? "active" : ""}`}
                onClick={() => setActiveTab(activeTab === "styles" ? "" : "styles")}
                title="Style Manager (Typography, Colors, Borders)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 19l7-7 3 3-7 7-3-3z" />
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                  <path d="M2 2l7.586 7.586" />
                  <circle cx="11" cy="11" r="2" />
                </svg>
              </button>

              {/* Panels: Settings & Traits */}
              <button
                type="button"
                className={`canvas-tool-btn ${activeTab === "traits" ? "active" : ""}`}
                onClick={() => setActiveTab(activeTab === "traits" ? "" : "traits")}
                title="Element Traits & Attributes"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>

              {/* Panels: Layer Manager */}
              <button
                type="button"
                className={`canvas-tool-btn ${activeTab === "layers" ? "active" : ""}`}
                onClick={() => setActiveTab(activeTab === "layers" ? "" : "layers")}
                title="Hierarchy Layers"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </button>

              {/* Panels: Design Blocks */}
              <button
                type="button"
                className={`canvas-tool-btn ${activeTab === "blocks" ? "active" : ""}`}
                onClick={() => setActiveTab(activeTab === "blocks" ? "" : "blocks")}
                title="Insert Design Blocks"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Canvas Main Stage */}
          <div className="canvas-main-stage">
            <div className="canvas-frame-container">
              <div ref={editorContainerRef} className="gjs-canvas-host" />

              {/* Floating Bottom-Right Zoom & Fit Controls */}
              <div
                className="floating-canvas-controls"
                role="toolbar"
                aria-label="Zoom controls"
              >
                <button
                  type="button"
                  className="float-control-btn"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                </button>

                <button
                  type="button"
                  className="float-zoom-indicator"
                  onClick={handleResetZoom100}
                  title="Click to reset to 100%"
                >
                  {zoomPercent}%
                </button>

                <button
                  type="button"
                  className="float-control-btn"
                  onClick={handleZoomIn}
                  title="Zoom In"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                </button>

                <div className="float-divider" />

                <button
                  type="button"
                  className="float-control-btn"
                  onClick={handleFitViewport}
                  title="Fit to Screen"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="4 14 10 14 10 20" />
                    <polyline points="20 10 14 10 14 4" />
                    <line x1="14" y1="10" x2="21" y2="3" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                </button>

                <button
                  type="button"
                  className="float-control-btn"
                  onClick={handleToggleFullscreen}
                  title="Toggle Fullscreen"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Right Docked Panels: Style Manager / Traits / Layers / Blocks */}
            <aside className={`canvas-right-dock ${!activeTab ? "hidden" : ""}`}>
              <div
                className="dock-content"
                style={{ display: activeTab === "styles" ? "flex" : "none" }}
              >
                <div className="dock-title-row">
                  <div className="dock-title">Style Manager</div>
                  <div className="dock-title-actions">
                    {selectedTagInfo && (
                      <span className="selected-tag-badge">{selectedTagInfo}</span>
                    )}
                    <button
                      type="button"
                      className="dock-close-btn"
                      onClick={() => setActiveTab("")}
                      title="Close Sidebar"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {!selectedComponent ? (
                  <div className="panel-empty-state">
                    <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p>Select any element on canvas to customize typography, colors, borders & layout</p>
                  </div>
                ) : null}
                <div
                  ref={styleManagerRef}
                  className={`gjs-panel-mount ${!selectedComponent ? "hidden" : ""}`}
                />
              </div>

              <div
                className="dock-content"
                style={{ display: activeTab === "traits" ? "flex" : "none" }}
              >
                <div className="dock-title-row">
                  <div className="dock-title">Settings & Traits</div>
                  <button
                    type="button"
                    className="dock-close-btn"
                    onClick={() => setActiveTab("")}
                    title="Close Sidebar"
                  >
                    ✕
                  </button>
                </div>
                <div ref={traitManagerRef} className="gjs-panel-mount" />
              </div>

              <div
                className="dock-content"
                style={{ display: activeTab === "layers" ? "flex" : "none" }}
              >
                <div className="dock-title-row">
                  <div className="dock-title">Layers</div>
                  <button
                    type="button"
                    className="dock-close-btn"
                    onClick={() => setActiveTab("")}
                    title="Close Sidebar"
                  >
                    ✕
                  </button>
                </div>
                <div ref={layerManagerRef} className="gjs-panel-mount" />
              </div>

              <div
                className="dock-content"
                style={{ display: activeTab === "blocks" ? "flex" : "none" }}
              >
                <div className="dock-title-row">
                  <div className="dock-title">Design Components</div>
                  <button
                    type="button"
                    className="dock-close-btn"
                    onClick={() => setActiveTab("")}
                    title="Close Sidebar"
                  >
                    ✕
                  </button>
                </div>
                <p className="dock-subtext">Drag blocks onto the certificate canvas:</p>
                <div ref={blockManagerRef} className="gjs-panel-mount" />
              </div>
            </aside>
          </div>

          {/* Bottom Status & Hints Bar */}
          <div className="canvas-bottom-statusbar">
            <div className="statusbar-left">
              <span className="status-item">
                <span className="status-dot"></span>
                Canvas: <strong>{CANVAS_SIZES[canvasFormat]?.label}</strong> ({CANVAS_SIZES[canvasFormat]?.width} × {CANVAS_SIZES[canvasFormat]?.height}px)
              </span>
              {selectedTagInfo && (
                <span className="status-item selection-info">
                  Active: <code>{selectedTagInfo}</code>
                </span>
              )}
            </div>

            <div className="statusbar-right">
              <span className="shortcut-hint">Tip: Drag blocks from right panel • Click token to insert</span>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          PRESET TEMPLATES GALLERY MODAL
          ===================================================================== */}
      {showPresetsModal && (
        <div className="visual-modal-backdrop" onClick={() => setShowPresetsModal(false)}>
          <div
            className="visual-modal-dialog presets-gallery-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="visual-modal-header">
              <div>
                <h3>Certificate Presets Gallery</h3>
                <span className="visual-editor-badge">
                  Choose a professionally styled layout to start with
                </span>
              </div>
              <button
                type="button"
                className="visual-modal-close"
                onClick={() => setShowPresetsModal(false)}
                title="Close presets gallery"
              >
                ✕
              </button>
            </div>

            <div className="visual-modal-body presets-gallery-body">
              <div className="presets-grid">
                {PRESET_TEMPLATES.map((preset) => (
                  <div key={preset.id} className="preset-card">
                    <div className="preset-card-header">
                      <div className="preset-palette">
                        {preset.colors.map((c, i) => (
                          <span
                            key={i}
                            className="color-dot"
                            style={{ background: c }}
                            title={c}
                          />
                        ))}
                      </div>
                      <span className="preset-badge-tag">{preset.badge}</span>
                    </div>

                    <div className="preset-card-body">
                      <h4 className="preset-title">{preset.name}</h4>
                      <p className="preset-desc">{preset.description}</p>
                    </div>

                    <div className="preset-card-footer">
                      <button
                        type="button"
                        className="btn-apply-preset"
                        onClick={() => handleApplyPreset(preset)}
                      >
                        Apply This Design
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="visual-modal-footer">
              <button
                type="button"
                className="visual-btn-preview"
                onClick={() => setShowPresetsModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          INTERACTIVE SAMPLE DATA PREVIEW MODAL
          ===================================================================== */}
      {showPreviewModal && (
        <div className="visual-modal-backdrop" onClick={() => setShowPreviewModal(false)}>
          <div
            className="visual-modal-dialog sample-preview-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="visual-modal-header">
              <div>
                <h3>Interactive Sample Data Live Preview</h3>
                <span className="visual-editor-badge">
                  Simulating realistic intern records • Print & PDF Ready
                </span>
              </div>
              <button
                type="button"
                className="visual-modal-close"
                onClick={() => setShowPreviewModal(false)}
                title="Close preview"
              >
                ✕
              </button>
            </div>

            {/* Test Values Editor Strip */}
            <div className="preview-test-bar">
              <div className="test-field">
                <label>Recipient Name</label>
                <input
                  type="text"
                  value={sampleData.fullName}
                  onChange={(e) => handleSampleFieldChange("fullName", e.target.value)}
                  placeholder="Intern Full Name"
                />
              </div>

              <div className="test-field">
                <label>Domain / Program</label>
                <input
                  type="text"
                  value={sampleData.domain}
                  onChange={(e) => handleSampleFieldChange("domain", e.target.value)}
                  placeholder="Domain"
                />
              </div>

              <div className="test-field">
                <label>Issue Date</label>
                <input
                  type="text"
                  value={sampleData.issueDate}
                  onChange={(e) => handleSampleFieldChange("issueDate", e.target.value)}
                  placeholder="Issue Date"
                />
              </div>

              <div className="test-field">
                <label>Certificate ID</label>
                <input
                  type="text"
                  value={sampleData.certificateNumber}
                  onChange={(e) => handleSampleFieldChange("certificateNumber", e.target.value)}
                  placeholder="Certificate Number"
                />
              </div>
            </div>

            <div className="visual-modal-body preview-iframe-wrapper">
              <iframe
                title="Certificate Live Preview"
                srcDoc={compiledPreviewHtml}
                className="visual-preview-iframe"
              />
            </div>

            <div className="visual-modal-footer">
              <button
                type="button"
                className="visual-btn-save"
                onClick={handleDownloadPdfDirect}
                disabled={downloadingPdf}
                title="Download full-fidelity vector PDF"
              >
                {downloadingPdf ? (
                  <span>⏳ Rendering PDF...</span>
                ) : (
                  <>
                    <span>📥</span> Download PDF
                  </>
                )}
              </button>

              <button
                type="button"
                className="visual-btn-preview"
                onClick={handlePrintPreview}
                title="Print or save as PDF via browser"
              >
                <span>🖨</span> Print / Browser PDF
              </button>

              <button
                type="button"
                className="visual-btn-preview"
                onClick={handleDownloadHtml}
                title="Download self-contained HTML file"
              >
                <span>📄</span> Download HTML
              </button>

              <button
                type="button"
                className="visual-btn-preview"
                onClick={() => setShowPreviewModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VIEW & EDIT CODE MODAL
          ===================================================================== */}
      {showCodeModal && (
        <div className="visual-modal-backdrop" onClick={() => setShowCodeModal(false)}>
          <div
            className="visual-modal-dialog code-editor-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="visual-modal-header">
              <div>
                <h3>Template Document Code (HTML & CSS)</h3>
                <span className="visual-editor-badge">
                  You can edit markup directly and apply changes to the visual canvas
                </span>
              </div>
              <button
                type="button"
                className="visual-modal-close"
                onClick={() => setShowCodeModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="visual-modal-body">
              <textarea
                value={editableCode}
                onChange={(e) => setEditableCode(e.target.value)}
                className="visual-code-textarea"
                rows={20}
                spellCheck="false"
              />
            </div>

            <div className="visual-modal-footer">
              <button
                type="button"
                className="visual-btn-preview"
                onClick={() => {
                  navigator.clipboard?.writeText(editableCode);
                  showToastNotification("Code copied to clipboard!");
                }}
              >
                <span>📋</span> Copy Code
              </button>

              <button
                type="button"
                className="visual-btn-save"
                onClick={handleApplyCodeChanges}
              >
                Apply to Canvas
              </button>

              <button
                type="button"
                className="visual-btn-preview"
                onClick={() => setShowCodeModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          RESET CONFIRMATION MODAL
          ===================================================================== */}
      {showResetConfirm && (
        <div className="visual-modal-backdrop" onClick={() => setShowResetConfirm(false)}>
          <div
            className="visual-modal-dialog confirm-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="visual-modal-header">
              <h3>Reset Canvas Template?</h3>
              <button
                type="button"
                className="visual-modal-close"
                onClick={() => setShowResetConfirm(false)}
              >
                ✕
              </button>
            </div>

            <div className="visual-modal-body confirm-body">
              <p>
                Are you sure you want to reset the certificate canvas? Any unsaved modifications on the current canvas will be replaced with the default template.
              </p>
            </div>

            <div className="visual-modal-footer">
              <button
                type="button"
                className="visual-btn-preview"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger-confirm"
                onClick={handleConfirmReset}
              >
                Reset to Default
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateTemplateEditor;
