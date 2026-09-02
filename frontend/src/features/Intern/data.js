// ============================================================
// INTERN DATA
// src/features/Intern/data.js
// ============================================================
//
// This file contains frontend structure/constants only.
//
// Real intern, internship, certificate request and certificate
// data will come from the backend/database.
//
// There is intentionally NO dummy intern/certificate data here.
// ============================================================


// ============================================================
// EMPTY PROFILE
// ============================================================

export const emptyProfile = {
  photo: "",

  // ----------------------------------------------------------
  // Intern-editable personal information
  // ----------------------------------------------------------

  fullName: "",
  email: "",
  phone: "",
  college: "",
  address: "",
  bio: "",
  opinions: "",

  // ----------------------------------------------------------
  // HR-controlled internship information
  // ----------------------------------------------------------

  internCode: "",
  domain: "",
  startDate: "",
  endDate: "",
  organization: "",
  company: "",
  role: "",
  status: "",

  // ----------------------------------------------------------
  // Multiple internships
  // ----------------------------------------------------------
  //
  // One intern can have multiple internships.
  //
  // Each internship should contain its own:
  //
  // - id
  // - internCode
  // - domain
  // - organization
  // - role
  // - startDate
  // - endDate
  // - status
  // - certificateTypes
  // - requests
  // - certificates
  // - activities
  //
  // The backend will eventually provide this data.
  // ----------------------------------------------------------

  internships: [],
};


// ============================================================
// CERTIFICATE TEMPLATES
// ============================================================
//
// These templates define which fields are required by the
// certificate request form.
//
// IMPORTANT:
//
// This list does NOT decide whether an intern is eligible.
//
// Eligibility should come from the selected internship's
// `certificateTypes` value supplied by the backend.
//
// ============================================================

export const certificateTemplates = [

  // ----------------------------------------------------------
  // INTERNSHIP COMPLETION
  // ----------------------------------------------------------

  {
    id: "internship-completion",

    name: "Internship Completion Certificate",

    description:
      "Certificate after successful completion of internship.",

    fields: [
      "fullName",
      "internId",
      "department",
      "startDate",
      "endDate",
      "organization",
    ],
  },


  // ----------------------------------------------------------
  // BONAFIDE
  // ----------------------------------------------------------

  {
    id: "bonafide",

    name: "Bonafide Certificate",

    description:
      "Certificate confirming your internship association.",

    fields: [
      "fullName",
      "internId",
      "department",
      "organization",
    ],
  },


  // ----------------------------------------------------------
  // EXPERIENCE LETTER
  // ----------------------------------------------------------

  {
    id: "experience-letter",

    name: "Experience Letter",

    description:
      "Letter confirming your internship experience.",

    fields: [
      "fullName",
      "internId",
      "role",
      "startDate",
      "endDate",
      "organization",
      "purpose",
    ],
  },


  // ----------------------------------------------------------
  // OJT
  // ----------------------------------------------------------

  {
    id: "ojt",

    name: "OJT Certificate",

    description:
      "Certificate for On-the-Job Training completion.",

    fields: [
      "fullName",
      "internId",
      "department",
      "startDate",
      "endDate",
      "organization",
    ],
  },


  // ----------------------------------------------------------
  // PARTICIPATION
  // ----------------------------------------------------------

  {
    id: "participation",

    name: "Participation Certificate",

    description:
      "Certificate for participation in events or workshops.",

    fields: [
      "fullName",
      "internId",
      "department",
      "organization",
      "purpose",
    ],
  },


  // ----------------------------------------------------------
  // PROJECT COMPLETION
  // ----------------------------------------------------------

  {
    id: "project-completion",

    name: "Project Completion Certificate",

    description:
      "Certificate for completing an assigned project.",

    fields: [
      "fullName",
      "internId",
      "department",
      "organization",
      "role",
      "purpose",
    ],
  },


  // ----------------------------------------------------------
  // TRAINING
  // ----------------------------------------------------------

  {
    id: "training",

    name: "Training Certificate",

    description:
      "Certificate for successfully completing training.",

    fields: [
      "fullName",
      "internId",
      "department",
      "organization",
      "purpose",
    ],
  },


  // ----------------------------------------------------------
  // ACHIEVEMENT
  // ----------------------------------------------------------

  {
    id: "achievement",

    name: "Achievement Certificate",

    description:
      "Certificate recognizing an internship achievement.",

    fields: [
      "fullName",
      "internId",
      "department",
      "organization",
      "purpose",
    ],
  },


  // ----------------------------------------------------------
  // SKILL
  // ----------------------------------------------------------

  {
    id: "skill",

    name: "Skill Certificate",

    description:
      "Certificate recognizing a demonstrated skill.",

    fields: [
      "fullName",
      "internId",
      "department",
      "organization",
      "purpose",
    ],
  },

];


// ============================================================
// COMMON CERTIFICATE TYPES
// ============================================================
//
// These are the certificate types available in the frontend
// request UI.
//
// The backend/HR can later decide which ones are actually
// available for a particular internship.
//
// ============================================================

export const commonCertificateTypes = [

  "Internship Completion Certificate",

  "Bonafide Certificate",

  "OGD Certificate",

  "Experience Letter",

  "LEC Certificate",

  "LEC Winner Certificate",

  "Intern of the Month Certificate",

  "TL of the Month Certificate",

];


// ============================================================
// REQUEST FORM FIELD INFORMATION
// ============================================================
//
// These fields are used by CertificateRequest.jsx.
//
// Values such as:
//
// - Full Name
// - Intern ID
// - Domain
// - Start Date
// - End Date
// - Organization
// - Role
//
// should ultimately be populated automatically from the
// intern profile + selected internship.
//
// The backend must also prevent interns from changing
// HR-controlled values.
// ============================================================

export const requestFieldMeta = {

  // ----------------------------------------------------------
  // FULL NAME
  // ----------------------------------------------------------

  fullName: [
    "Full Name",
    "text",
    "Your full name",
  ],


  // ----------------------------------------------------------
  // INTERN ID
  // ----------------------------------------------------------

  internId: [
    "Intern ID",
    "text",
    "Assigned automatically",
  ],


  // ----------------------------------------------------------
  // DEPARTMENT / DOMAIN
  // ----------------------------------------------------------

  department: [
    "Department / Domain",
    "text",
    "Selected internship domain",
  ],


  // ----------------------------------------------------------
  // START DATE
  // ----------------------------------------------------------

  startDate: [
    "Internship Start Date",
    "date",
    "",
  ],


  // ----------------------------------------------------------
  // END DATE
  // ----------------------------------------------------------

  endDate: [
    "Internship End Date",
    "date",
    "",
  ],


  // ----------------------------------------------------------
  // ORGANIZATION
  // ----------------------------------------------------------

  organization: [
    "Organization / Company",
    "text",
    "Internship organization",
  ],


  // ----------------------------------------------------------
  // ROLE
  // ----------------------------------------------------------

  role: [
    "Role / Position",
    "text",
    "Internship role",
  ],


  // ----------------------------------------------------------
  // PURPOSE
  // ----------------------------------------------------------

  purpose: [
    "Purpose / Description",
    "text",
    "Enter relevant details",
  ],


  // ----------------------------------------------------------
  // REMARKS
  // ----------------------------------------------------------

  remarks: [
    "Remarks",
    "text",
    "Optional remarks",
  ],

};


// ============================================================
// INTERN SIDEBAR NAVIGATION
// ============================================================
//
// Sidebar = page navigation.
//
// Internship switching = navbar / internship selector.
//
// The selected internship should affect:
//
// - Dashboard
// - Profile
// - Certificates
// - Notifications
//
// ============================================================

export const navItems = [

  {
    key: "dashboard",
    label: "Dashboard",
    icon: "dashboard",
  },

  {
    key: "certificates",
    label: "Certificates",
    icon: "certificate",
  },

  {
    key: "notifications",
    label: "Notifications",
    icon: "bell",
  },

  {
    key: "profile",
    label: "My Profile",
    icon: "user",
  },

];


// ============================================================
// PAGE TITLES
// ============================================================

export const sectionTitles = {

  dashboard: "Dashboard",

  certificates: "Certificates",

  notifications: "Notifications",

  profile: "My Profile",

};


// ============================================================
// CERTIFICATE STATUS VALUES
// ============================================================
//
// Keep these values consistent throughout the application.
//
// Pending
// Approved
// Rejected
//
// ============================================================

export const certificateStatuses = {

  PENDING: "Pending",

  APPROVED: "Approved",

  REJECTED: "Rejected",

};


// ============================================================
// INTERNSHIP STATUS VALUES
// ============================================================

export const internshipStatuses = {

  ACTIVE: "Active",

  COMPLETED: "Completed",

  UPCOMING: "Upcoming",

  CANCELLED: "Cancelled",

};


// ============================================================
// DEFAULT CERTIFICATE ELIGIBILITY
// ============================================================
//
// Frontend fallback only.
//
// The backend should eventually provide:
//
// selectedInternship.certificateTypes
//
// Example:
//
// certificateTypes: [
//   "Internship Completion Certificate",
//   "Bonafide Certificate",
//   "OJT Certificate"
// ]
//
// ============================================================

export const defaultCertificateEligibility = {

  common: [

    "Internship Completion Certificate",

    "Bonafide Certificate",

  ],

};


// ============================================================
// BACKEND API ENDPOINTS
// ============================================================
//
// These are endpoint definitions only.
//
// We are NOT calling the backend from this file.
//
// The backend team can implement these routes later.
//
// ============================================================

export const internApiEndpoints = {

  // ----------------------------------------------------------
  // INTERN PROFILE
  // ----------------------------------------------------------

  profile:
    "/api/intern/profile",


  // ----------------------------------------------------------
  // ALL INTERNSHIPS
  // ----------------------------------------------------------

  internships:
    "/api/intern/internships",


  // ----------------------------------------------------------
  // SINGLE INTERNSHIP
  // ----------------------------------------------------------

  internship: (internshipId) =>
    `/api/intern/internships/${internshipId}`,


  // ----------------------------------------------------------
  // CERTIFICATES
  // ----------------------------------------------------------

  certificates: (internshipId) =>
    `/api/intern/internships/${internshipId}/certificates`,


  // ----------------------------------------------------------
  // CERTIFICATE REQUESTS
  // ----------------------------------------------------------

  certificateRequests: (internshipId) =>
    `/api/intern/internships/${internshipId}/certificate-requests`,


  // ----------------------------------------------------------
  // AVAILABLE CERTIFICATE TYPES
  // ----------------------------------------------------------

  certificateTypes: (internshipId) =>
    `/api/intern/internships/${internshipId}/certificate-types`,


  // ----------------------------------------------------------
  // NOTIFICATIONS
  // ----------------------------------------------------------

  notifications: (internshipId) =>
    `/api/intern/internships/${internshipId}/notifications`,

};


// ============================================================
// LOCAL STORAGE KEYS
// ============================================================
//
// Temporary frontend persistence.
//
// Once authentication + backend are connected, the backend
// becomes the source of truth.
// ============================================================

export const storageKeys = {

  profile:
    "olms-intern-profile",

  selectedInternship:
    "olms-selected-internship",

};


// ============================================================
// REQUEST FIELD TYPES
// ============================================================

export const requestFieldTypes = {

  TEXT: "text",

  DATE: "date",

};


// ============================================================
// PROFILE FIELD PERMISSIONS
// ============================================================
//
// This controls the FRONTEND UI.
//
// IMPORTANT:
//
// This is NOT actual security.
//
// The backend must independently enforce these permissions.
//
// ============================================================

export const profileFieldPermissions = {

  // ----------------------------------------------------------
  // INTERN CAN EDIT
  // ----------------------------------------------------------

  internEditable: [

    "fullName",

    "email",

    "phone",

    "college",

    "address",

    "bio",

    "photo",

  ],


  // ----------------------------------------------------------
  // HR CONTROLS
  // ----------------------------------------------------------

  hrControlled: [

    "internCode",

    "domain",

    "startDate",

    "endDate",

    "organization",

    "company",

    "role",

    "status",

  ],

};


// ============================================================
// INTERNSHIP DATA FIELDS
// ============================================================
//
// Keeps the expected internship structure centralized.
//
// ============================================================

export const internshipFields = {

  id: "id",

  internCode: "internCode",

  domain: "domain",

  organization: "organization",

  company: "company",

  role: "role",

  startDate: "startDate",

  endDate: "endDate",

  status: "status",

  certificateTypes: "certificateTypes",

  requests: "requests",

  certificates: "certificates",

  activities: "activities",

};