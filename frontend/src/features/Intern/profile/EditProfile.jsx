import Icon from "../../shared/Icons/Icon.jsx";

const EditProfile = ({
  profileForm,
  avatarInitial,
  isPhotoLoading,
  profilePhotoInputRef,
  openProfilePhotoPicker,
  handleProfilePhotoChange,
  removeProfilePhoto,
  handleProfileFieldChange,
  cancelEditingProfile,
  saveProfile,
}) => {
  const handleChange = (field) => (event) => {
    handleProfileFieldChange(field, event.target.value);
  };

  return (
    <form
      className="profile-edit-form"
      onSubmit={saveProfile}
    >
      {/* =====================================================
          PROFILE PHOTO
          INTERN CAN EDIT
      ===================================================== */}
      <div className="profile-photo-edit-field profile-edit-field-wide">
        <div className="profile-photo-edit-preview">
          {profileForm?.photo ? (
            <img
              src={profileForm.photo}
              alt="Selected profile"
            />
          ) : (
            <span className="profile-photo-edit-initial">
              {avatarInitial}
            </span>
          )}
        </div>

        <div className="profile-photo-edit-copy">
          <span className="profile-edit-label">
            <Icon name="user" size={14} />
            Profile Photo
          </span>

          <p>
            Upload a JPG, PNG, WEBP, or GIF image up to 5 MB.
          </p>

          <div className="profile-photo-actions">
            <button
              type="button"
              className="btn-secondary profile-photo-select-btn"
              onClick={openProfilePhotoPicker}
              disabled={isPhotoLoading}
            >
              <Icon name="edit" size={14} />

              {isPhotoLoading
                ? "Loading Photo..."
                : profileForm?.photo
                  ? "Change Photo"
                  : "Choose Photo"}
            </button>

            {profileForm?.photo && (
              <button
                type="button"
                className="btn-danger-outline profile-photo-delete-btn"
                onClick={removeProfilePhoto}
                disabled={isPhotoLoading}
              >
                <Icon name="trash" size={14} />
                Delete Photo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          HIDDEN PHOTO INPUT
      ===================================================== */}
      <input
        ref={profilePhotoInputRef}
        className="profile-photo-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleProfilePhotoChange}
      />

      {/* =====================================================
          PROFILE INFORMATION
      ===================================================== */}
      <div className="profile-edit-grid">

        {/* ===================================================
            FULL NAME
            INTERN CAN EDIT
        =================================================== */}
        <label className="profile-edit-field">
          <span>
            <Icon name="user" size={14} />
            Full Name
          </span>

          <input
            type="text"
            value={profileForm?.fullName || ""}
            placeholder="Your full name"
            onChange={handleChange("fullName")}
            autoComplete="name"
          />
        </label>

        {/* ===================================================
            INTERN CODE
            HR CONTROLLED — READ ONLY
        =================================================== */}
        <div className="profile-edit-field profile-readonly-field">
          <span>
            <Icon name="certificate" size={14} />
            Intern Code

            <small className="profile-field-lock">
              <Icon name="lock" size={11} />
              HR Managed
            </small>
          </span>

          <input
            type="text"
            value={profileForm?.internCode || ""}
            readOnly
            aria-readonly="true"
          />
        </div>

        {/* ===================================================
            EMAIL
            INTERN CAN EDIT
        =================================================== */}
        <label className="profile-edit-field">
          <span>
            <Icon name="mail" size={14} />
            Email
          </span>

          <input
            type="email"
            value={profileForm?.email || ""}
            placeholder="you@example.com"
            onChange={handleChange("email")}
            autoComplete="email"
          />
        </label>

        {/* ===================================================
            START DATE
            HR CONTROLLED — READ ONLY
        =================================================== */}
        <div className="profile-edit-field profile-readonly-field">
          <span>
            <Icon name="activity" size={14} />
            Start Date

            <small className="profile-field-lock">
              <Icon name="lock" size={11} />
              HR Managed
            </small>
          </span>

          <input
            type="date"
            value={profileForm?.startDate || ""}
            readOnly
            aria-readonly="true"
          />
        </div>

        {/* ===================================================
            PHONE
            INTERN CAN EDIT
        =================================================== */}
        <label className="profile-edit-field">
          <span>
            <Icon name="phone" size={14} />
            Phone
          </span>

          <input
            type="tel"
            value={profileForm?.phone || ""}
            placeholder="Phone number"
            onChange={handleChange("phone")}
            autoComplete="tel"
          />
        </label>

        {/* ===================================================
            END DATE
            HR CONTROLLED — READ ONLY
        =================================================== */}
        <div className="profile-edit-field profile-readonly-field">
          <span>
            <Icon name="activity" size={14} />
            End Date

            <small className="profile-field-lock">
              <Icon name="lock" size={11} />
              HR Managed
            </small>
          </span>

          <input
            type="date"
            value={profileForm?.endDate || ""}
            readOnly
            aria-readonly="true"
          />
        </div>

        {/* ===================================================
            COLLEGE / INSTITUTION
            INTERN CAN EDIT
        =================================================== */}
        <label className="profile-edit-field">
          <span>
            <Icon name="college" size={14} />
            College / Institution
          </span>

          <input
            type="text"
            value={profileForm?.college || ""}
            placeholder="Your college / institution"
            onChange={handleChange("college")}
          />
        </label>

        {/* ===================================================
            DOMAIN
            HR CONTROLLED — READ ONLY
        =================================================== */}
        <div className="profile-edit-field profile-readonly-field">
          <span>
            <Icon name="domain" size={14} />
            Domain

            <small className="profile-field-lock">
              <Icon name="lock" size={11} />
              HR Managed
            </small>
          </span>

          <input
            type="text"
            value={profileForm?.domain || ""}
            readOnly
            aria-readonly="true"
          />
        </div>

        {/* ===================================================
            ORGANIZATION
            HR CONTROLLED — READ ONLY
        =================================================== */}
        <div className="profile-edit-field profile-readonly-field">
          <span>
            <Icon name="briefcase" size={14} />
            Organization

            <small className="profile-field-lock">
              <Icon name="lock" size={11} />
              HR Managed
            </small>
          </span>

          <input
            type="text"
            value={
              profileForm?.organization ||
              profileForm?.company ||
              ""
            }
            readOnly
            aria-readonly="true"
          />
        </div>

        {/* ===================================================
            ROLE / POSITION
            HR CONTROLLED — READ ONLY
        =================================================== */}
        <div className="profile-edit-field profile-readonly-field">
          <span>
            <Icon name="user" size={14} />
            Role / Position

            <small className="profile-field-lock">
              <Icon name="lock" size={11} />
              HR Managed
            </small>
          </span>

          <input
            type="text"
            value={profileForm?.role || ""}
            readOnly
            aria-readonly="true"
          />
        </div>

        {/* ===================================================
            ADDRESS
            INTERN CAN EDIT
        =================================================== */}
        <label className="profile-edit-field profile-edit-field-wide">
          <span>
            <Icon name="map-pin" size={14} />
            Address
          </span>

          <input
            type="text"
            value={profileForm?.address || ""}
            placeholder="Your address"
            onChange={handleChange("address")}
            autoComplete="street-address"
          />
        </label>

        {/* ===================================================
            ABOUT
            INTERN CAN EDIT
        =================================================== */}
        <label className="profile-edit-field profile-edit-field-wide">
          <span>
            <Icon name="info" size={14} />
            About
          </span>

          <textarea
            rows="4"
            value={profileForm?.bio || ""}
            placeholder="A short note about yourself"
            onChange={handleChange("bio")}
          />
        </label>
      </div>

      {/* =====================================================
          FORM ACTIONS
      ===================================================== */}
      <div className="profile-form-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={cancelEditingProfile}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="btn-primary"
          disabled={isPhotoLoading}
        >
          <Icon name="check" size={14} />
          Save Changes
        </button>
      </div>
    </form>
  );
};

export default EditProfile;
