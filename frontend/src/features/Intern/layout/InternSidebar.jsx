import Icon from "../../shared/Icons/Icon.jsx";
import { navItems } from "../data.js";
import { useLocation, useNavigate } from "react-router-dom";

const InternSidebar = ({
  activeSection,
  onNavigate,
  sidebarOpen,
  setSidebarOpen,
  theme,
  toggleTheme,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const sectionRoutes = {
    dashboard: "/intern/dashboard",
    certificates: "/intern/certificates",
    notifications: "/intern/notifications",
    profile: "/intern/profile",
  };

  const handleNavigation = (section) => {
    const route = sectionRoutes[section];

    if (route) {
      navigate(route);
    }

    if (typeof onNavigate === "function") {
      onNavigate(section);
    }
  };

  const getIsActive = (section) => {
    const route = sectionRoutes[section];

    if (route) {
      return location.pathname === route;
    }

    return activeSection === section;
  };

  const handleSidebarToggle = () => {
    if (typeof setSidebarOpen === "function") {
      setSidebarOpen((previous) => !previous);
    }
  };

  const handleThemeToggle = () => {
    if (typeof toggleTheme === "function") {
      toggleTheme();
    }
  };

  const handleLogout = () => {
    try {
      window.localStorage.removeItem(
        "olms-selected-internship"
      );
    } catch {
      // Ignore localStorage errors.
    }
  };

  return (
    <aside
      className={`sidebar ${
        sidebarOpen
          ? "sidebar-open"
          : "sidebar-closed"
      }`}
    >
      {/* SIDEBAR HEADER */}

      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            U
          </div>

          <span className="sidebar-brand-text">
            Uptoskills
          </span>
        </div>

        <button
          type="button"
          className="sidebar-toggle"
          onClick={handleSidebarToggle}
          aria-label={
            sidebarOpen
              ? "Collapse sidebar"
              : "Expand sidebar"
          }
          title={
            sidebarOpen
              ? "Collapse sidebar"
              : "Expand sidebar"
          }
        >
          <Icon
            name={
              sidebarOpen
                ? "chevron-left"
                : "chevron-right"
            }
            size={16}
          />
        </button>
      </div>

      {/* MENU LABEL */}

      <div className="sidebar-section-label">
        MENU
      </div>

      {/* NAVIGATION */}

      <nav
        className="sidebar-nav"
        aria-label="Intern navigation"
      >
        {Array.isArray(navItems) &&
          navItems.map((item) => {
            const isActive = getIsActive(item.key);

            return (
              <button
                key={item.key}
                type="button"
                className={`nav-item ${
                  isActive ? "active" : ""
                } has-tooltip`}
                onClick={() =>
                  handleNavigation(item.key)
                }
                aria-current={
                  isActive
                    ? "page"
                    : undefined
                }
                aria-label={item.label}
                data-tooltip={item.label}
              >
                <span className="nav-icon">
                  <Icon
                    name={item.icon}
                    size={19}
                  />
                </span>

                <span className="nav-text">
                  {item.label}
                </span>
              </button>
            );
          })}
      </nav>

      {/* SIDEBAR BOTTOM */}

      <div className="sidebar-bottom">

        {/* THEME SWITCH */}

        <div className="sidebar-theme-control">
          <span className="sidebar-theme-label" />

          <button
            type="button"
            className={`sidebar-theme-switch ${
              theme === "light"
                ? "light"
                : "dark"
            }`}
            onClick={handleThemeToggle}
            aria-label={
              theme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
            title={
              theme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
          >
            <span className="sidebar-theme-knob" />
          </button>
        </div>

        {/* LOGOUT */}

        <div className="sidebar-footer">
          <button
            type="button"
            className="nav-item logout-btn has-tooltip"
            onClick={handleLogout}
            aria-label="Logout"
            data-tooltip="Logout"
          >
            <span className="nav-icon">
              <Icon
                name="logout"
                size={19}
              />
            </span>

            <span className="nav-text">
              Logout
            </span>
          </button>
        </div>

      </div>
    </aside>
  );
};

export default InternSidebar;