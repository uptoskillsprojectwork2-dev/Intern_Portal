const CertificatePreview = ({ html }) => {
  return (
    <div className="certificate-preview">
      <iframe
        title="Certificate Preview"
        srcDoc={
          html ||
          `
            <html>
              <body style="font-family: Arial; padding: 40px;">
                <h1>Certificate Preview</h1>
                <p>Your certificate preview will appear here.</p>
              </body>
            </html>
          `
        }
        style={{
          width: '100%',
          height: '600px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          background: '#fff',
        }}
      />
    </div>
  );
};

export default CertificatePreview;