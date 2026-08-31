import "../styles/dashboard-shared.css";

/**
 * Shared dashboard layout: sidebar + topbar + content well.
 * Every role dashboard (Intern / HR / Admin) renders inside this
 * so navigation, spacing, and visual language stay identical.
 *
 * navItems: [{ key, icon, label, onClick, active, count }]
 * user: { initials, name, role }
 */
export default function DashboardShell({
  brandCaption = "Internship Portal",
  navItems = [],
  darkMode,
  onToggleDarkMode,
  breadcrumb,
  title,
  headerRight,
  user = { initials: "U", name: "User", role: "Member" },
  helpText = "Contact your HR team for assistance.",
  children,
}) {
  return (
    <div className={darkMode ? "portal dark" : "portal"}>
      {/* ================= SIDEBAR ================= */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">🚀</div>
          <div>
            <div className="brand-name">uptoskills</div>
            <div className="brand-caption">{brandCaption}</div>
          </div>
        </div>

        <div className="sidebar-content">
          <div className="nav-label">WORKSPACE</div>

          {navItems.map((item) => (
            <button
              key={item.key}
              className={item.active ? "nav-item active" : "nav-item"}
              onClick={item.onClick}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {!!item.count && (
                <span className="nav-count">{item.count}</span>
              )}
            </button>
          ))}

          <div className="nav-label account-label">ACCOUNT</div>

          <button className="nav-item" onClick={onToggleDarkMode}>
            <span className="nav-icon">{darkMode ? "☀" : "☾"}</span>
            <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>
        </div>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">?</div>
            <div>
              <strong>Need help?</strong>
              <p>{helpText}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ================= MAIN ================= */}
      <main className="main">
        <header className="topbar">
          <div>
            {breadcrumb && <div className="breadcrumb">{breadcrumb}</div>}
            <h1>{title}</h1>
          </div>

          <div className="topbar-right">
            {headerRight}

            <div className="profile">
              <div className="avatar">{user.initials}</div>
              <div className="profile-info">
                <strong>{user.name}</strong>
                <span>{user.role}</span>
              </div>
              <span className="profile-arrow">▾</span>
            </div>
          </div>
        </header>

        <div className="content">{children}</div>
      </main>
    </div>
  );
}
