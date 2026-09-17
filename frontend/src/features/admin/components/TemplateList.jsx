const prettyType = (value = "") =>
  value.replaceAll("_", " ");

export default function TemplateList({
  templates,
  loading,
  error,
  onEdit,
  onToggle,
  onRetry,
}) {
  return (
    <section
      className="template-list-panel"
      aria-labelledby="template-list-title"
    >

      {/* Header */}
      <div className="template-list-heading">

        <div>
          <p className="admin-eyebrow">
            CERTIFICATE TEMPLATES
          </p>

          <h2 id="template-list-title">
            All templates
          </h2>
        </div>

        <span className="template-count">
          {templates.length} templates
        </span>

      </div>

      {/* Loading */}
      {loading && (
        <p className="template-list-state">
          Loading templates...
        </p>
      )}

      {/* Error */}
      {!loading && error && (
        <div
          className="template-list-error"
          role="alert"
        >
          <span>{error}</span>

          <button
            type="button"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading &&
        !error &&
        !templates.length && (
          <p className="template-list-state">
            No templates created yet.
          </p>
        )}

      {/* Template List */}
      {!loading &&
        !error &&
        templates.length > 0 && (

          <div className="template-list">

            {templates.map((template) => {

              const id =
                template._id ||
                template.id;

              const active = template.status === "active";

              return (
                <article
                  className="template-row"
                  key={id}
                >

                  {/* Template Information */}
                  <div className="template-row-main">

                    <div>

                      <h3>
                        {template.name ||
                          template.templateName}
                      </h3>

                      <p>
                        {prettyType(
                          template.certificateType
                        )}
                      </p>

                    </div>

                    {/* Status */}
                    <span
                      className={`template-status ${
                        active
                          ? "active"
                          : "inactive"
                      }`}
                    >
                      {active
                        ? "Active"
                        : "Inactive"}
                    </span>

                  </div>

                  {/* Actions */}
                  <div className="template-row-actions">

                    <button
                      type="button"
                      onClick={() =>
                        onEdit(template)
                      }
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onToggle(id)
                      }
                    >
                      {active
                        ? "Deactivate"
                        : "Activate"}
                    </button>

                  </div>

                </article>
              );
            })}

          </div>
        )}

    </section>
  );
}