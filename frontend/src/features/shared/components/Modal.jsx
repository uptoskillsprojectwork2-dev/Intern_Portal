import "../styles/dashboard-shared.css";

/**
 * Generic modal shell. Reuses the .modal / .modal-overlay styling
 * already defined in dashboard-shared.css so every modal in the app
 * (certificate request, approve/reject confirmation, etc.) looks the same.
 */
export default function Modal({
  icon = "!",
  title,
  description,
  onClose,
  children,
  closeOnOverlayClick = true,
}) {
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">
            <div className="modal-icon">{icon}</div>
            <div>
              <h2>{title}</h2>
              {description && <p>{description}</p>}
            </div>
          </div>

          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

/**
 * Purpose-built confirmation modal to replace window.confirm / window.prompt.
 * mode: "confirm" (yes/no) or "prompt" (yes/no + a required reason textarea).
 */
export function ConfirmModal({
  icon = "?",
  title,
  description,
  mode = "confirm",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  reason,
  onReasonChange,
  reasonLabel = "Reason",
  reasonPlaceholder = "Explain why…",
  loading = false,
  onConfirm,
  onClose,
}) {
  const canConfirm = mode !== "prompt" || (reason || "").trim().length > 0;

  return (
    <Modal icon={icon} title={title} description={description} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canConfirm) onConfirm();
        }}
      >
        {mode === "prompt" && (
          <div className="form-group">
            <label>
              {reasonLabel} <span>*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => onReasonChange?.(e.target.value)}
              placeholder={reasonPlaceholder}
              rows="4"
              disabled={loading}
              autoFocus
            />
          </div>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </button>

          <button
            type="submit"
            className="modal-submit"
            disabled={loading || !canConfirm}
            style={
              destructive
                ? { background: "linear-gradient(135deg, #e15c6b, #c8394a)" }
                : undefined
            }
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
