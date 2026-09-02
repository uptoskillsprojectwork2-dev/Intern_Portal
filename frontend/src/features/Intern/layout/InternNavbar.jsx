import {
  useEffect,
  useRef,
  useState,
} from "react";

import Icon from "../../shared/Icons/Icon.jsx";
import { sectionTitles } from "../data.js";


const InternNavbar = ({
  activeSection,
  onNavigate,

  profilePhoto,
  avatarInitial,
  displayName,

  // ============================================================
  // INTERNSHIP SWITCHER
  // ============================================================

  internships = [],
  selectedInternshipId = "",
  selectedInternship = null,
  onInternshipChange,
}) => {

  // ============================================================
  // INTERNSHIP DROPDOWN STATE
  // ============================================================

  const [
    internshipDropdownOpen,
    setInternshipDropdownOpen,
  ] = useState(false);

  const internshipDropdownRef =
    useRef(null);


  // ============================================================
  // CLOSE DROPDOWN WHEN CLICKING OUTSIDE
  // ============================================================

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        internshipDropdownRef.current &&
        !internshipDropdownRef.current.contains(
          event.target
        )
      ) {
        setInternshipDropdownOpen(false);
      }
    };

    if (internshipDropdownOpen) {
      document.addEventListener(
        "mousedown",
        handleOutsideClick
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, [internshipDropdownOpen]);


  // ============================================================
  // CURRENT INTERNSHIP DISPLAY
  // ============================================================

  const currentInternship =
    selectedInternship ||
    internships.find(
      (internship) =>
        String(
          internship.id ||
          internship.internshipId
        ) ===
        String(selectedInternshipId)
    ) ||
    internships[0] ||
    null;


  const currentInternshipName =
    currentInternship?.domain ||
    "Select Internship";




  // ============================================================
  // HANDLE INTERNSHIP SELECTION
  // ============================================================

  const handleInternshipSelect = (
    internshipId
  ) => {
    if (!internshipId) {
      return;
    }

    if (
      typeof onInternshipChange ===
      "function"
    ) {
      onInternshipChange(
        internshipId
      );
    }

    setInternshipDropdownOpen(false);
  };


  // ============================================================
  // PAGE TITLE
  // ============================================================

  const pageTitle =
    sectionTitles[activeSection] ||
    "Dashboard";


  return (
    <header className="top-navbar">

      {/* ======================================================
          LEFT SIDE — PAGE TITLE
      ====================================================== */}

      <div className="topbar-title">

        <h2>
          {pageTitle}
        </h2>

      </div>


      {/* ======================================================
          RIGHT SIDE ACTIONS
      ====================================================== */}

      <div className="header-actions">


        {/* ====================================================
            INTERNSHIP SWITCHER
        ==================================================== */}

        <div
          className="internship-switcher"
          ref={internshipDropdownRef}
        >

          <button
            type="button"
            className={`internship-switcher-button ${
              internshipDropdownOpen
                ? "open"
                : ""
            }`}
            onClick={() =>
              setInternshipDropdownOpen(
                (previous) =>
                  !previous
              )
            }
            aria-haspopup="listbox"
            aria-expanded={
              internshipDropdownOpen
            }
            aria-label="Switch internship"
          >

            {/* Briefcase Icon */}

            <span className="internship-switcher-icon">

              <Icon
                name="briefcase"
                size={17}
              />

            </span>


            {/* Current Internship */}

            <span className="internship-switcher-content">

              <small>
                Current Internship
              </small>

              <strong>
                {currentInternshipName}
              </strong>

            </span>


            {/* Dropdown Arrow */}

            <span className="internship-switcher-arrow">

              <Icon
                name="chevron-down"
                size={16}
              />

            </span>

          </button>


          {/* ==================================================
              DROPDOWN
          ================================================== */}

          {internshipDropdownOpen && (

            <div
              className="internship-dropdown"
              role="listbox"
              aria-label="Available internships"
            >

              {/* Dropdown Header */}

              <div className="internship-dropdown-header">

                <span>
                  SWITCH INTERNSHIP
                </span>

                <small>
                  Choose an internship to view
                  its data
                </small>

              </div>


              {/* =================================================
                  INTERNSHIP LIST
              ================================================= */}

              <div className="internship-dropdown-list">

                {internships.length === 0 ? (

                  <div className="internship-dropdown-empty">

                    <Icon
                      name="briefcase"
                      size={22}
                    />

                    <span>
                      No internships available
                    </span>

                  </div>

                ) : (

                  internships.map(
                    (internship) => {

                      const internshipId =
                        internship.id ||
                        internship.internshipId;

                      const isSelected =
                        String(
                          internshipId
                        ) ===
                        String(
                          selectedInternshipId
                        );


                      const internshipName =
                        internship.domain ||
                        internship.name ||
                        "Internship";


                      const companyName =
                        internship.company ||
                        internship.organization ||
                        "Organization";


                      const status =
                        internship.status ||
                        "Active";


                      return (
                        <button
                          key={
                            internshipId
                          }
                          type="button"
                          role="option"
                          aria-selected={
                            isSelected
                          }
                          className={`internship-dropdown-item ${
                            isSelected
                              ? "selected"
                              : ""
                          }`}
                          onClick={() =>
                            handleInternshipSelect(
                              internshipId
                            )
                          }
                        >

                          {/* Internship Icon */}

                          <span className="internship-item-icon">

                            <Icon
                              name="briefcase"
                              size={18}
                            />

                          </span>


                          {/* Internship Information */}

                          <span className="internship-item-content">

                            <strong>
                              {internshipName}
                            </strong>

                            <span>
                              {companyName}
                            </span>

                            <small>

                              {internship.startDate
                                ? internship.startDate
                                : ""}

                              {internship.startDate &&
                              internship.endDate
                                ? " – "
                                : ""}

                              {internship.endDate
                                ? internship.endDate
                                : ""}

                            </small>

                          </span>


                          {/* Status + Selected */}

                          <span className="internship-item-right">

                            <span
                              className={`internship-status ${
                                String(
                                  status
                                ).toLowerCase() ===
                                "completed"
                                  ? "completed"
                                  : String(
                                      status
                                    ).toLowerCase() ===
                                    "rejected"
                                  ? "rejected"
                                  : "active"
                              }`}
                            >
                              {status}
                            </span>


                            {isSelected && (

                              <span className="internship-selected-check">

                                <Icon
                                  name="check"
                                  size={15}
                                />

                              </span>

                            )}

                          </span>

                        </button>
                      );
                    }
                  )

                )}

              </div>


              {/* =================================================
                  DROPDOWN FOOTER
              ================================================= */}

              {internships.length > 0 && (

                <div className="internship-dropdown-footer">

                  <span>
                    {internships.length}{" "}
                    {internships.length === 1
                      ? "internship"
                      : "internships"}{" "}
                    available
                  </span>

                </div>

              )}

            </div>

          )}

        </div>


        {/* ====================================================
            NOTIFICATION BUTTON
        ==================================================== */}

        <button
          type="button"
          className="icon-btn"
          aria-label="Notifications"
          title="Notifications"
          onClick={() =>
            onNavigate(
              "notifications"
            )
          }
        >

          <Icon
            name="bell"
            size={18}
          />

        </button>


        {/* ====================================================
            INTERN PROFILE BUTTON
        ==================================================== */}

        <button
          type="button"
          className={`user-profile ${
            activeSection === "profile"
              ? "active"
              : ""
          }`}
          onClick={() =>
            onNavigate("profile")
          }
          aria-label="Open your profile"
        >

          {/* ================================================
              PROFILE PHOTO
          ================================================= */}

          <div className="avatar">

            {profilePhoto ? (

              <img
                src={profilePhoto}
                alt="Intern profile"
              />

            ) : (

              avatarInitial

            )}

          </div>


          {/* ================================================
              INTERN INFORMATION
          ================================================= */}

          <div className="user-info">

            <strong>
              {displayName}
            </strong>

            <small>
              Intern Account
            </small>

          </div>

        </button>

      </div>

    </header>
  );
};


export default InternNavbar;