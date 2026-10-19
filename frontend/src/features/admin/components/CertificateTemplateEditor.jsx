import { useEffect, useRef, useState } from "react";
import grapesjs from "grapesjs";
import QRCode from "qrcode";

import "grapesjs/dist/css/grapes.min.css";
import "./CertificateTemplateEditor.css";

const A4_WIDTH = 1123;
const A4_HEIGHT = 794;

const SAMPLE_QR_URL =
  "https://example.com/verify/CERT-2026-00019";

function extractTemplateParts(templateHtml = "") {
  let html = String(templateHtml);

  // Extract all <style>...</style> blocks
  const styleMatches = [
    ...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi),
  ];

  const css = styleMatches
    .map((match) => match[1])
    .join("\n");

  // Remove <style> blocks from HTML
  html = html.replace(
    /<style[^>]*>[\s\S]*?<\/style>/gi,
    ""
  );

  // If a <body> exists, use only its contents
  const bodyMatch = html.match(
    /<body[^>]*>([\s\S]*?)<\/body>/i
  );

  if (bodyMatch) {
    html = bodyMatch[1];
  }

  // Remove document-level tags
  html = html
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<body[^>]*>/gi, "")
    .replace(/<\/body>/gi, "")
    .trim();

  return {
    html,
    css,
  };
}

export default function CertificateTemplateEditor({
  initialHtml = "",
  onSave,
  onChange,
  onDirtyChange,
  onEditorReady,
  readOnly = false,
  saving = false,
  hideSaveButton = false,
  zoom = 1,
  onComponentSelect,
}) {
  const editorContainerRef = useRef(null);
  const editorRef = useRef(null);
  const onSaveRef = useRef(onSave);
  const onChangeRef = useRef(onChange);
  const onDirtyChangeRef = useRef(onDirtyChange);
  const onEditorReadyRef = useRef(onEditorReady);
  const onComponentSelectRef = useRef(onComponentSelect);
  const initialHtmlRef = useRef(initialHtml);
  const savedHtmlRef = useRef(initialHtml);
  const readOnlyRef = useRef(readOnly);
  const zoomRef = useRef(zoom);
  const hasUnsavedChangesRef = useRef(false);
  const serializeRef = useRef(() => initialHtmlRef.current);
  const [initializing, setInitializing] = useState(true);
  const [saveError, setSaveError] = useState("");

  // Keep refs up-to-date
  useEffect(() => {
    zoomRef.current = zoom;
    onComponentSelectRef.current = onComponentSelect;
  }, [zoom, onComponentSelect]);

  // Always keep the latest onSave function
  useEffect(() => {
    onSaveRef.current = onSave;
    onChangeRef.current = onChange;
    onDirtyChangeRef.current = onDirtyChange;
    onEditorReadyRef.current = onEditorReady;
    readOnlyRef.current = readOnly;
  }, [onSave, onChange, onDirtyChange, onEditorReady, readOnly]);

  useEffect(() => {
    let cancelled = false;
    let changeTimer;

    const initializeEditor = async () => {
      if (!editorContainerRef.current) {
        return;
      }

      // Destroy previous GrapesJS instance
      if (editorRef.current) {
        try {
          editorRef.current.destroy();
        } catch (error) {
          console.warn(
            "Could not destroy previous editor:",
            error
          );
        }

        editorRef.current = null;
      }

      // --------------------------------------------------
      // Generate sample QR code for the editor
      // --------------------------------------------------
      let qrDataUrl = "";

      try {
        qrDataUrl = await QRCode.toDataURL(
          SAMPLE_QR_URL,
          {
            width: 180,
            margin: 1,
            errorCorrectionLevel: "M",
          }
        );
      } catch (error) {
        console.error(
          "QR generation failed:",
          error
        );
      }

      if (cancelled) {
        return;
      }

      // --------------------------------------------------
      // Split CSS and HTML
      // --------------------------------------------------
      const parts = extractTemplateParts(initialHtmlRef.current);

      let editorHtml = parts.html;

      // Replace QR placeholder with sample QR image tag to prevent raw base64 string overflow
      if (qrDataUrl) {
        editorHtml = editorHtml
          .replace(/src=["']\{\{\s*qrCodeUrl\s*\}\}["']/gi, `src="${qrDataUrl}"`)
          .replace(/\{\{\s*qrCodeUrl\s*\}\}/gi, `<img src="${qrDataUrl}" alt="QR Code" style="width:100%;height:100%;object-fit:contain;display:block;" />`);
      }

      // --------------------------------------------------
      // Initialize GrapesJS
      // --------------------------------------------------
      const editor = grapesjs.init({
        container: editorContainerRef.current,

        dragMode: "absolute",

        height: `${A4_HEIGHT}px`,

        width: `${A4_WIDTH}px`,

        storageManager: false,

        undoManager: {
          track: true,
        },

        selectorManager: {
          componentFirst: true,
        },

        panels: {
          defaults: [],
        },

        blockManager: {
          appendTo: "#certificate-blocks",
        },

        deviceManager: {
          default: "a4-landscape",
          devices: [
            {
              id: "a4-landscape",
              name: "A4 Landscape",
              width: `${A4_WIDTH}px`,
              height: `${A4_HEIGHT}px`,
            },
          ],
        },

        // --------------------------------------------------
        // GrapesJS canvas styling
        // --------------------------------------------------
        canvas: {
          styles: [
            "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Inter:wght@400;500;600;700&display=swap",
            `
            * {
              box-sizing: border-box;
            }

            html {
              margin: 0;
              padding: 0;
              width: ${A4_WIDTH}px;
              min-height: ${A4_HEIGHT}px;
              background: #ffffff !important;
            }

            body {
              margin: 0;
              padding: 0;
              width: ${A4_WIDTH}px;
              min-height: ${A4_HEIGHT}px;
              background: #ffffff !important;
              color: #111827 !important;
              overflow: visible;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            }

            img {
              max-width: 100%;
            }
            `,
          ],
        },

        // --------------------------------------------------
        // Style manager
        // --------------------------------------------------
        styleManager: {
          sectors: [
            {
              name: "Position & Coordinates",
              open: true,
              properties: [
                {
                  name: "Position",
                  property: "position",
                  type: "select",
                  defaults: "static",
                  options: [
                    { value: "static", name: "Static" },
                    { value: "relative", name: "Relative" },
                    { value: "absolute", name: "Absolute (Movable)" },
                  ],
                },
                {
                  name: "Top (Y)",
                  property: "top",
                  type: "integer",
                  units: ["px", "%"],
                  defaults: "auto",
                },
                {
                  name: "Left (X)",
                  property: "left",
                  type: "integer",
                  units: ["px", "%"],
                  defaults: "auto",
                },
                {
                  name: "Z-Index",
                  property: "z-index",
                  type: "integer",
                  defaults: "auto",
                },
              ],
            },

            {
              name: "Dimension",
              open: false,
              properties: [
                "width",
                "height",
                "max-width",
                "min-height",
                "margin",
                "padding",
              ],
            },

            {
              name: "Typography",
              open: false,
              properties: [
                "font-family",
                "font-size",
                "font-weight",
                "color",
                "line-height",
                "text-align",
                "letter-spacing",
              ],
            },

            {
              name: "Decorations",
              open: false,
              properties: [
                "background-color",
                "border",
                "border-radius",
                "box-shadow",
              ],
            },
          ],
        },

        traitManager: {
          appendTo: ".gjs-traits-container",
        },
      });

      editorRef.current = editor;

      // --------------------------------------------------
      // Load original CSS
      // --------------------------------------------------
      if (parts.css.trim()) {
        editor.setStyle(parts.css);
      }

      // --------------------------------------------------
      // Load certificate HTML
      // --------------------------------------------------
      editor.setComponents(editorHtml);

      // Helper to ensure component is positioned absolutely without jumping
      const ensureComponentAbsolute = (component) => {
        if (!component) return;
        const el = component.getEl?.();
        if (!el || el.tagName === "BODY" || el.tagName === "HTML") return;

        component.set("dmode", "absolute");
        component.set("draggable", true);

        const style = component.getStyle?.() || {};
        if (style.position !== "absolute") {
          const win = el.ownerDocument?.defaultView || window;
          const targetRect = el.getBoundingClientRect();
          const offsetParent = el.offsetParent || el.ownerDocument?.body;
          if (!offsetParent) return;
          const parentRect = offsetParent.getBoundingClientRect();
          const parentComp = win.getComputedStyle(offsetParent);
          const borderLeft = parseFloat(parentComp.borderLeftWidth) || 0;
          const borderTop = parseFloat(parentComp.borderTopWidth) || 0;

          const relLeft = Math.round(targetRect.left - parentRect.left - borderLeft);
          const relTop = Math.round(targetRect.top - parentRect.top - borderTop);
          const curWidth = Math.round(targetRect.width);
          const curHeight = Math.round(targetRect.height);

          component.addStyle({
            position: "absolute",
            left: `${relLeft}px`,
            top: `${relTop}px`,
            width: `${curWidth}px`,
            height: `${curHeight}px`,
            margin: "0px",
          });
        }
      };

      // Wrap core:component-drag to dynamically compensate for canvas zoom scale
      // and ensure elements have absolute coordinates relative to their container before drag
      const origCompDrag = editor.Commands.get("core:component-drag");
      if (origCompDrag) {
        editor.Commands.add("core:component-drag", {
          ...origCompDrag,
          run(ed, sender, options = {}) {
            const target = options.target || ed.getSelected();
            if (target) {
              const targets = Array.isArray(target) ? target : [target];
              targets.forEach((t) => ensureComponentAbsolute(t));
            }
            options.dragger = {
              ...options.dragger,
              scale: () => 1 / (zoomRef.current || 1),
            };
            return origCompDrag.run.call(origCompDrag, ed, sender, options);
          },
        });
      }

      // Notify parent of selected component and keep draggable
      const reportSelectedComponent = (component) => {
        if (typeof onComponentSelectRef.current !== "function") return;
        if (!component) {
          onComponentSelectRef.current(null);
          return;
        }
        const el = component.getEl?.();
        const tag = el?.tagName?.toLowerCase() || "";
        const text = (el?.innerText || "").trim().slice(0, 24);
        const name = component.getName?.() || text || tag || "Element";
        const st = component.getStyle?.() || {};
        onComponentSelectRef.current({
          name,
          left: st.left || "auto",
          top: st.top || "auto",
          position: st.position || "absolute",
        });
      };

      editor.on("component:selected", (component) => {
        if (!component) return;
        component.set("dmode", "absolute");
        component.set("draggable", true);
        reportSelectedComponent(component);
      });

      editor.on("component:deselected", () => {
        reportSelectedComponent(null);
      });

      editor.on("component:styleUpdate", (component) => {
        const selected = editor.getSelected();
        if (selected === component) {
          reportSelectedComponent(component);
        }
      });

      const serialize = () => {
        let html = editor.getHtml();
        if (qrDataUrl) {
          html = html
            .replace(/<img[^>]*alt=["']QR Code["'][^>]*src=["'][^"']*["'][^>]*\/?>/gi, "{{qrCodeUrl}}")
            .replaceAll(qrDataUrl, "{{qrCodeUrl}}");
        }
        return `<style>\n${editor.getCss()}\n</style>\n${html}`.trim();
      };

      const emitChange = () => {
        if (readOnlyRef.current || typeof onChangeRef.current !== "function") return;
        window.clearTimeout(changeTimer);
        changeTimer = window.setTimeout(() => {
          const content = serialize();
          hasUnsavedChangesRef.current = content !== savedHtmlRef.current;
          onDirtyChangeRef.current?.(hasUnsavedChangesRef.current);
          onChangeRef.current(content);
        }, 180);
      };
      editor.on("update", emitChange);
      editor.on("component:update", emitChange);
      editor.on("style:property:update", emitChange);

      const insertPlaceholder = (placeholder) => {
        if (readOnlyRef.current) return;
        const selected = editor.getSelected();
        if (selected) selected.append(placeholder);
        else editor.addComponents(placeholder);
        emitChange();
      };

      serializeRef.current = serialize;

      onEditorReadyRef.current?.({
        insertPlaceholder,
        getHtml: serialize,
        getEditor: () => editor,
        nudgeSelected: (dx, dy) => {
          if (readOnlyRef.current) return;
          const selected = editor.getSelected();
          if (!selected) return;
          ensureComponentAbsolute(selected);
          const curStyle = selected.getStyle?.() || {};
          const curLeft = parseFloat(curStyle.left) || 0;
          const curTop = parseFloat(curStyle.top) || 0;
          selected.addStyle({
            left: `${curLeft + dx}px`,
            top: `${curTop + dy}px`,
          });
          reportSelectedComponent(selected);
          emitChange();
        },
        markSaved: () => {
          savedHtmlRef.current = serialize();
          hasUnsavedChangesRef.current = false;
          onDirtyChangeRef.current?.(false);
        },
      });

      let cleanupListeners = () => {};

      // --------------------------------------------------
      // Force A4 white canvas after GrapesJS loads
      // --------------------------------------------------
      editor.on("load", () => {
        try {
          editor.setDevice("a4-landscape");
        } catch (e) {}

        const frame = editor.Canvas.getFrameEl();

        if (!frame) {
          return;
        }

        frame.style.width = `${A4_WIDTH}px`;
        frame.style.height = `${A4_HEIGHT}px`;
        frame.style.margin = "0 auto";
        frame.style.display = "block";
        frame.style.background = "#ffffff";

        const frameDocument = frame.contentDocument;

        if (frameDocument) {
          if (!frameDocument.querySelector("link[href*='Playfair']")) {
            const fontLink = frameDocument.createElement("link");
            fontLink.rel = "stylesheet";
            fontLink.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Inter:wght@400;500;600;700&display=swap";
            frameDocument.head.appendChild(fontLink);
          }

          const htmlElement = frameDocument.documentElement;
          const bodyElement = frameDocument.body;

          if (htmlElement) {
            htmlElement.style.width = `${A4_WIDTH}px`;
            htmlElement.style.minHeight = `${A4_HEIGHT}px`;
            htmlElement.style.background = "#ffffff";
          }

          if (bodyElement) {
            bodyElement.style.width = `${A4_WIDTH}px`;
            bodyElement.style.minHeight = `${A4_HEIGHT}px`;
            bodyElement.style.margin = "0";
            bodyElement.style.padding = "0";
            bodyElement.style.background = "#ffffff";
            bodyElement.style.color = "#111827";
            bodyElement.style.overflow = "visible";
          }

          // Keyboard nudge support (arrow keys)
          const handleKeyDown = (e) => {
            if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
            const selected = editor.getSelected();
            if (!selected) return;
            const el = selected.getEl?.();
            if (!el || el.tagName === "BODY" || el.tagName === "HTML") return;

            const activeEl = el.ownerDocument?.activeElement || document.activeElement;
            if (activeEl?.isContentEditable || activeEl?.tagName === "INPUT" || activeEl?.tagName === "TEXTAREA") {
              return;
            }

            e.preventDefault();
            ensureComponentAbsolute(selected);
            const curStyle = selected.getStyle?.() || {};
            const curLeft = parseFloat(curStyle.left) || 0;
            const curTop = parseFloat(curStyle.top) || 0;
            const step = e.shiftKey ? 10 : 1;

            let newLeft = curLeft;
            let newTop = curTop;
            if (e.key === "ArrowUp") newTop -= step;
            if (e.key === "ArrowDown") newTop += step;
            if (e.key === "ArrowLeft") newLeft -= step;
            if (e.key === "ArrowRight") newLeft += step;

            selected.addStyle({
              left: `${newLeft}px`,
              top: `${newTop}px`,
            });
            reportSelectedComponent(selected);
            emitChange();
          };

          frameDocument.addEventListener("keydown", handleKeyDown);
          window.addEventListener("keydown", handleKeyDown);

          // Direct mousedown dragging support for selected element
          let isMouseDownOnSelected = false;
          let dragInitiated = false;
          let startMousePos = { x: 0, y: 0 };

          const onFrameMouseDown = (e) => {
            const selected = editor.getSelected();
            if (!selected) return;
            const selectedEl = selected.getEl?.();
            if (!selectedEl || selectedEl.tagName === "BODY" || selectedEl.tagName === "HTML") return;

            if (selectedEl.contains(e.target) && !e.target.isContentEditable) {
              isMouseDownOnSelected = true;
              dragInitiated = false;
              startMousePos = { x: e.clientX, y: e.clientY };
            }
          };

          const onFrameMouseMove = (e) => {
            if (!isMouseDownOnSelected || dragInitiated) return;
            const dist = Math.hypot(e.clientX - startMousePos.x, e.clientY - startMousePos.y);
            if (dist > 3) {
              dragInitiated = true;
              const selected = editor.getSelected();
              if (selected) {
                ensureComponentAbsolute(selected);
                editor.runCommand("tlb-move", { target: selected, event: e });
              }
            }
          };

          const resetDrag = () => {
            isMouseDownOnSelected = false;
            dragInitiated = false;
          };

          frameDocument.addEventListener("mousedown", onFrameMouseDown);
          frameDocument.addEventListener("mousemove", onFrameMouseMove);
          frameDocument.addEventListener("mouseup", resetDrag);
          window.addEventListener("mouseup", resetDrag);

          cleanupListeners = () => {
            frameDocument.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keydown", handleKeyDown);
            frameDocument.removeEventListener("mousedown", onFrameMouseDown);
            frameDocument.removeEventListener("mousemove", onFrameMouseMove);
            frameDocument.removeEventListener("mouseup", resetDrag);
            window.removeEventListener("mouseup", resetDrag);
          };
        }
      });

      // --------------------------------------------------
      // Save command
      // --------------------------------------------------
      editor.Commands.add(
        "certificate-save",
        {
          run() {
            if (
              typeof onSaveRef.current ===
              "function"
            ) {
              onSaveRef.current(serialize());
            }
          },
        }
      );

      setInitializing(false);
    };

    initializeEditor();

    // --------------------------------------------------
    // Cleanup
    // --------------------------------------------------
    return () => {
      cancelled = true;
      window.clearTimeout(changeTimer);
      cleanupListeners();

      if (editorRef.current) {
        try {
          editorRef.current.destroy();
        } catch (error) {
          console.warn(
            "Could not destroy editor:",
            error
          );
        }

        editorRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`certificate-template-editor ${readOnly ? "is-read-only" : ""}`}>
      {initializing && (
        <div className="certificate-editor-loading-skeleton" role="status">
          <span className="certificate-editor-loading-spinner" />
          Preparing the A4 editor…
        </div>
      )}
      {onSave && !hideSaveButton && (
        <div className="certificate-editor-actions">
          <div>
            {saveError && <p className="certificate-editor-save-error" role="alert">{saveError}</p>}
            {saveError && <button type="button" className="certificate-editor-retry" onClick={async () => {
              setSaveError("");
              try {
                await onSaveRef.current?.(serializeRef.current());
                savedHtmlRef.current = serializeRef.current();
                hasUnsavedChangesRef.current = false;
                onDirtyChangeRef.current?.(false);
              } catch (error) {
                setSaveError(error.message || "Unable to save. Retry the save when ready.");
              }
            }}>Retry save</button>}
          </div>
          <button
            type="button"
            disabled={readOnly || saving || initializing}
            onClick={async () => {
              setSaveError("");
              try {
                const saved = await onSaveRef.current?.(serializeRef.current());
                if (saved !== false) {
                  savedHtmlRef.current = serializeRef.current();
                  hasUnsavedChangesRef.current = false;
                  onDirtyChangeRef.current?.(false);
                }
              } catch (error) {
                setSaveError(error.message || "Unable to save. Retry the save when ready.");
              }
            }}
          >
            {saving ? "Saving…" : "Save Template"}
          </button>
        </div>
      )}
      <div
        id="certificate-blocks"
        style={{ display: "none" }}
      />

      <div
        ref={editorContainerRef}
        className="certificate-editor-canvas"
      />

      <UnloadWarning refValue={hasUnsavedChangesRef} />
    </div>
  );
}

function UnloadWarning({ refValue }) {
  useEffect(() => {
    const warn = (event) => {
      if (!refValue.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
    };
  }, [refValue]);
  return null;
}
