import './Toast.css';

/**
 * Shared Toast / Alert feedback component.
 *
 * @param {Object} props
 * @param {'success'|'error'|'info'|'loading'} [props.type='info'] - Alert style type
 * @param {string} props.message - Message to display
 * @param {function} [props.onClose] - Optional dismiss handler
 */
export default function Toast({ type = 'info', message, onClose }) {
  if (!message) return null;

  const icons = {
    success: <i className="bi bi-check-circle-fill" />,
    error: <i className="bi bi-x-circle-fill" />,
    info: <i className="bi bi-info-circle-fill" />,
    loading: <i className="bi bi-hourglass-split" />
  };

  return (
    <div className={`shared-toast shared-toast-${type}`} role="alert" aria-live="polite">
      <span className="shared-toast-icon" aria-hidden="true">
        {icons[type] || <i className="bi bi-info-circle-fill" />}
      </span>
      <span className="shared-toast-message">{message}</span>
      {onClose && (
        <button
          type="button"
          className="shared-toast-close"
          onClick={onClose}
          aria-label="Dismiss message"
        >
          <i className="bi bi-x-lg" style={{ fontSize: '0.85em' }}></i>
        </button>
      )}
    </div>
  );
}
