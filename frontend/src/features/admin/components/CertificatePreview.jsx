const CertificatePreview = ({ htmlContent }) => {
  const previewHtml = htmlContent
    ? htmlContent.replace(
        "</head>",
        `
          <style>
            /* Preview-only responsive sizing */
            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              min-height: 100% !important;
              overflow: hidden !important;
              background: #e5e7eb !important;
            }

            .certificate {
              width: 100% !important;
              height: auto !important;
              aspect-ratio: 297 / 210 !important;

              min-height: 0 !important;

              margin: 0 auto !important;
            }

            .certificate-inner {
              width: 100% !important;
              height: 100% !important;
            }
          </style>
        </head>
        `
      )
    : `
      <!DOCTYPE html>
      <html>
        <body>
          <p>No certificate content available.</p>
        </body>
      </html>
    `;

  return (
    <iframe
      className="certificate-preview-frame"
      srcDoc={previewHtml}
      title="Certificate Preview"
    />
  );
};

export default CertificatePreview;