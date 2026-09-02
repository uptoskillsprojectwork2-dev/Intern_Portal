import Icon from "../../shared/Icons/Icon.jsx";

const CertificateCard = ({ certificate }) => {
  return (
    <article className="issued-certificate-card">

      {/* =========================================
          CERTIFICATE PREVIEW
      ========================================= */}
      <div
        className={`issued-certificate-preview ${certificate.accent}`}
      >
        <span>CERTIFICATE</span>

        <Icon
          name="certificate"
          size={26}
        />

        <small>
          Uptoskills
        </small>
      </div>

      {/* =========================================
          CERTIFICATE INFORMATION
      ========================================= */}
      <div className="issued-certificate-info">

        <div className="issued-title-row">

          <strong>
            {certificate.name}
          </strong>

          <span>
            <Icon
              name="check"
              size={12}
            />

            Approved
          </span>

        </div>

        <p>
          Issued on {certificate.issuedOn}
        </p>

        <small>
          Certificate ID: {certificate.id}
        </small>

        {/* =========================================
            ACTION BUTTONS
        ========================================= */}
        <div className="issued-actions">

          <button
            type="button"
          >
            View Certificate
          </button>

          <button
            type="button"
            className="primary"
          >
            ↓ Download
          </button>

        </div>

      </div>
    </article>
  );
};

export default CertificateCard;