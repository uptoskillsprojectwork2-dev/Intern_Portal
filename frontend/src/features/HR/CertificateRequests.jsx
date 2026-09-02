import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "/api/intern/certificate-requests";

const CERTIFICATE_TYPES = [
  "Internship Completion Certificate",
  "Bonafide Certificate",
  "OJD Certificate",
  "Experience Letter Certificate",
  "League Winner Certificate",
  "Intern of the Month Certificate",
  "TL of the Month Certificate",
];

const CertificateRequest = ({
  show,
  close,

  selectedCertificate = "",
  setSelectedCertificate,

  selectedInternship,

  requestStep = 1,
  setRequestStep,

  requestForm = {},
  updateRequestField,

  submitCertificateRequest,

  displayName = "",
}) => {
  // ============================================================
  // ROUTE / MODAL MODE
  // ============================================================

  const navigate = useNavigate();

  // When `show` is omitted, this component is being used as
  // the normal page at /intern/certificate-request.
  // When `show` is supplied, the existing dashboard modal
  // behavior continues to work.
  const isPageMode = typeof show === "undefined";

  // ============================================================
  // LOCAL FALLBACK STATE
  // ============================================================

  const [localSelectedCertificate, setLocalSelectedCertificate] =
    useState("");

  const [localRequestStep, setLocalRequestStep] =
    useState(1);

  const [localRequestForm, setLocalRequestForm] =
    useState({
      fullName: displayName || "",
      email: "",
      phone: "",
      address: "",
      opinions: "",
      purpose: "",
    });

  const effectiveSelectedCertificate =
    selectedCertificate || localSelectedCertificate;

  const effectiveRequestStep =
    typeof requestStep === "number"
      ? requestStep
      : localRequestStep;

  const effectiveRequestForm =
    requestForm && Object.keys(requestForm).length > 0
      ? requestForm
      : localRequestForm;

  const setSelectedCertificateValue =
    typeof setSelectedCertificate === "function"
      ? setSelectedCertificate
      : setLocalSelectedCertificate;

  const setRequestStepValue =
    typeof setRequestStep === "function"
      ? setRequestStep
      : setLocalRequestStep;

  const updateRequestFormValue = (field, value) => {
    if (typeof updateRequestField === "function") {
      updateRequestField(field, value);
      return;
    }

    setLocalRequestForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // ============================================================
  // LOCAL VALIDATION STATE
  // ============================================================

  const [errors, setErrors] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // ============================================================
  // GET INTERNSHIP DATA
  // ============================================================

  const internshipName =
    selectedInternship?.domain ||
    selectedInternship?.name ||
    selectedInternship?.title ||
    "Not selected";

  const internshipId =
    selectedInternship?.internId ||
    selectedInternship?.internshipId ||
    selectedInternship?.id ||
    selectedInternship?._id ||
    "Not available";

  const organization =
    selectedInternship?.organization ||
    selectedInternship?.company ||
    "Not available";

  const startDate =
    selectedInternship?.startDate ||
    "Not available";

  const endDate =
    selectedInternship?.endDate ||
    "Not available";

  const role =
    selectedInternship?.role ||
    selectedInternship?.position ||
    "Not available";

  // ============================================================
  // OPEN / CLOSE RESET
  // ============================================================

  useEffect(() => {
    if (isPageMode || show) {
      setErrors({});
    }
  }, [isPageMode, show]);

  // ============================================================
  // CLOSE
  // ============================================================

  const handleClose = () => {
    setErrors({});
    setSubmitError("");

    if (typeof close === "function") {
      close();
      return;
    }

    if (isPageMode) {
      navigate("/intern/certificates");
    }
  };

  // ============================================================
  // UPDATE FIELD SAFELY
  // ============================================================

  const updateField = (field, value) => {
    updateRequestFormValue(field, value);

    if (errors[field]) {
      setErrors((previous) => ({
        ...previous,
        [field]: "",
      }));
    }
  };

  // ============================================================
  // STEP 1 VALIDATION
  // ============================================================

  const handleNext = () => {
    if (!effectiveSelectedCertificate) {
      setErrors({
        certificate: "Please select a certificate type.",
      });

      return;
    }

    setErrors({});
    setRequestStepValue(2);
  };

  // ============================================================
  // STEP 2 VALIDATION
  // ============================================================

  const validateDetails = () => {
    const newErrors = {};

    /*
     * These values come from Profile.
     *
     * The parent component should keep them synchronized
     * with the profile state.
     */

    const fullName =
      effectiveRequestForm?.fullName !== undefined
        ? requestForm.fullName
        : displayName || "";

    const email =
      effectiveRequestForm?.email !== undefined
        ? requestForm.email
        : "";

    const phone =
      effectiveRequestForm?.phone !== undefined
        ? requestForm.phone
        : "";

    const address =
      effectiveRequestForm?.address !== undefined
        ? requestForm.address
        : "";

    /*
     * Intern ID / domain / organization / dates
     * are HR-controlled.
     *
     * We only validate that the selected internship
     * actually contains them.
     */

    /*
     * Internship information is HR/backend controlled.
     * If it has not arrived yet, keep the workflow usable and
     * show "Not selected" in the form. The backend can validate
     * the final request once internship data is available.
     */


    if (!String(fullName).trim()) {
      newErrors.fullName =
        "Full name is required.";
    }

    if (!String(email).trim()) {
      newErrors.email =
        "Email is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        String(email).trim()
      )
    ) {
      newErrors.email =
        "Please enter a valid email address.";
    }

    if (!String(phone).trim()) {
      newErrors.phone =
        "Phone number is required.";
    }

    if (!String(address).trim()) {
      newErrors.address =
        "Address is required.";
    }

    /*
     * Intern ID, domain, organization and dates are intentionally
     * NOT required on the frontend when no internship is selected.
     *
     * They are HR/backend controlled and will be populated
     * automatically when the API returns the selected internship.
     */


    if (
      !String(
        effectiveRequestForm?.purpose || ""
      ).trim()
    ) {
      newErrors.purpose =
        "Please enter the purpose of the request.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // ============================================================
  // STEP 2 → STEP 3
  // ============================================================

  const handleDetailsNext = () => {
    if (!validateDetails()) {
      return;
    }

    setRequestStepValue(3);
  };

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async () => {
    /*
     * Final validation before sending.
     */
    if (!effectiveSelectedCertificate) {
      setRequestStepValue(1);

      setErrors({
        certificate:
          "Please select a certificate type.",
      });

      return;
    }

    if (!validateDetails()) {
      setRequestStepValue(2);
      return;
    }

    setErrors({});
    setSubmitError("");
    setSubmitLoading(true);

    /*
     * The intern sends the request to the backend.
     *
     * The backend is responsible for:
     * - authenticating the intern
     * - validating the internship
     * - storing the certificate request
     * - making the request available to HR
     *
     * HR does NOT receive the request directly from React.
     */
    const payload = {
      certificateType: effectiveSelectedCertificate,

      fullName:
        effectiveRequestForm?.fullName ||
        displayName ||
        "",

      email:
        effectiveRequestForm?.email ||
        "",

      phone:
        effectiveRequestForm?.phone ||
        effectiveRequestForm?.phoneNumber ||
        "",

      address:
        effectiveRequestForm?.address ||
        effectiveRequestForm?.location ||
        "",

      purpose:
        effectiveRequestForm?.purpose ||
        "",

      opinions:
        effectiveRequestForm?.opinions ||
        "",

      internship: {
        id:
          selectedInternship?.id ||
          selectedInternship?._id ||
          selectedInternship?.internshipId ||
          "",

        internshipId:
          selectedInternship?.internshipId ||
          selectedInternship?.internId ||
          "",

        domain:
          selectedInternship?.domain ||
          selectedInternship?.name ||
          selectedInternship?.title ||
          "",

        organization:
          selectedInternship?.organization ||
          selectedInternship?.company ||
          "",

        role:
          selectedInternship?.role ||
          selectedInternship?.position ||
          "",

        startDate:
          selectedInternship?.startDate ||
          "",

        endDate:
          selectedInternship?.endDate ||
          "",
      },
    };

    try {
      const response = await fetch(API_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message ||
          data?.error ||
          `Request failed with status ${response.status}`
        );
      }

      /*
       * Request has been stored by the backend.
       * HR can now retrieve it from the HR certificate
       * requests endpoint.
       */
      setRequestStepValue(4);

      /*
       * Keep parent state synchronized when the parent
       * provides a submit callback.
       */
      if (typeof submitCertificateRequest === "function") {
        submitCertificateRequest(data);
      }
    } catch (error) {
      console.error(
        "Failed to submit certificate request:",
        error
      );

      setSubmitError(
        error?.message ||
        "Unable to submit certificate request. Please try again."
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  // ============================================================
  // DON'T RENDER WHEN CLOSED
  // ============================================================

  if (show === false) {
    return null;
  }

  const step =
    Number(effectiveRequestStep) || 1;

  // ============================================================
  // DISPLAY VALUES
  // ============================================================

  const fullName =
    effectiveRequestForm?.fullName !== undefined
      ? requestForm.fullName
      : displayName || "";

  const email =
    effectiveRequestForm?.email !== undefined
      ? requestForm.email
      : "";

  const phone =
    effectiveRequestForm?.phone !== undefined
      ? requestForm.phone
      : effectiveRequestForm?.phoneNumber || "";

  const address =
    effectiveRequestForm?.address !== undefined
      ? requestForm.address
      : effectiveRequestForm?.location || "";

  const purpose =
    effectiveRequestForm?.purpose !== undefined
      ? requestForm.purpose
      : "";

  const opinions =
    effectiveRequestForm?.opinions !== undefined
      ? requestForm.opinions
      : "";

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className={`modal-overlay ${
        isPageMode ? "certificate-request-page" : ""
      }`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="certificate-request-title"
    >
      <div
        className="certificate-workflow-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
      >

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="workflow-header">

          <div>
            <p className="eyebrow">
              CERTIFICATE REQUEST
            </p>

            <h2 id="certificate-request-title">
              Request Certificate
            </h2>

            <p>
              Request a certificate for your
              internship.
            </p>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={handleClose}
            aria-label="Close certificate request"
          >
            ×
          </button>

        </div>

        {/* ======================================================
            INTERNSHIP CONTEXT
        ====================================================== */}

        {step !== 4 && (
          <div className="workflow-internship-context">

            <div className="workflow-context-item">
              <span>
                CURRENT INTERNSHIP
              </span>

              <strong>
                {internshipName}
              </strong>
            </div>

            <div className="workflow-context-item">
              <span>
                INTERN ID
              </span>

              <strong>
                {internshipId}
              </strong>
            </div>

            <div className="workflow-context-item">
              <span>
                ORGANIZATION
              </span>

              <strong>
                {organization}
              </strong>
            </div>

          </div>
        )}

        {/* ======================================================
            PROGRESS
        ====================================================== */}

        {step !== 4 && (
          <div className="workflow-steps">

            <div
              className={`workflow-step ${
                step >= 1
                  ? "current"
                  : ""
              }`}
            >
              <span>
                {step > 1 ? "✓" : "1"}
              </span>

              <strong>
                Certificate
              </strong>
            </div>

            <div
              className={`workflow-step-line ${
                step > 1
                  ? "done"
                  : ""
              }`}
            />

            <div
              className={`workflow-step ${
                step >= 2
                  ? "current"
                  : ""
              }`}
            >
              <span>
                {step > 2 ? "✓" : "2"}
              </span>

              <strong>
                Details
              </strong>
            </div>

            <div
              className={`workflow-step-line ${
                step > 2
                  ? "done"
                  : ""
              }`}
            />

            <div
              className={`workflow-step ${
                step >= 3
                  ? "current"
                  : ""
              }`}
            >
              <span>
                {step > 3 ? "✓" : "3"}
              </span>

              <strong>
                Review
              </strong>
            </div>

            <div
              className={`workflow-step-line ${
                step > 3
                  ? "done"
                  : ""
              }`}
            />

            <div
              className={`workflow-step ${
                step === 4
                  ? "current"
                  : ""
              }`}
            >
              <span>4</span>

              <strong>
                Submitted
              </strong>
            </div>

          </div>
        )}

        {/* ======================================================
            BODY
        ====================================================== */}

        <div className="workflow-body">

          {/* ====================================================
              STEP 1
          ==================================================== */}

          {step === 1 && (
            <section className="workflow-stage">

              <div className="workflow-stage-heading">

                <div>
                  <span className="workflow-stage-number">
                    STEP 1
                  </span>

                  <h3>
                    Select Certificate
                  </h3>

                  <p>
                    Select the certificate you
                    want to request for this
                    internship.
                  </p>
                </div>

              </div>

              <div className="workflow-form-grid">

                <label className="workflow-field workflow-field-wide">

                  <span>
                    Certificate Type
                  </span>

                  <select
                    value={
                      selectedCertificate
                    }
                    onChange={(event) => {
                      setSelectedCertificateValue(
                        event.target.value
                      );

                      if (
                        errors.certificate
                      ) {
                        setErrors(
                          (previous) => ({
                            ...previous,
                            certificate:
                              "",
                          })
                        );
                      }
                    }}
                  >

                    <option value="">
                      Select a certificate
                    </option>

                    {CERTIFICATE_TYPES.map(
                      (certificate) => (
                        <option
                          key={
                            certificate
                          }
                          value={
                            certificate
                          }
                        >
                          {certificate}
                        </option>
                      )
                    )}

                  </select>

                  {errors.certificate && (
                    <small className="workflow-field-error">
                      {errors.certificate}
                    </small>
                  )}

                </label>

              </div>

            </section>
          )}

          {/* ====================================================
              STEP 2
          ==================================================== */}

          {step === 2 && (
            <section className="workflow-stage">

              <div className="workflow-stage-heading">

                <div>

                  <span className="workflow-stage-number">
                    STEP 2
                  </span>

                  <h3>
                    Certificate Details
                  </h3>

                  <p>
                    Your profile information is loaded automatically.
                    HR-managed internship information cannot be changed
                    here. If no internship is selected yet, you can still
                    continue and the internship details will be filled in
                    when HR data becomes available.
                  </p>

                </div>

              </div>

              {!selectedInternship && (
                <div className="workflow-empty-state" role="status">
                  <strong>No internship selected</strong>
                  <span>
                    Your internship details will appear here automatically
                    when HR provides them through the backend.
                  </span>
                </div>
              )}

              <div className="workflow-form-grid">

                {/* ==================================================
                    FULL NAME — EDITABLE
                ================================================== */}

                <label className="workflow-field">

                  <span>
                    Full Name
                  </span>

                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) =>
                      updateField(
                        "fullName",
                        event.target.value
                      )
                    }
                    placeholder="Enter your full name"
                  />

                  {errors.fullName && (
                    <small className="workflow-field-error">
                      {errors.fullName}
                    </small>
                  )}

                </label>

                {/* ==================================================
                    EMAIL — EDITABLE
                ================================================== */}

                <label className="workflow-field">

                  <span>
                    Email
                  </span>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      updateField(
                        "email",
                        event.target.value
                      )
                    }
                    placeholder="Enter your email"
                  />

                  {errors.email && (
                    <small className="workflow-field-error">
                      {errors.email}
                    </small>
                  )}

                </label>

                {/* ==================================================
                    PHONE — EDITABLE
                ================================================== */}

                <label className="workflow-field">

                  <span>
                    Phone Number
                  </span>

                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) =>
                      updateField(
                        "phone",
                        event.target.value
                      )
                    }
                    placeholder="Enter your phone number"
                  />

                  {errors.phone && (
                    <small className="workflow-field-error">
                      {errors.phone}
                    </small>
                  )}

                </label>

                {/* ==================================================
                    ADDRESS — EDITABLE
                ================================================== */}

                <label className="workflow-field">

                  <span>
                    Address
                  </span>

                  <input
                    type="text"
                    value={address}
                    onChange={(event) =>
                      updateField(
                        "address",
                        event.target.value
                      )
                    }
                    placeholder="Enter your address"
                  />

                  {errors.address && (
                    <small className="workflow-field-error">
                      {errors.address}
                    </small>
                  )}

                </label>

                {/* ==================================================
                    INTERN ID — HR CONTROLLED
                ================================================== */}

                <label className="workflow-field">

                  <span>
                    Intern ID
                  </span>

                  <input
                    type="text"
                    value={internshipId}
                    readOnly
                    disabled
                  />

                  <small className="workflow-field-helper">
                    Retrieved from the selected internship.
                  </small>

                  {errors.internId && (
                    <small className="workflow-field-error">
                      {errors.internId}
                    </small>
                  )}

                </label>

                {/* ==================================================
                    DOMAIN — HR CONTROLLED
                ================================================== */}

                <label className="workflow-field">

                  <span>
                    Internship / Domain
                  </span>

                  <input
                    type="text"
                    value={internshipName}
                    readOnly
                    disabled
                  />

                  <small className="workflow-field-helper">
                    Managed by HR.
                  </small>

                  {errors.domain && (
                    <small className="workflow-field-error">
                      {errors.domain}
                    </small>
                  )}

                </label>

                {/* ==================================================
                    ORGANIZATION — HR CONTROLLED
                ================================================== */}

                <label className="workflow-field">

                  <span>
                    Organization
                  </span>

                  <input
                    type="text"
                    value={organization}
                    readOnly
                    disabled
                  />

                  <small className="workflow-field-helper">
                    Managed by HR.
                  </small>

                  {errors.organization && (
                    <small className="workflow-field-error">
                      {errors.organization}
                    </small>
                  )}

                </label>

                {/* ==================================================
                    ROLE — HR CONTROLLED
                ================================================== */}

                <label className="workflow-field">

                  <span>
                    Role
                  </span>

                  <input
                    type="text"
                    value={role}
                    readOnly
                    disabled
                  />

                  <small className="workflow-field-helper">
                    Managed by HR.
                  </small>

                </label>

                {/* ==================================================
                    START DATE — HR CONTROLLED
                ================================================== */}

                <label className="workflow-field">

                  <span>
                    Start Date
                  </span>

                  <input
                    type="text"
                    value={startDate}
                    readOnly
                    disabled
                  />

                  <small className="workflow-field-helper">
                    Managed by HR.
                  </small>

                  {errors.startDate && (
                    <small className="workflow-field-error">
                      {errors.startDate}
                    </small>
                  )}

                </label>

                {/* ==================================================
                    END DATE — HR CONTROLLED
                ================================================== */}

                <label className="workflow-field">

                  <span>
                    End Date
                  </span>

                  <input
                    type="text"
                    value={endDate}
                    readOnly
                    disabled
                  />

                  <small className="workflow-field-helper">
                    Managed by HR.
                  </small>

                  {errors.endDate && (
                    <small className="workflow-field-error">
                      {errors.endDate}
                    </small>
                  )}

                </label>

                {/* ==================================================
                    PURPOSE — EDITABLE
                ================================================== */}

                <label className="workflow-field workflow-field-wide">

                  <span>
                    Purpose / Description
                  </span>

                  <textarea
                    rows="4"
                    value={purpose}
                    onChange={(event) =>
                      updateField(
                        "purpose",
                        event.target.value
                      )
                    }
                    placeholder="Enter the purpose of your certificate request..."
                  />

                  {errors.purpose && (
                    <small className="workflow-field-error">
                      {errors.purpose}
                    </small>
                  )}

                </label>

                {/* ==================================================
                    OPINIONS / ADDITIONAL INFORMATION — OPTIONAL
                ================================================== */}

                <label className="workflow-field workflow-field-wide">

                  <span>
                    Additional Information
                    <em>
                      {" "}
                      (Optional)
                    </em>
                  </span>

                  <textarea
                    rows="3"
                    value={opinions}
                    onChange={(event) =>
                      updateField(
                        "opinions",
                        event.target.value
                      )
                    }
                    placeholder="Add any additional information if needed..."
                  />

                </label>

              </div>

            </section>
          )}

          {/* ====================================================
              STEP 3 — REVIEW
          ==================================================== */}

          {step === 3 && (
            <section className="workflow-stage">

              <div className="workflow-stage-heading">

                <div>

                  <span className="workflow-stage-number">
                    STEP 3
                  </span>

                  <h3>
                    Review Request
                  </h3>

                  <p>
                    Please review your information
                    before submitting the request.
                  </p>

                </div>

              </div>

              <div className="workflow-review-section">

                <h4>
                  Certificate
                </h4>

                <div className="workflow-review-grid">

                  <div>
                    <span>
                      Certificate Type
                    </span>

                    <strong>
                      {selectedCertificate ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Full Name
                    </span>

                    <strong>
                      {fullName || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Email
                    </span>

                    <strong>
                      {email || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Phone
                    </span>

                    <strong>
                      {phone || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Intern ID
                    </span>

                    <strong>
                      {internshipId}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Internship
                    </span>

                    <strong>
                      {internshipName}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Organization
                    </span>

                    <strong>
                      {organization}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Role
                    </span>

                    <strong>
                      {role}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Internship Period
                    </span>

                    <strong>
                      {startDate} —{" "}
                      {endDate}
                    </strong>
                  </div>

                  <div className="workflow-review-wide">

                    <span>
                      Address
                    </span>

                    <strong>
                      {address || "—"}
                    </strong>

                  </div>

                  <div className="workflow-review-wide">

                    <span>
                      Purpose
                    </span>

                    <strong>
                      {purpose || "—"}
                    </strong>

                  </div>

                  {opinions && (
                    <div className="workflow-review-wide">

                      <span>
                        Additional Information
                      </span>

                      <strong>
                        {opinions}
                      </strong>

                    </div>
                  )}

                </div>

              </div>

              <div className="workflow-review-notice">

                <span>
                  {selectedInternship
                    ? "Your request will be sent to HR for review. The status will be updated automatically after HR processes the request."
                    : "No internship is selected yet. HR/backend data will be attached when an internship becomes available."}
                </span>

              </div>

            </section>
          )}

          {/* ====================================================
              STEP 4 — SUBMITTED
          ==================================================== */}

          {step === 4 && (
            <section className="workflow-submitted">

              <div className="workflow-submitted-icon">
                ✓
              </div>

              <p className="eyebrow">
                REQUEST SUBMITTED
              </p>

              <h3>
                Certificate Request Submitted
              </h3>

              <p>
                Your request for{" "}
                <strong>
                  {effectiveSelectedCertificate}
                </strong>{" "}
                has been submitted successfully.
              </p>

              <div className="workflow-submitted-details">

                <div>

                  <span>
                    CERTIFICATE
                  </span>

                  <strong>
                    {selectedCertificate ||
                      "—"}
                  </strong>

                </div>

                <div>

                  <span>
                    INTERNSHIP
                  </span>

                  <strong>
                    {internshipName}
                  </strong>

                </div>

                <div>

                  <span>
                    STATUS
                  </span>

                  <strong className="pending">
                    Pending
                  </strong>

                </div>

              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={handleClose}
              >
                Done
              </button>

            </section>
          )}

        </div>

        {submitError && (
          <div
            className="certificate-request-submit-error"
            role="alert"
          >
            {submitError}
          </div>
        )}

        {/* ======================================================
            FOOTER
        ====================================================== */}

        {step !== 4 && (
          <div className="workflow-footer">

            <button
              type="button"
              className="btn-secondary"
              onClick={handleClose}
              disabled={submitLoading}
            >
              Cancel
            </button>

            <div className="workflow-footer-right">

              {/* STEP 2 BACK */}

              {step === 2 && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setErrors({});
                    setRequestStepValue(1);
                  }}
                >
                  ← Back
                </button>
              )}

              {/* STEP 3 BACK */}

              {step === 3 && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setErrors({});
                    setRequestStepValue(2);
                  }}
                >
                  ← Back
                </button>
              )}

              {/* STEP 1 */}

              {step === 1 && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleNext}
                >
                  Continue →
                </button>
              )}

              {/* STEP 2 */}

              {step === 2 && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleDetailsNext}
                >
                  Review Request →
                </button>
              )}

              {/* STEP 3 */}

              {step === 3 && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSubmit}
                  disabled={submitLoading}
                >
                  {submitLoading
                    ? "Sending Request..."
                    : "Submit Request"}
                </button>
              )}

            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default CertificateRequest;