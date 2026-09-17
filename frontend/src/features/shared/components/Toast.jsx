import "./Toast.css";

export default function Toast({ message, type = "success", onClose }) {
  if (!message) return null;

  return (
    <div
      className={`shared-toast shared-toast-${type}`}
      role="alert"
    >
      <span>{message}</span>

      {onClose && (
        <button type="button" onClick={onClose}>
          ×
        </button>
      )}
    </div>
  );
}