import "../styles/dashboard-shared.css";

/**
 * Inline banner used inside dashboard content (success / error).
 * Reuses the .alert / .success-alert / .error-alert classes already
 * defined in dashboard-shared.css.
 */
export default function Alert({ type = "success", message, onDismiss }) {
  if (!message) return null;

  return (
    <div className={type === "error" ? "alert error-alert" : "alert success-alert"}>
      <div className="alert-symbol">{type === "error" ? "!" : "✓"}</div>
      <span>{message}</span>
      {onDismiss && <button onClick={onDismiss}>×</button>}
    </div>
  );
}
