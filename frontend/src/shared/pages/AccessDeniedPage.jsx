import { Link } from "react-router-dom";
import "./AccessDeniedPage.css";

export default function AccessDeniedPage() {
  return (
    <main className="access-denied-container" id="access-denied-page">
      <div className="access-denied-card" role="alert" aria-labelledby="access-denied-title">
        <div className="access-denied-badge">403 ERROR</div>
        <div className="access-denied-icon" aria-hidden="true">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h1 id="access-denied-title" className="access-denied-title">Access Denied</h1>
        <p className="access-denied-desc">
          You do not have permission to view this resource. Your account role may not be authorized for this section of the portal.
        </p>
        <div className="access-denied-actions">
          <Link to="/login" className="btn-primary" id="access-denied-login-btn">
            Sign In with Different Account
          </Link>
          <button
            type="button"
            className="btn-secondary"
            id="access-denied-back-btn"
            onClick={() => window.history.back()}
          >
            Go Back
          </button>
        </div>
      </div>
    </main>
  );
}
