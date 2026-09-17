import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import CreateIntern from "../components/CreateIntern";
import CreateTl from "../components/CreateTl";
import ForwardedRequestsList from "../components/ForwardedRequestsList";
import TeamLeadersSection from "../components/TeamLeadersSection";
import TemplatesSection from "../components/TemplatesSection";
import CertificatesOverview from "../components/CertificatesOverview";

import "./AdminDashboard.css";

const AdminDashboard = () => {
  const { user, handleLogout } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("overview");

  const initials = (user?.fullName || "Admin")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const logout = () => {
    handleLogout();
    navigate("/login");
  };

  return (
    <div className="admin-dashboard-shell">
      <header className="admin-topbar">
        <div className="admin-brand">
          <span className="admin-brand-icon">UP</span>
          <strong>uptoskills</strong>
        </div>
        <div className="admin-topbar-user">
          <div className="admin-avatar">{initials}</div>
          <div>
            <strong>{user?.fullName || "Administrator"}</strong>
            <small>{user?.email || "Loading profile..."}</small>
          </div>
          <button className="admin-logout" onClick={logout} title="Sign out">
            <span>↩</span> Logout
          </button>
        </div>
      </header>

      <aside className="admin-sidebar" aria-label="Admin navigation">
        <p className="admin-sidebar-label">Workspace</p>
        <nav className="admin-sidebar-nav">
          <button
            className={`admin-nav-item ${activeView === "overview" ? "active" : ""}`}
            onClick={() => setActiveView("overview")}
          >
            <span>▦</span> Overview
          </button>
          <button
            className={`admin-nav-item ${activeView === "intern" ? "active" : ""}`}
            onClick={() => setActiveView("intern")}
          >
            <span>＋</span> Create Intern
          </button>
          <button
            className={`admin-nav-item ${activeView === "teamleader" ? "active" : ""}`}
            onClick={() => setActiveView("teamleader")}
          >
            <span>♙</span> Create Team Leader
          </button>
          <button
            className={`admin-nav-item ${activeView === "requests" ? "active" : ""}`}
            onClick={() => setActiveView("requests")}
          >
            <span>▤</span> Certificate Requests
          </button>

          <button
            className={`admin-nav-item ${
              activeView === "certificates" ? "active" : ""
            }`}
            onClick={() => setActiveView("certificates")}
          >
            <span>▤</span> Certificates
          </button>

          <button
            className={`admin-nav-item ${
              activeView === "templates" ? "active" : ""
            }`}
            onClick={() => setActiveView("templates")}
          >
            <span>▣</span>
            Templates
          </button>

          <button
            className={`admin-nav-item ${
              activeView === "certificate-review" ? "active" : ""
            }`}
            onClick={() => setActiveView("certificate-review")}
          >
            <span>▤</span> Certificate Review
          </button>
        </nav>
        <div className="admin-sidebar-note">
          <span>●</span> Admin access enabled
        </div>
      </aside>

      <main className="admin-dashboard-main">
        <header className="admin-page-header">
          <p className="admin-eyebrow">ADMINISTRATION</p>
          <h1>
            {activeView === "overview"
              ? "Welcome back"
              : activeView === "intern"
                ? "Create an intern"
                : activeView === "teamleader"
                  ? "Create a team leader"
                  : activeView === "requests"
                    ? "Certificate requests"
                    : activeView === "certificates"
                      ? "Certificates"
                      : activeView === "templates"
                        ? "Certificate templates"
                        : "Certificate review"}
          </h1>
          <p>
            {activeView === "overview"
              ? "Manage your portal accounts from one secure workspace."
              : activeView === "requests"
                ? "Finalize certificate requests forwarded by Team Leaders."
                : activeView === "certificates"
                  ? "View, review, and manage generated certificates."
                  : activeView === "templates"
                    ? "Create and manage certificate templates."
                    : activeView === "intern"
                      ? "Create a new intern account."
                      : activeView === "teamleader"
                        ? "Create a new team leader account."
                        : "Review, edit and finalize the certificate before sending it to the intern."}
          </p>
        </header>

        {activeView === "overview" ? (
          <>
            <section
              className="admin-profile-card"
              aria-label="Administrator profile"
            >
              <div className="admin-profile-heading">
                <div className="admin-profile-avatar">{initials}</div>
                <div>
                  <p className="admin-eyebrow">YOUR PROFILE</p>
                  <h2>{user?.fullName || "Administrator"}</h2>
                  <p>{user?.email || "Loading profile..."}</p>
                </div>
              </div>
              <div className="admin-profile-details">
                <div>
                  <span>Role</span>
                  <strong>{user?.role || "admin"}</strong>
                </div>
                <div>
                  <span>Mobile number</span>
                  <strong>{user?.mobileNo || "Not provided"}</strong>
                </div>
                <div>
                  <span>Member since</span>
                  <strong>
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </strong>
                </div>
              </div>
              <div className="admin-quick-actions">
                <button onClick={() => setActiveView("intern")}>
                  <span>＋</span>
                  <strong>Create Intern</strong>
                  <small>Register a new intern account</small>
                </button>
                <button onClick={() => setActiveView("teamleader")}>
                  <span>♙</span>
                  <strong>Create Team Leader</strong>
                  <small>Add a team leader to the portal</small>
                </button>
              </div>
            </section>

            <TeamLeadersSection />
          </>
        ) : activeView === "intern" ? (
          <CreateIntern />
        ) : activeView === "teamleader" ? (
          <CreateTl />
        ) : activeView === "requests" ? (
          <ForwardedRequestsList />
        ) : activeView === "templates" ? (
          <TemplatesSection />
        ) : activeView === "certificates" ? (
          <CertificatesOverview />
        ) : null}
      </main>
    </div>
  );
};

export default AdminDashboard;
