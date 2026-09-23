import { useRef } from "react";

export default function CertificatePreview({ html }) {
  const iframeRef = useRef(null);

  const handleLoad = () => {
    const iframe = iframeRef.current;

    if (!iframe) {
      return;
    }

    try {
      const document = iframe.contentDocument;

      if (!document?.documentElement || !document.body) {
        return;
      }

      const htmlElement = document.documentElement;
      const body = document.body;

      /*
       * The certificate template is designed for A4 landscape.
       * Scale the complete document to the available iframe width.
       */
      const availableWidth = iframe.clientWidth;
      const certificateWidth = 1122; // Approx. A4 landscape at 96 DPI

      const scale = Math.min(
        availableWidth / certificateWidth,
        1
      );

      htmlElement.style.width = `${certificateWidth}px`;
      htmlElement.style.minWidth = `${certificateWidth}px`;
      htmlElement.style.maxWidth = `${certificateWidth}px`;
      htmlElement.style.overflow = "hidden";

      body.style.width = `${certificateWidth}px`;
      body.style.minWidth = `${certificateWidth}px`;
      body.style.maxWidth = `${certificateWidth}px`;
      body.style.margin = "0";
      body.style.overflow = "hidden";
      body.style.transformOrigin = "top left";
      body.style.transform = `scale(${scale})`;

      /*
       * Prevent the iframe document from creating
       * horizontal scrolling.
       */
      htmlElement.style.overflowX = "hidden";
      body.style.overflowX = "hidden";
    } catch (error) {
      console.error(
        "Unable to scale certificate preview:",
        error
      );
    }
  };

  const previewHtml =
    html ||
    `
      <p style="
        font-family: sans-serif;
        padding: 24px;
        margin: 0;
      ">
        Certificate preview will appear here.
      </p>
    `;

  return (
    <div className="certificate-preview-shell">
      <iframe
        ref={iframeRef}
        title="Certificate preview"
        className="certificate-preview-frame"
        srcDoc={previewHtml}
        sandbox=""
        onLoad={handleLoad}
      />
    </div>
  );
}