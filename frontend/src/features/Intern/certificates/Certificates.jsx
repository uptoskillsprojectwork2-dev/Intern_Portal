import { useMemo, useState } from "react";
import Icon from "../../shared/Icons/Icon.jsx";
import CertificateCard from "./CertificateCard";

const Certificates = ({
  onRequestCertificate,
  certificateRequests = [],
  issuedCertificates = [],
  selectedInternship,
  onViewCertificate,
  onDownloadCertificate,
}) => {
  const [certificateFilter, setCertificateFilter] =
    useState("All");

  // ======================================================
  // SELECTED INTERNSHIP ID
  // ======================================================

  const currentInternshipId =
    selectedInternship?.id ||
    selectedInternship?._id ||
    selectedInternship?.internshipId ||
    "";

  // ======================================================
  // SELECTED INTERNSHIP NAME
  // ======================================================

  const currentInternshipName =
    selectedInternship?.domain ||
    selectedInternship?.name ||
    selectedInternship?.title ||
    "Selected Internship";

  // ======================================================
  // GET REQUESTS FOR SELECTED INTERNSHIP
  // ======================================================

  const internshipRequests = useMemo(() => {
    if (!selectedInternship) {
      return [];
    }

    if (!Array.isArray(certificateRequests)) {
      return [];
    }

    return certificateRequests.filter((request) => {
      const requestInternshipId =
        request?.internshipId ||
        request?.internship?._id ||
        request?.internship?.id ||
        "";

      return (
        String(requestInternshipId) ===
        String(currentInternshipId)
      );
    });
  }, [
    certificateRequests,
    currentInternshipId,
    selectedInternship,
  ]);

  // ======================================================
  // GET ISSUED CERTIFICATES FOR SELECTED INTERNSHIP
  // ======================================================

  const internshipCertificates = useMemo(() => {
    if (!selectedInternship) {
      return [];
    }

    if (!Array.isArray(issuedCertificates)) {
      return [];
    }

    return issuedCertificates.filter((certificate) => {
      const certificateInternshipId =
        certificate?.internshipId ||
        certificate?.internship?._id ||
        certificate?.internship?.id ||
        "";

      return (
        String(certificateInternshipId) ===
        String(currentInternshipId)
      );
    });
  }, [
    issuedCertificates,
    currentInternshipId,
    selectedInternship,
  ]);

  // ======================================================
  // FILTER REQUESTS
  // ======================================================

  const filteredRequests =
    certificateFilter === "All"
      ? internshipRequests
      : internshipRequests.filter(
          (request) =>
            request?.status === certificateFilter
        );

  // ======================================================
  // COUNTS
  // ======================================================

  const totalCertificates =
    internshipCertificates.length;

  const approvedCertificates =
    internshipCertificates.filter(
      (certificate) =>
        certificate?.status === "Approved"
    ).length;

  const pendingRequests =
    internshipRequests.filter(
      (request) =>
        request?.status === "Pending"
    ).length;

  const rejectedRequests =
    internshipRequests.filter(
      (request) =>
        request?.status === "Rejected"
    ).length;

  // ======================================================
  // DATE FORMAT
  // ======================================================

  const formatDate = (value) => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ======================================================
  // VIEW
  // ======================================================

  const handleView = (item) => {
    if (typeof onViewCertificate === "function") {
      onViewCertificate(item);
    }
  };

  // ======================================================
  // DOWNLOAD
  // ======================================================

  const handleDownload = (item) => {
    if (typeof onDownloadCertificate === "function") {
      onDownloadCertificate(item);
    }
  };

  // ======================================================
  // NO INTERNSHIP SELECTED
  // ======================================================

  if (!selectedInternship) {
    return (
      <>
        <section className="page-heading certificate-page-heading">
          <div>
            <p className="eyebrow">
              DOCUMENT CENTRE
            </p>

            <h1>Certificates</h1>

            <p>
              Track certificate requests and manage
              your issued certificates.
            </p>
          </div>

          <button
            type="button"
            className="btn-primary"
            disabled
          >
            + Request Certificate
          </button>
        </section>

        <section className="certificate-main-panel certificate-no-internship">
          <div className="certificate-empty-filter">
            <Icon
              name="certificate"
              size={25}
            />

            <strong>
              No internship selected
            </strong>

            <span>
              Select an internship to view its
              certificates and requests.
            </span>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      {/* ==================================================
          PAGE HEADER
      ================================================== */}

      <section className="page-heading certificate-page-heading">
        <div>
          <p className="eyebrow">
            DOCUMENT CENTRE
          </p>

          <h1>
            Certificates
          </h1>

          <p>
            Track certificate requests and manage
            your issued certificates.
          </p>

          <div className="certificate-current-internship">
            <span>
              CURRENT INTERNSHIP
            </span>

            <strong>
              {currentInternshipName}
            </strong>
          </div>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={onRequestCertificate}
        >
          + Request Certificate
        </button>
      </section>

      {/* ==================================================
          CERTIFICATE OVERVIEW
      ================================================== */}

      <section className="certificate-overview-grid">

        {/* TOTAL */}

        <article className="certificate-overview-card purple">
          <div className="overview-icon">
            <Icon
              name="certificate"
              size={21}
            />
          </div>

          <div>
            <strong>
              {String(totalCertificates).padStart(
                2,
                "0"
              )}
            </strong>

            <span>
              Total Certificates
            </span>

            <small>
              This internship
            </small>
          </div>
        </article>

        {/* APPROVED */}

        <article className="certificate-overview-card green">
          <div className="overview-icon">
            <Icon
              name="check"
              size={21}
            />
          </div>

          <div>
            <strong>
              {String(approvedCertificates).padStart(
                2,
                "0"
              )}
            </strong>

            <span>
              Approved
            </span>

            <small>
              Issued certificates
            </small>
          </div>
        </article>

        {/* PENDING */}

        <article className="certificate-overview-card orange">
          <div className="overview-icon">
            <span>◷</span>
          </div>

          <div>
            <strong>
              {String(pendingRequests).padStart(
                2,
                "0"
              )}
            </strong>

            <span>
              Pending
            </span>

            <small>
              Awaiting review
            </small>
          </div>
        </article>

        {/* REJECTED */}

        <article className="certificate-overview-card red">
          <div className="overview-icon">
            <span>×</span>
          </div>

          <div>
            <strong>
              {String(rejectedRequests).padStart(
                2,
                "0"
              )}
            </strong>

            <span>
              Rejected
            </span>

            <small>
              Request status
            </small>
          </div>
        </article>

      </section>

      {/* ==================================================
          CERTIFICATE REQUESTS
      ================================================== */}

      <section className="certificate-main-panel">

        <div className="certificate-tabs-row">

          <div>
            <p className="eyebrow">
              REQUESTS
            </p>

            <h3>
              Certificate Requests
            </h3>
          </div>

          {internshipRequests.length > 0 && (
            <div className="certificate-filter-tabs">
              {[
                "All",
                "Approved",
                "Pending",
                "Rejected",
              ].map((filter) => (
                <button
                  type="button"
                  key={filter}
                  className={
                    certificateFilter === filter
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setCertificateFilter(filter)
                  }
                >
                  {filter}
                </button>
              ))}
            </div>
          )}

        </div>

        {/* ==================================================
            EMPTY REQUEST STATE
        ================================================== */}

        {filteredRequests.length === 0 ? (
          <div className="certificate-empty-filter">

            <Icon
              name="certificate"
              size={25}
            />

            <strong>
              {certificateFilter === "All"
                ? "No certificate requests yet"
                : `No ${certificateFilter.toLowerCase()} requests`}
            </strong>

            <span>
              {certificateFilter === "All"
                ? "You haven't requested a certificate for this internship yet."
                : `There are no ${certificateFilter.toLowerCase()} certificate requests for this internship.`}
            </span>

            {certificateFilter === "All" && (
              <button
                type="button"
                className="btn-primary"
                onClick={onRequestCertificate}
              >
                + Request Certificate
              </button>
            )}

          </div>
        ) : (

          /* ==================================================
             REQUEST LIST
          ================================================== */

          <div className="certificate-table-wrap">

            <div className="certificate-table-head">

              <span>
                Certificate
              </span>

              <span>
                Request ID
              </span>

              <span>
                Requested On
              </span>

              <span>
                Status
              </span>

              <span>
                Action
              </span>

            </div>

            {filteredRequests.map((item) => {

              const status =
                item?.status || "Pending";

              const requestId =
                item?.id ||
                item?._id ||
                item?.requestId ||
                "—";

              const certificateName =
                item?.certificateName ||
                item?.type ||
                item?.certificateType ||
                "Certificate Request";

              const requestedOn =
                item?.requestedOn ||
                item?.createdAt ||
                item?.requestedAt;

              return (
                <div
                  className="certificate-table-row"
                  key={String(requestId)}
                >

                  {/* CERTIFICATE */}

                  <div className="table-type-cell">

                    <div
                      className={`table-certificate-icon ${status.toLowerCase()}`}
                    >
                      <Icon
                        name="certificate"
                        size={18}
                      />
                    </div>

                    <span>
                      {certificateName}
                    </span>

                  </div>

                  {/* REQUEST ID */}

                  <span>
                    {requestId}
                  </span>

                  {/* DATE */}

                  <span>
                    {formatDate(requestedOn)}
                  </span>

                  {/* STATUS */}

                  <span
                    className={`table-status ${status.toLowerCase()}`}
                  >

                    {status === "Approved" && (
                      <Icon
                        name="check"
                        size={13}
                      />
                    )}

                    {status === "Pending" && (
                      <span>◷</span>
                    )}

                    {status === "Rejected" && (
                      <span>×</span>
                    )}

                    {status}

                  </span>

                  {/* ACTION */}

                  <div className="table-actions">

                    <button
                      type="button"
                      onClick={() =>
                        handleView(item)
                      }
                    >
                      View
                    </button>

                    {status === "Approved" && (
                      <button
                        type="button"
                        className="download"
                        onClick={() =>
                          handleDownload(item)
                        }
                      >
                        ↓ Download
                      </button>
                    )}

                  </div>

                </div>
              );
            })}

          </div>
        )}

      </section>

      {/* ==================================================
          LOWER SECTION
      ================================================== */}

      <div className="certificates-lower-grid">

        {/* ==================================================
            MY CERTIFICATES
        ================================================== */}

        <section className="certificate-main-panel issued-panel">

          <div className="certificate-tabs-row">

            <div>
              <p className="eyebrow">
                ISSUED
              </p>

              <h3>
                My Certificates
              </h3>
            </div>

            {internshipCertificates.length > 0 && (
              <button
                type="button"
                className="reference-view-all"
              >
                View All →
              </button>
            )}

          </div>

          <div className="issued-certificate-list">

            {internshipCertificates.length > 0 ? (

              internshipCertificates.map(
                (certificate) => (
                  <CertificateCard
                    key={
                      certificate?.id ||
                      certificate?._id
                    }
                    certificate={certificate}
                  />
                )
              )

            ) : (

              <div className="certificate-empty-filter">

                <Icon
                  name="certificate"
                  size={25}
                />

                <strong>
                  No certificates yet
                </strong>

                <span>
                  Approved certificates for this
                  internship will appear here
                  automatically.
                </span>

              </div>

            )}

          </div>

        </section>

        {/* ==================================================
            REQUEST CERTIFICATE
        ================================================== */}

        <section className="certificate-main-panel request-help-panel">

          <p className="eyebrow">
            NEW REQUEST
          </p>

          <h3>
            Need a certificate?
          </h3>

          <p>
            Request an eligible certificate
            available for your current internship.
          </p>

          <button
            type="button"
            className="btn-primary"
            onClick={onRequestCertificate}
          >
            + Request Certificate
          </button>

        </section>

      </div>

      {/* ==================================================
          RECENT ACTIVITY
      ================================================== */}

      <section className="certificate-main-panel">

        <div className="certificate-tabs-row">

          <div>
            <p className="eyebrow">
              ACTIVITY
            </p>

            <h3>
              Recent Activity
            </h3>
          </div>

        </div>

        {internshipRequests.length === 0 &&
        internshipCertificates.length === 0 ? (

          <div className="certificate-empty-filter">

            <Icon
              name="activity"
              size={25}
            />

            <strong>
              No recent activity
            </strong>

            <span>
              Activity for this internship will
              appear here automatically.
            </span>

          </div>

        ) : (

          <div className="certificate-activity-list">

            {/* REQUEST ACTIVITY */}

            {internshipRequests.map((request) => {

              const requestId =
                request?.id ||
                request?._id ||
                request?.requestId;

              const certificateName =
                request?.certificateName ||
                request?.type ||
                request?.certificateType ||
                "Certificate Request";

              const status =
                request?.status ||
                "Pending";

              const requestDate =
                request?.requestedOn ||
                request?.createdAt ||
                request?.requestedAt;

              return (
                <div
                  className="certificate-activity-item"
                  key={`request-${String(
                    requestId
                  )}`}
                >

                  <div className="activity-icon">

                    {status === "Approved" && (
                      <Icon
                        name="check"
                        size={15}
                      />
                    )}

                    {status === "Pending" && (
                      <span>◷</span>
                    )}

                    {status === "Rejected" && (
                      <span>×</span>
                    )}

                  </div>

                  <div>
                    <strong>
                      {certificateName}
                    </strong>

                    <span>
                      Certificate request •{" "}
                      {formatDate(requestDate)}
                    </span>
                  </div>

                  <span
                    className={`activity-status ${status.toLowerCase()}`}
                  >
                    {status}
                  </span>

                </div>
              );
            })}

            {/* ISSUED CERTIFICATE ACTIVITY */}

            {internshipCertificates.map(
              (certificate) => {

                const certificateId =
                  certificate?.id ||
                  certificate?._id;

                const certificateName =
                  certificate?.certificateName ||
                  certificate?.name ||
                  certificate?.type ||
                  "Certificate";

                const issuedDate =
                  certificate?.issuedOn ||
                  certificate?.issuedAt ||
                  certificate?.createdAt;

                return (
                  <div
                    className="certificate-activity-item"
                    key={`certificate-${String(
                      certificateId
                    )}`}
                  >

                    <div className="activity-icon">
                      <Icon
                        name="check"
                        size={15}
                      />
                    </div>

                    <div>
                      <strong>
                        {certificateName}
                      </strong>

                      <span>
                        Certificate issued •{" "}
                        {formatDate(issuedDate)}
                      </span>
                    </div>

                    <span className="activity-status approved">
                      Approved
                    </span>

                  </div>
                );
              }
            )}

          </div>
        )}

      </section>
    </>
  );
};

export default Certificates;