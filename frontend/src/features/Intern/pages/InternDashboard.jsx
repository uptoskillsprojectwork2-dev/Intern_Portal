// src/features/Intern/pages/InternDashboard.jsx

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import InternSidebar from "../layout/InternSidebar";
import InternNavbar from "../layout/InternNavbar";

import Profile from "../profile/Profile";
import Certificates from "../certificates/Certificates";
import Notifications from "../notifications/Notifications";
import CertificateRequest from "../certificate-request/CertificateRequest";

import Icon from "../../shared/Icons/Icon.jsx";

import {
  emptyProfile,
  certificateTemplates,
} from "../data";

// ============================================================
// CONSTANTS
// ============================================================

const EMPTY_ARRAY = [];

const PROFILE_STORAGE_KEY = "olms-intern-profile";
const SELECTED_INTERNSHIP_STORAGE_KEY =
  "olms-selected-internship";

// ============================================================
// COMMON CERTIFICATES
// ============================================================

const COMMON_CERTIFICATES = [
  "Internship Completion Certificate",
  "Bonafide Certificate",
];

// ============================================================
// HELPERS
// ============================================================

const getInternshipId = (internship) =>
  String(
    internship?.id ||
      internship?.internshipId ||
      ""
  );

const getInternshipList = (profile) => {
  if (Array.isArray(profile?.internships)) {
    return profile.internships;
  }

  if (Array.isArray(emptyProfile?.internships)) {
    return emptyProfile.internships;
  }

  return [];
};

// ============================================================
// INTERN DASHBOARD
// ============================================================

const InternDashboard = () => {
  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const navigate = useNavigate();
  const location = useLocation();

  const getSectionFromPath = (pathname) => {
    switch (pathname) {
      case "/intern/profile":
        return "profile";

      case "/intern/certificates":
        return "certificates";

      case "/intern/notifications":
        return "notifications";

      case "/intern/dashboard":
      default:
        return "dashboard";
    }
  };

  const activeSection =
    getSectionFromPath(location.pathname);

  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  // ==========================================================
  // THEME
  // ==========================================================

  const [theme, setTheme] =
    useState("dark");

  // ==========================================================
  // PROFILE DATA
  // ==========================================================

  const [profileData, setProfileData] =
    useState(() => {
      try {
        const savedProfile =
          window.localStorage.getItem(
            PROFILE_STORAGE_KEY
          );

        // No saved profile
        if (!savedProfile) {
          return {
            ...emptyProfile,
            internships:
              Array.isArray(emptyProfile?.internships)
                ? emptyProfile.internships
                : [],
          };
        }

        const parsedProfile =
          JSON.parse(savedProfile);

        const storedInternships =
          Array.isArray(parsedProfile?.internships)
            ? parsedProfile.internships
            : [];

        /*
         * IMPORTANT:
         *
         * Older localStorage data may contain:
         *
         * internships: []
         *
         * even though emptyProfile contains internship
         * data.
         *
         * In that situation use the available profile
         * internship data instead of destroying it.
         */
        const internships =
          storedInternships.length > 0
            ? storedInternships
            : Array.isArray(emptyProfile?.internships)
              ? emptyProfile.internships
              : [];

        return {
          ...emptyProfile,
          ...parsedProfile,
          internships,
        };
      } catch (error) {
        console.error(
          "Unable to load intern profile:",
          error
        );

        return {
          ...emptyProfile,
          internships:
            Array.isArray(emptyProfile?.internships)
              ? emptyProfile.internships
              : [],
        };
      }
    });

  const [profileForm, setProfileForm] =
    useState(profileData);

  const [isEditingProfile, setIsEditingProfile] =
    useState(false);

  const [isPhotoLoading, setIsPhotoLoading] =
    useState(false);

  const profilePhotoInputRef =
    useRef(null);

  // ==========================================================
  // INTERNSHIPS
  // ==========================================================

  const realInternships = getInternshipList(
    profileData
  );
  const internships = realInternships;

  // ==========================================================
  // SELECTED INTERNSHIP ID
  // ==========================================================

  const [
    selectedInternshipId,
    setSelectedInternshipId,
  ] = useState(() => {
    try {
      const savedId =
        window.localStorage.getItem(
          SELECTED_INTERNSHIP_STORAGE_KEY
        );

      if (savedId) {
        return String(savedId);
      }

      const firstInternship =
        getInternshipList(profileData)[0];

      return getInternshipId(
        firstInternship
      );
    } catch {
      const firstInternship =
        getInternshipList(profileData)[0];

      return getInternshipId(
        firstInternship
      );
    }
  });

  // ==========================================================
  // SELECTED INTERNSHIP
  // ==========================================================

  const selectedInternship =
    internships.find(
      (internship) =>
        getInternshipId(internship) ===
        String(selectedInternshipId)
    ) ||
    internships[0] ||
    null;

  // ==========================================================
  // ACTIVE INTERNSHIP ID
  // ==========================================================

  const activeInternshipId =
    getInternshipId(
      selectedInternship
    );

  // ==========================================================
  // CHANGE INTERNSHIP
  // ==========================================================

  const handleInternshipChange = (
    internshipId
  ) => {
    if (!internshipId) {
      return;
    }

    const newId = String(
      internshipId
    );

    const exists =
      internships.some(
        (internship) =>
          getInternshipId(
            internship
          ) === newId
      );

    if (!exists) {
      return;
    }

    setSelectedInternshipId(newId);

    try {
      window.localStorage.setItem(
        SELECTED_INTERNSHIP_STORAGE_KEY,
        newId
      );
    } catch {
      // LocalStorage is optional.
    }

    /*
     * When the intern switches internship,
     * show the dashboard for that internship.
     */
    navigate("/intern/dashboard");
  };

  // ==========================================================
  // THEME EFFECT
  // ==========================================================

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      theme
    );
  }, [theme]);

  // ==========================================================
  // THEME TOGGLE
  // ==========================================================

  const toggleTheme = () => {
    setTheme(
      (previousTheme) =>
        previousTheme === "dark"
          ? "light"
          : "dark"
    );
  };

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const handleNavigation = (
    section
  ) => {
    const routes = {
      dashboard: "/intern/dashboard",
      certificates: "/intern/certificates",
      notifications: "/intern/notifications",
      profile: "/intern/profile",
    };

    const route = routes[section];

    if (route) {
      navigate(route);
    }
  };

  // ==========================================================
  // PROFILE FIELD CHANGE
  // ==========================================================

  const handleProfileFieldChange = (
    field,
    value
  ) => {
    setProfileForm(
      (previous) => ({
        ...previous,
        [field]: value,
      })
    );
  };

  // ==========================================================
  // PROFILE PHOTO CHANGE
  // ==========================================================

  const handleProfilePhotoChange = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      window.alert(
        "Please select a JPG, PNG, WEBP, or GIF image."
      );

      event.target.value = "";

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      window.alert(
        "Profile photo must be 5 MB or smaller."
      );

      event.target.value = "";

      return;
    }

    setIsPhotoLoading(true);

    const reader =
      new FileReader();

    reader.onload = () => {
      const photo =
        typeof reader.result === "string"
          ? reader.result
          : "";

      setProfileForm(
        (previous) => ({
          ...previous,
          photo,
        })
      );

      setIsPhotoLoading(false);
    };

    reader.onerror = () => {
      setIsPhotoLoading(false);

      window.alert(
        "Unable to read the selected profile photo. Please try again."
      );
    };

    reader.readAsDataURL(file);

    event.target.value = "";
  };

  // ==========================================================
  // OPEN PROFILE PHOTO PICKER
  // ==========================================================

  const openProfilePhotoPicker = () => {
    profilePhotoInputRef.current?.click();
  };

  // ==========================================================
  // REMOVE PROFILE PHOTO
  // ==========================================================

  const removeProfilePhoto = () => {
    const updatedProfile = {
      ...profileForm,
      photo: "",
    };

    setProfileForm(updatedProfile);
    setProfileData(
      (previous) => {
        const updated = {
          ...previous,
          photo: "",
        };

        try {
          window.localStorage.setItem(
            PROFILE_STORAGE_KEY,
            JSON.stringify(updated)
          );
        } catch {
          // Keep state in memory.
        }

        return updated;
      }
    );

    if (profilePhotoInputRef.current) {
      profilePhotoInputRef.current.value =
        "";
    }
  };

  // ==========================================================
  // START PROFILE EDITING
  // ==========================================================

  const startEditingProfile = () => {
    setProfileForm({
      ...profileData,
    });

    setIsEditingProfile(true);
  };

  // ==========================================================
  // CANCEL PROFILE EDIT
  // ==========================================================

  const cancelEditingProfile = () => {
    setProfileForm({
      ...profileData,
    });

    setIsEditingProfile(false);
  };

  // ==========================================================
  // SAVE PROFILE
  // ==========================================================

  const saveProfile = (
    event
  ) => {
    event.preventDefault();

    if (isPhotoLoading) {
      window.alert(
        "Please wait for the profile photo to finish loading."
      );

      return;
    }

    /*
     * IMPORTANT:
     *
     * Never remove the internship records when
     * saving the personal profile.
     */
    const updatedProfile = {
      ...profileData,
      ...profileForm,
      internships,
    };

    setProfileData(updatedProfile);
    setProfileForm(updatedProfile);

    try {
      window.localStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify(updatedProfile)
      );
    } catch {
      // Keep profile in memory.
    }

    setIsEditingProfile(false);
  };

  // ==========================================================
  // DISPLAY NAME
  // ==========================================================

  const displayName =
    String(
      profileData?.fullName || ""
    ).trim() || "Intern";

  // ==========================================================
  // AVATAR INITIAL
  // ==========================================================

  const avatarInitial =
    displayName
      .charAt(0)
      .toUpperCase() || "I";

  // ==========================================================
  // PROFILE PHOTO
  // ==========================================================

  const profilePhoto =
    profileData?.photo || "";

  // ==========================================================
  // CURRENT INTERNSHIP DETAILS
  // ==========================================================

  const currentInternshipId =
    selectedInternship?.internshipId ||
    selectedInternship?.id ||
    "Not set";

  const currentDomain =
    selectedInternship?.domain ||
    selectedInternship?.department ||
    "";

  const currentCompany =
    selectedInternship?.company ||
    selectedInternship?.organization ||
    "";

  const currentRole =
    selectedInternship?.role ||
    "Intern";

  const currentStartDate =
    selectedInternship?.startDate ||
    "";

  const currentEndDate =
    selectedInternship?.endDate ||
    "";

  const currentStatus =
    selectedInternship?.status ||
    "Not set";

  // ==========================================================
  // INTERNSHIP REQUESTS
  // ==========================================================

  const internshipRequests =
    Array.isArray(
      selectedInternship?.requests
    )
      ? selectedInternship.requests
      : EMPTY_ARRAY;

  // ==========================================================
  // INTERNSHIP CERTIFICATES
  // ==========================================================

  const internshipCertificates =
    Array.isArray(
      selectedInternship?.certificates
    )
      ? selectedInternship.certificates
      : EMPTY_ARRAY;

  // ==========================================================
  // CERTIFICATE STATISTICS
  // ==========================================================

  const totalCertificates =
    internshipCertificates.length;

  const approvedCertificates =
    internshipCertificates.filter(
      (certificate) =>
        String(
          certificate?.status || ""
        ).toLowerCase() ===
        "approved"
    ).length;

  const pendingRequests =
    internshipRequests.filter(
      (request) =>
        String(
          request?.status || ""
        ).toLowerCase() ===
        "pending"
    ).length;

  const rejectedRequests =
    internshipRequests.filter(
      (request) =>
        String(
          request?.status || ""
        ).toLowerCase() ===
        "rejected"
    ).length;

  const certificateStats = {
    totalCertificates,
    approvedCertificates,
    pendingRequests,
    rejectedRequests,
  };

  // ==========================================================
  // AVAILABLE CERTIFICATE TYPES
  // ==========================================================

  const availableCertificateNames =
    Array.isArray(
      selectedInternship?.certificateTypes
    ) &&
    selectedInternship.certificateTypes
      .length > 0
      ? selectedInternship.certificateTypes
      : COMMON_CERTIFICATES;

  // ==========================================================
  // CERTIFICATE REQUEST MODAL
  // ==========================================================

  const [
    showRequestModal,
    setShowRequestModal,
  ] = useState(false);

  const [
    selectedCertificate,
    setSelectedCertificate,
  ] = useState("");

  const [
    requestStep,
    setRequestStep,
  ] = useState(1);

  const [
    requestSubmitted,
    setRequestSubmitted,
  ] = useState(false);

  const [
    requestForm,
    setRequestForm,
  ] = useState({
    fullName: "",
    internId: "",
    department: "",
    startDate: "",
    endDate: "",
    organization: "",
    role: "",
    purpose: "",
    remarks: "",
  });

  // ==========================================================
  // OPEN REQUEST MODAL
  // ==========================================================

  const openRequestModal = () => {
    setSelectedCertificate("");
    setRequestStep(1);
    setRequestSubmitted(false);

    setRequestForm({
      fullName:
        profileData?.fullName || "",

      internId:
        currentInternshipId === "Not set"
          ? ""
          : currentInternshipId,

      department:
        currentDomain === "Not set"
          ? ""
          : currentDomain,

      startDate:
        currentStartDate,

      endDate:
        currentEndDate,

      organization:
        currentCompany,

      role:
        currentRole,

      purpose: "",
      remarks: "",
    });

    setShowRequestModal(true);
  };

  // ==========================================================
  // CLOSE REQUEST MODAL
  // ==========================================================

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setSelectedCertificate("");
    setRequestStep(1);
    setRequestSubmitted(false);
  };

  // ==========================================================
  // UPDATE REQUEST FIELD
  // ==========================================================

  const updateRequestField = (
    field,
    value
  ) => {
    setRequestForm(
      (previous) => ({
        ...previous,
        [field]: value,
      })
    );
  };

  // ==========================================================
  // SELECTED TEMPLATE
  // ==========================================================

  const selectedTemplate =
    certificateTemplates.find(
      (template) =>
        template.name ===
        selectedCertificate
    );

  // ==========================================================
  // STEP 1 → STEP 2
  // ==========================================================

  const goToDetails = () => {
    if (!selectedCertificate) {
      window.alert(
        "Please select a certificate type."
      );

      return;
    }

    setRequestStep(2);
  };

  // ==========================================================
  // STEP 2 → STEP 3
  // ==========================================================

  const goToReview = () => {
    if (!selectedTemplate) {
      return;
    }

    const fields =
      Array.isArray(
        selectedTemplate.fields
      )
        ? selectedTemplate.fields
        : EMPTY_ARRAY;

    const missingRequiredField =
      fields.some(
        (field) =>
          !String(
            requestForm?.[field] || ""
          ).trim()
      );

    if (missingRequiredField) {
      window.alert(
        "Please fill all required fields before continuing."
      );

      return;
    }

    setRequestStep(3);
  };

  // ==========================================================
  // CREATE REQUEST ID
  // ==========================================================

  const createRequestId = () => {
    const year =
      new Date().getFullYear();

    const randomNumber =
      Math.floor(
        1000 +
          Math.random() * 9000
      );

    return `REQ-${year}-${randomNumber}`;
  };

  // ==========================================================
  // SUBMIT CERTIFICATE REQUEST
  // ==========================================================

  const submitCertificateRequest = () => {
    if (!selectedInternship) {
      window.alert(
        "No internship is selected."
      );

      return;
    }

    if (!selectedCertificate) {
      window.alert(
        "Please select a certificate type."
      );

      return;
    }

    const requestId =
      createRequestId();

    const now =
      new Date();

    const newRequest = {
      id: requestId,
      requestId,

      internshipId:
        activeInternshipId,

      certificateType:
        selectedCertificate,

      name:
        selectedCertificate,

      type:
        selectedCertificate,

      requestedOn:
        now.toISOString(),

      createdAt:
        now.toISOString(),

      status: "Pending",

      certificateId: "",

      ...requestForm,
    };

    // ========================================================
    // UPDATE SELECTED INTERNSHIP
    // ========================================================

    setProfileData(
      (previousProfile) => {
        const previousInternships =
          Array.isArray(
            previousProfile?.internships
          )
            ? previousProfile.internships
            : [];

        const updatedInternships =
          previousInternships.map(
            (internship) => {
              const internshipId =
                getInternshipId(
                  internship
                );

              if (
                internshipId !==
                String(
                  activeInternshipId
                )
              ) {
                return internship;
              }

              const existingRequests =
                Array.isArray(
                  internship?.requests
                )
                  ? internship.requests
                  : [];

              const existingActivities =
                Array.isArray(
                  internship?.activities
                )
                  ? internship.activities
                  : [];

              const newActivity = {
                id:
                  `ACT-${Date.now()}`,

                type: "pending",

                text:
                  `${selectedCertificate} requested`,

                date:
                  now.toISOString(),

                time:
                  now.toLocaleTimeString(
                    "en-IN",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  ),
              };

              return {
                ...internship,

                requests: [
                  newRequest,
                  ...existingRequests,
                ],

                activities: [
                  newActivity,
                  ...existingActivities,
                ],
              };
            }
          );

        const updatedProfile = {
          ...previousProfile,

          internships:
            updatedInternships,
        };

        try {
          window.localStorage.setItem(
            PROFILE_STORAGE_KEY,
            JSON.stringify(
              updatedProfile
            )
          );
        } catch {
          // Keep state in memory.
        }

        return updatedProfile;
      }
    );

    setRequestSubmitted(true);
    setRequestStep(4);
  };

  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  const formatDate = (
    dateValue
  ) => {
    if (!dateValue) {
      return "Not set";
    }

    const date =
      new Date(dateValue);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return dateValue;
    }

    return date.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // ==========================================================
  // STATUS CLASS
  // ==========================================================

  const getStatusClass = (
    status
  ) => {
    const normalized =
      String(
        status || ""
      ).toLowerCase();

    if (
      normalized === "approved"
    ) {
      return "approved";
    }

    if (
      normalized === "rejected"
    ) {
      return "rejected";
    }

    return "pending";
  };

  // ==========================================================
  // DASHBOARD
  // ==========================================================

  const renderDashboard = () => {
    const requests =
      internshipRequests;

    const certificates =
      internshipCertificates;

    const activities =
      Array.isArray(
        selectedInternship?.activities
      )
        ? selectedInternship.activities
        : EMPTY_ARRAY;

    return (
      <>
        {/* ==================================================
            WELCOME
        ================================================== */}

        <section className="reference-welcome-hero">

          <div className="reference-welcome-copy">

            <p className="reference-eyebrow">
              INTERN PORTAL
            </p>

            <h1>
              Welcome back,{" "}
              <span>
                {displayName}!
              </span>
            </h1>

            <p className="reference-welcome-description">
              Here's an overview of your
              selected internship,
              certificate requests
              and achievements.
            </p>

            {/* CURRENT INTERNSHIP */}

            <div className="reference-current-internship">

              <div className="reference-current-internship-icon">
                <Icon
                  name="briefcase"
                  size={19}
                />
              </div>

              <div>

                <span>
                  Current Internship
                </span>

                <strong>
                  {currentDomain}
                </strong>

                {currentCompany && (
                  <small>
                    {currentCompany}
                  </small>
                )}

              </div>

            </div>

            {/* INTERN DETAILS */}

            <div className="reference-welcome-details">

              <div className="reference-welcome-avatar">

                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Intern profile"
                  />
                ) : (
                  avatarInitial
                )}

              </div>

              <div className="reference-welcome-detail">

                <span>
                  Internship ID
                </span>

                <strong>
                  {currentInternshipId}
                </strong>

              </div>

              <div className="reference-welcome-detail">

                <span>
                  Domain
                </span>

                <strong>
                  {currentDomain}
                </strong>

              </div>

              <div className="reference-welcome-status">

                <i />

                <strong>
                  {currentStatus}
                </strong>

              </div>

            </div>

          </div>

          {/* REQUEST BUTTON */}

          <div className="reference-welcome-action">

            <div className="reference-certificate-art">

              <span className="reference-art-line line-one" />

              <span className="reference-art-line line-two" />

              <span className="reference-art-line line-three" />

              <span className="reference-art-medal">
                ★
              </span>

            </div>

            <button
              type="button"
              className="reference-request-btn"
              onClick={() =>
                navigate("/intern/certificate-request")
              }
            >
              <span className="reference-request-plus">
                +
              </span>

              <span>
                Request Certificate
              </span>

              <Icon
                name="chevron-right"
                size={18}
              />
            </button>

          </div>

        </section>

        {/* ==================================================
            STATISTICS
        ================================================== */}

        <section className="reference-stat-grid">

          <article className="reference-stat-card">

            <div className="reference-stat-icon purple">
              <Icon
                name="certificate"
                size={22}
              />
            </div>

            <strong>
              {String(
                certificateStats.totalCertificates
              ).padStart(2, "0")}
            </strong>

            <span>
              Total Certificates
            </span>

            <small>
              This internship
            </small>

          </article>

          <article className="reference-stat-card">

            <div className="reference-stat-icon green">
              <Icon
                name="check"
                size={22}
              />
            </div>

            <strong>
              {String(
                certificateStats.approvedCertificates
              ).padStart(2, "0")}
            </strong>

            <span>
              Approved
            </span>

            <small>
              Certificates
            </small>

          </article>

          <article className="reference-stat-card">

            <div className="reference-stat-icon orange">
              <span className="reference-clock">
                ◷
              </span>
            </div>

            <strong>
              {String(
                certificateStats.pendingRequests
              ).padStart(2, "0")}
            </strong>

            <span>
              Pending
            </span>

            <small>
              Requests
            </small>

          </article>

          <article className="reference-stat-card">

            <div className="reference-stat-icon red">
              <span>
                ×
              </span>
            </div>

            <strong>
              {String(
                certificateStats.rejectedRequests
              ).padStart(2, "0")}
            </strong>

            <span>
              Rejected
            </span>

            <small>
              Requests
            </small>

          </article>

        </section>

        {/* ==================================================
            CERTIFICATE REQUESTS
        ================================================== */}

        <section className="reference-panel">

          <div className="reference-panel-header">

            <h3>
              Certificate Requests
            </h3>

            <button
              type="button"
              className="reference-view-all"
              onClick={() =>
                handleNavigation(
                  "certificates"
                )
              }
            >
              View All

              <Icon
                name="chevron-right"
                size={15}
              />
            </button>

          </div>

          <div className="reference-request-list">

            {requests.length === 0 ? (
              <div className="reference-empty-state">

                <Icon
                  name="certificate"
                  size={28}
                />

                <strong>
                  No certificate requests
                </strong>

                <span>
                  You haven't requested a
                  certificate for this
                  internship yet.
                </span>

              </div>
            ) : (
              requests
                .slice(0, 3)
                .map(
                  (
                    request,
                    index
                  ) => (
                    <div
                      className="reference-request-row"
                      key={
                        request?.id ||
                        request?.requestId ||
                        `${request?.name}-${index}`
                      }
                    >

                      <div
                        className={`reference-request-icon ${
                          getStatusClass(
                            request?.status
                          ) === "approved"
                            ? "green"
                            : getStatusClass(
                                  request?.status
                                ) === "rejected"
                              ? "red"
                              : "purple"
                        }`}
                      >
                        <Icon
                          name="certificate"
                          size={21}
                        />
                      </div>

                      <div className="reference-request-info">

                        <strong>
                          {request?.name ||
                            request?.type ||
                            request?.certificateType ||
                            "Certificate Request"}
                        </strong>

                        <span>
                          Requested on{" "}
                          {formatDate(
                            request?.requestedOn ||
                              request?.createdAt
                          )}
                        </span>

                        <small>
                          ID:{" "}
                          {request?.id ||
                            request?.requestId ||
                            "Not assigned"}
                        </small>

                      </div>

                      <span
                        className={`reference-status ${getStatusClass(
                          request?.status
                        )}`}
                      >

                        {getStatusClass(
                          request?.status
                        ) === "approved" && (
                          <Icon
                            name="check"
                            size={14}
                          />
                        )}

                        {getStatusClass(
                          request?.status
                        ) === "pending" && (
                          <>◷</>
                        )}

                        {getStatusClass(
                          request?.status
                        ) === "rejected" && (
                          <>×</>
                        )}

                        {" "}

                        {request?.status ||
                          "Pending"}

                      </span>

                      <button
                        type="button"
                        className="reference-details-btn"
                        onClick={() =>
                          handleNavigation(
                            "certificates"
                          )
                        }
                      >
                        View Details

                        <Icon
                          name="chevron-right"
                          size={16}
                        />
                      </button>

                    </div>
                  )
                )
            )}

          </div>

        </section>

        {/* ==================================================
            LOWER GRID
        ================================================== */}

        <div className="reference-lower-grid">

          {/* CERTIFICATES */}

          <section className="reference-panel reference-certificates-panel">

            <div className="reference-panel-header">

              <h3>
                My Certificates
              </h3>

              <button
                type="button"
                className="reference-view-all"
                onClick={() =>
                  handleNavigation(
                    "certificates"
                  )
                }
              >
                View All

                <Icon
                  name="chevron-right"
                  size={15}
                />
              </button>

            </div>

            {certificates.length === 0 ? (
              <div className="reference-empty-state">

                <Icon
                  name="certificate"
                  size={28}
                />

                <strong>
                  No certificates yet
                </strong>

                <span>
                  Approved certificates
                  for this internship
                  will appear here.
                </span>

              </div>
            ) : (
              certificates
                .slice(0, 2)
                .map(
                  (
                    certificate,
                    index
                  ) => (
                    <div
                      className="reference-certificate-item"
                      key={
                        certificate?.id ||
                        certificate?.certificateId ||
                        `${certificate?.name}-${index}`
                      }
                    >

                      <div
                        className={`reference-certificate-thumb ${
                          index % 2 === 0
                            ? "purple"
                            : "blue"
                        }`}
                      >
                        <Icon
                          name="certificate"
                          size={31}
                        />
                      </div>

                      <div className="reference-certificate-content">

                        <strong>
                          {certificate?.name ||
                            certificate?.certificateType ||
                            "Certificate"}
                        </strong>

                        <span className="reference-certificate-approved">

                          <Icon
                            name="check"
                            size={12}
                          />

                          {certificate?.status ||
                            "Approved"}

                        </span>

                        <p>
                          Issued on{" "}
                          {formatDate(
                            certificate?.issuedOn ||
                              certificate?.issuedAt
                          )}
                        </p>

                        <small>
                          Certificate ID:{" "}
                          {certificate?.id ||
                            certificate?.certificateId ||
                            "Not assigned"}
                        </small>

                        <div className="reference-certificate-actions">

                          <button
                            type="button"
                            onClick={() =>
                              handleNavigation(
                                "certificates"
                              )
                            }
                          >
                            <Icon
                              name="user"
                              size={15}
                            />

                            View
                          </button>

                          <button
                            type="button"
                            className="primary"
                          >
                            ↓ &nbsp;Download
                          </button>

                        </div>

                      </div>

                    </div>
                  )
                )
            )}

          </section>

          {/* RIGHT SIDE */}

          <div className="reference-side-column">

            {/* QUICK ACTIONS */}

            <section className="reference-panel reference-quick-panel">

              <div className="reference-panel-header">

                <h3>
                  Quick Actions
                </h3>

              </div>

              <button
                type="button"
                className="reference-quick-primary"
                onClick={
                  openRequestModal
                }
                disabled={
                  !selectedInternship
                }
              >
                <span>
                  +
                </span>

                Request Certificate
              </button>

              <button
                type="button"
                className="reference-quick-secondary"
                onClick={() =>
                  handleNavigation(
                    "certificates"
                  )
                }
              >
                <Icon
                  name="certificate"
                  size={18}
                />

                View All Certificates

                <Icon
                  name="chevron-right"
                  size={16}
                />

              </button>

            </section>

            {/* UPCOMING */}

            <section className="reference-panel reference-upcoming-panel">

              <div className="reference-panel-header">

                <h3>
                  Upcoming
                </h3>

                <Icon
                  name="info"
                  size={18}
                />

              </div>

              <div className="reference-empty-upcoming">

                <div>
                  <Icon
                    name="activity"
                    size={25}
                  />
                </div>

                <strong>
                  No upcoming events
                </strong>

                <span>
                  You're all caught up!
                </span>

              </div>

            </section>

          </div>

        </div>

        {/* ==================================================
            RECENT ACTIVITY
        ================================================== */}

        <section className="reference-panel reference-activity-panel">

          <div className="reference-panel-header">

            <h3>
              Recent Activity
            </h3>

            <button
              type="button"
              className="reference-view-all"
            >
              View All

              <Icon
                name="chevron-right"
                size={15}
              />
            </button>

          </div>

          <div className="reference-activity-list">

            {activities.length === 0 ? (
              <div className="reference-empty-state">

                <Icon
                  name="activity"
                  size={28}
                />

                <strong>
                  No recent activity
                </strong>

                <span>
                  Activity for this
                  internship will
                  appear here.
                </span>

              </div>
            ) : (
              activities
                .slice(0, 5)
                .map(
                  (
                    activity,
                    index
                  ) => (
                    <div
                      className="reference-activity-item"
                      key={
                        activity?.id ||
                        `${activity?.text}-${index}`
                      }
                    >

                      <span
                        className={`activity-dot ${
                          activity?.type ===
                          "approved"
                            ? "green"
                            : activity?.type ===
                                "rejected"
                              ? "red"
                              : activity?.type ===
                                  "pending"
                                ? "orange"
                                : "purple"
                        }`}
                      />

                      <div>

                        <strong>
                          {activity?.text}
                        </strong>

                        <span>
                          {formatDate(
                            activity?.date
                          )}

                          {activity?.time
                            ? ` • ${activity.time}`
                            : ""}
                        </span>

                      </div>

                      <Icon
                        name="chevron-right"
                        size={17}
                      />

                    </div>
                  )
                )
            )}

          </div>

        </section>
      </>
    );
  };

  // ==========================================================
  // MAIN RETURN
  // ==========================================================

  return (
    <div
      className={`
        dashboard-layout
        ${
          sidebarOpen
            ? "sidebar-expanded"
            : "sidebar-collapsed"
        }
      `}
    >

      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <InternSidebar
        activeSection={
          activeSection
        }

        onNavigate={
          handleNavigation
        }

        sidebarOpen={
          sidebarOpen
        }

        setSidebarOpen={
          setSidebarOpen
        }

        theme={
          theme
        }

        toggleTheme={
          toggleTheme
        }
      />

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="dashboard-main">

        {/* ====================================================
            NAVBAR
        ==================================================== */}

        <InternNavbar
          activeSection={
            activeSection
          }

          onNavigate={
            handleNavigation
          }

          profilePhoto={
            profilePhoto
          }

          avatarInitial={
            avatarInitial
          }

          displayName={
            displayName
          }

          internships={
            internships
          }

          selectedInternshipId={
            activeInternshipId
          }

          selectedInternship={
            selectedInternship
          }

          onInternshipChange={
            handleInternshipChange
          }
        />

        {/* ====================================================
            CONTENT
        ==================================================== */}

        <div className="dashboard-content">

          <div
            className="section-fade"
            key={`${activeSection}-${activeInternshipId}`}
          >

            {/* DASHBOARD */}

            {activeSection ===
              "dashboard" &&
              renderDashboard()}

            {/* CERTIFICATES */}

            {activeSection ===
              "certificates" && (
              <Certificates
                onRequestCertificate={() =>
                  navigate("/intern/certificate-request")
                }

                selectedInternshipId={
                  activeInternshipId
                }

                selectedInternship={
                  selectedInternship
                }

                requests={
                  internshipRequests
                }

                certificates={
                  internshipCertificates
                }

                certificateStats={
                  certificateStats
                }
              />
            )}

            {/* NOTIFICATIONS */}

            {activeSection ===
              "notifications" && (
              <Notifications
                selectedInternshipId={
                  activeInternshipId
                }

                selectedInternship={
                  selectedInternship
                }
              />
            )}

            {/* PROFILE */}

            {activeSection ===
              "profile" && (
              <Profile
                profileData={
                  profileData
                }

                profileForm={
                  profileForm
                }

                isEditingProfile={
                  isEditingProfile
                }

                isPhotoLoading={
                  isPhotoLoading
                }

                profilePhotoInputRef={
                  profilePhotoInputRef
                }

                avatarInitial={
                  avatarInitial
                }

                displayName={
                  displayName
                }

                selectedInternshipId={
                  activeInternshipId
                }

                selectedInternship={
                  selectedInternship
                }

                startEditingProfile={
                  startEditingProfile
                }

                cancelEditingProfile={
                  cancelEditingProfile
                }

                saveProfile={
                  saveProfile
                }

                openProfilePhotoPicker={
                  openProfilePhotoPicker
                }

                handleProfilePhotoChange={
                  handleProfilePhotoChange
                }

                removeProfilePhoto={
                  removeProfilePhoto
                }

                handleProfileFieldChange={
                  handleProfileFieldChange
                }

                onNavigate={
                  handleNavigation
                }
              />
            )}

          </div>

        </div>

      </main>

      {/* ======================================================
          CERTIFICATE REQUEST MODAL
      ====================================================== */}

      <CertificateRequest
        show={
          showRequestModal
        }

        close={
          closeRequestModal
        }

        selectedCertificate={
          selectedCertificate
        }

        setSelectedCertificate={
          setSelectedCertificate
        }

        selectedTemplate={
          selectedTemplate
        }

        requestStep={
          requestStep
        }

        setRequestStep={
          setRequestStep
        }

        requestSubmitted={
          requestSubmitted
        }

        requestForm={
          requestForm
        }

        updateRequestField={
          updateRequestField
        }

        goToDetails={
          goToDetails
        }

        goToReview={
          goToReview
        }

        submitCertificateRequest={
          submitCertificateRequest
        }

        certificateOptions={
          availableCertificateNames
        }

        displayName={
          displayName
        }

        selectedInternshipId={
          activeInternshipId
        }

        selectedInternship={
          selectedInternship
        }
      />

    </div>
  );
};

export default InternDashboard;