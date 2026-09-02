import Icon from "../../shared/Icons/Icon.jsx";
import EditProfile from "./EditProfile";

const Profile = ({
  profileData,
  profileForm,
  isEditingProfile,
  isPhotoLoading,
  profilePhotoInputRef,
  avatarInitial,
  displayName,
  startEditingProfile,
  cancelEditingProfile,
  saveProfile,
  openProfilePhotoPicker,
  handleProfilePhotoChange,
  removeProfilePhoto,
  handleProfileFieldChange,
  onNavigate,
}) => {
  const profilePhoto = profileData?.photo || "";

  /*
   * IMPORTANT:
   * profileData is expected to contain the currently selected
   * internship. Therefore these values automatically change when
   * the user switches between internships.
   *
   * HR-controlled fields:
   *   internCode, domain, startDate, endDate
   *
   * Intern-editable fields:
   *   fullName, email, phone, college, address, bio, photo
   */

  const certificates = Array.isArray(profileData?.certificates)
    ? profileData.certificates
    : [];

  const requests = Array.isArray(profileData?.requests)
    ? profileData.requests
    : [];

  const approvedCertificates = certificates.filter(
    (item) =>
      String(item?.status || "").toLowerCase() === "approved"
  );

  const pendingRequests = requests.filter(
    (item) =>
      String(item?.status || "").toLowerCase() === "pending"
  );

  const rejectedRequests = requests.filter(
    (item) =>
      String(item?.status || "").toLowerCase() === "rejected"
  );

  const totalCertificates =
    certificates.length + pendingRequests.length + rejectedRequests.length;

  /*
   * Show the most recent certificate/request records.
   * No dummy certificate data is used here.
   */
  const recentItems = [
    ...certificates.map((item) => ({
      ...item,
      recordType: "certificate",
      recordDate: item?.issuedOn || item?.date || "",
    })),
    ...requests
      .filter((item) => {
        const requestId = item?.id || item?.requestId;
        return !certificates.some(
          (certificate) =>
            certificate?.requestId === requestId
        );
      })
      .map((item) => ({
        ...item,
        recordType: "request",
        recordDate: item?.requestedOn || item?.date || "",
      })),
  ].slice(0, 3);

  const getStatusClass = (status) => {
    const normalized = String(status || "Pending").toLowerCase();

    if (normalized === "approved") return "status-approved";
    if (normalized === "rejected") return "status-rejected";
    return "status-pending";
  };

  return (
    <>
      {/* =========================================
          PROFILE PAGE HEADER
      ========================================= */}
      <section className="page-heading profile-page-heading">
        <div>
          <p className="eyebrow">INTERN ACCOUNT</p>

          <h1>My Profile</h1>

          <p>
            Your personal details and the information
            for the selected internship.
          </p>
        </div>

        {!isEditingProfile && (
          <button
            type="button"
            className="btn-primary profile-edit-trigger"
            onClick={startEditingProfile}
          >
            <Icon name="edit" size={15} />
            Edit Profile
          </button>
        )}
      </section>

      {/* =========================================
          SELECTED INTERNSHIP INFORMATION
      ========================================= */}
      <section className="data-section profile-hero-card">
        <div className="profile-hero-banner" />

        <div className="profile-hero-content">
          {/* PROFILE PHOTO */}
          <div className="profile-avatar-wrap">
            <div className="profile-avatar-xl">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt="Intern profile"
                />
              ) : (
                avatarInitial
              )}
            </div>

            <button
              type="button"
              className="profile-camera-btn"
              aria-label="Change profile photo"
              title="Change profile photo"
              onClick={openProfilePhotoPicker}
            >
              <Icon name="edit" size={13} />
            </button>
          </div>

          {/* PROFILE BASIC INFORMATION */}
          <div className="profile-hero-details">
            <div className="profile-name-row">
              <h2>{displayName || profileData?.fullName || "—"}</h2>

              <span className="profile-role-badge">
                Intern
              </span>
            </div>

            <div className="profile-quick-info">
              <span>
                <Icon name="certificate" size={15} />
                {profileData?.internCode || "Intern code not set"}
              </span>

              <span>
                <Icon name="domain" size={15} />
                {profileData?.domain || "Domain not set"}
              </span>

              <span className="profile-status">
                <i />
                {profileData?.status || "Active"}
              </span>
            </div>

            <div className="profile-contact-row">
              <span>
                <Icon name="mail" size={15} />
                {profileData?.email || "—"}
              </span>

              <span>
                <Icon name="phone" size={15} />
                {profileData?.phone || "—"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          PERSONAL & INTERNSHIP INFORMATION
      ========================================= */}
      <section className="data-section profile-information-card">
        <div className="section-header profile-section-header">
          <div>
            <p className="eyebrow">PROFILE DETAILS</p>

            <h3>Personal &amp; Internship Information</h3>
            <p className="profile-section-description">
              Personal details can be updated from your profile.
              Internship information is managed by HR.
            </p>
          </div>
        </div>

        {isEditingProfile ? (
          <EditProfile
            profileForm={profileForm}
            avatarInitial={avatarInitial}
            isPhotoLoading={isPhotoLoading}
            profilePhotoInputRef={profilePhotoInputRef}
            openProfilePhotoPicker={openProfilePhotoPicker}
            handleProfilePhotoChange={handleProfilePhotoChange}
            removeProfilePhoto={removeProfilePhoto}
            handleProfileFieldChange={handleProfileFieldChange}
            cancelEditingProfile={cancelEditingProfile}
            saveProfile={saveProfile}
          />
        ) : (
          <div className="profile-info-grid">
            {/* INTERN-EDITABLE / PERSONAL INFORMATION */}
            <div className="profile-info-column">
              {[
                ["user", "Full Name", profileData?.fullName || ""],
                ["mail", "Email", profileData?.email || ""],
                ["phone", "Phone", profileData?.phone || ""],
                [
                  "college",
                  "College / Institution",
                  profileData?.college,
                ],
                ["map-pin", "Address", profileData?.address],
                ["info", "About", profileData?.bio],
              ].map(([icon, label, value]) => (
                <div
                  className="profile-info-item"
                  key={label}
                >
                  <span className="profile-info-label">
                    <Icon name={icon} size={15} />
                    {label}
                  </span>

                  <strong>{value || "—"}</strong>
                </div>
              ))}
            </div>

            {/* HR-CONTROLLED INTERNSHIP INFORMATION */}
            <div className="profile-info-column">
              {[
                [
                  "certificate",
                  "Intern Code",
                  profileData?.internCode,
                ],
                ["domain", "Domain", profileData?.domain],
                [
                  "activity",
                  "Start Date",
                  profileData?.startDate,
                ],
                [
                  "activity",
                  "End Date",
                  profileData?.endDate,
                ],
                [
                  "briefcase",
                  "Organization",
                  profileData?.organization ||
                    profileData?.company,
                ],
                [
                  "user",
                  "Role / Position",
                  profileData?.role,
                ],
              ].map(([icon, label, value]) => (
                <div
                  className="profile-info-item"
                  key={label}
                >
                  <span className="profile-info-label">
                    <Icon name={icon} size={15} />
                    {label}
                  </span>

                  <strong>{value || "—"}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* =========================================
          CERTIFICATE OVERVIEW
          Counts come from selected internship data.
      ========================================= */}
      <section className="data-section profile-certificate-card">
        <div className="section-header profile-section-header">
          <div>
            <p className="eyebrow">CERTIFICATES</p>

            <h3>Certificate Overview</h3>
          </div>

          <button
            type="button"
            className="section-link"
            onClick={() => onNavigate("certificates")}
          >
            View All
            <Icon name="chevron-right" size={14} />
          </button>
        </div>

        <div className="profile-certificate-summary">
          {[
            [
              "total",
              "certificate",
              totalCertificates,
              "Total Records",
            ],
            [
              "approved",
              "check",
              approvedCertificates.length,
              "Approved",
            ],
            [
              "pending",
              "activity",
              pendingRequests.length,
              "Pending",
            ],
            [
              "rejected",
              "info",
              rejectedRequests.length,
              "Rejected",
            ],
          ].map(([type, icon, count, label]) => (
            <div
              className={`profile-certificate-stat ${type}`}
              key={type}
            >
              <span className="certificate-stat-icon">
                <Icon name={icon} size={19} />
              </span>

              <div>
                <strong>
                  {String(count).padStart(2, "0")}
                </strong>

                <span>{label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================
          RECENT CERTIFICATES / REQUESTS
          No dummy records.
      ========================================= */}
      <section className="data-section profile-recent-certificates">
        <div className="section-header profile-section-header">
          <div>
            <p className="eyebrow">DOCUMENT CENTRE</p>

            <h3>Recent Certificates &amp; Requests</h3>
          </div>

          <button
            type="button"
            className="section-link"
            onClick={() => onNavigate("certificates")}
          >
            View All
            <Icon name="chevron-right" size={14} />
          </button>
        </div>

        <div className="certificate-list">
          {recentItems.length > 0 ? (
            recentItems.map((item, index) => {
              const status = item?.status || "Pending";
              const itemId =
                item?.certificateId ||
                item?.id ||
                item?.requestId ||
                "—";

              const isCertificate =
                item.recordType === "certificate";

              return (
                <article
                  className="profile-certificate-row"
                  key={`${itemId}-${index}`}
                >
                  <div
                    className={`certificate-preview ${
                      isCertificate
                        ? "certificate-preview-purple"
                        : "certificate-preview-orange"
                    }`}
                  >
                    <Icon
                      name="certificate"
                      size={23}
                    />
                  </div>

                  <div className="certificate-row-content">
                    <h4>
                      {item?.name ||
                        item?.type ||
                        "Certificate Request"}
                    </h4>

                    <p>
                      {isCertificate
                        ? `Issued on: ${
                            item?.issuedOn ||
                            item?.date ||
                            "—"
                          }`
                        : `Requested on: ${
                            item?.requestedOn ||
                            item?.date ||
                            "—"
                          }`}
                    </p>

                    <small>
                      {isCertificate
                        ? `Certificate ID: ${itemId}`
                        : `Request ID: ${itemId}`}
                    </small>
                  </div>

                  <span
                    className={`certificate-status ${getStatusClass(
                      status
                    )}`}
                  >
                    {status}
                  </span>

                  <div className="certificate-row-actions">
                    <button
                      type="button"
                      className="certificate-action"
                      onClick={() =>
                        onNavigate("certificates")
                      }
                    >
                      <Icon name="info" size={14} />
                      View
                    </button>

                    {String(status).toLowerCase() ===
                      "approved" && (
                      <button
                        type="button"
                        className="certificate-action"
                        onClick={() =>
                          onNavigate("certificates")
                        }
                      >
                        <Icon
                          name="certificate"
                          size={14}
                        />
                        Download
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="certificate-empty-filter">
              <Icon name="certificate" size={25} />

              <strong>
                No certificates or requests yet
              </strong>

              <span>
                Certificates and requests for the selected
                internship will appear here automatically.
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="view-all-certificates-btn"
          onClick={() => onNavigate("certificates")}
        >
          View All Certificates
          <Icon name="chevron-right" size={15} />
        </button>
      </section>
    </>
  );
};

export default Profile;
