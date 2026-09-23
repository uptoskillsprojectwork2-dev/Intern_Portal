const labelForType = (type) => type?.replaceAll('_', ' ') || 'Unknown';

export default function TemplateList({ templates, onEdit, onToggle }) {
  if (!templates.length) return <p className="template-empty">No certificate templates yet. Create the first one above.</p>;

  return (
    <div className="template-list">
      {templates.map((template) => (
        <article className="template-row" key={template._id}>
          <div className="template-row-main">
            <div className="template-row-title">
              <h3>{template.name}</h3>
              <span className={`template-status ${template.isActive ? 'active' : 'inactive'}`}>
                {template.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p>{labelForType(template.certificateType)}</p>
            <small>Updated {template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : '—'}</small>
          </div>
          <div className="template-row-actions">
            <button type="button" onClick={() => onEdit(template)}>Edit</button>
            <button type="button" onClick={() => onToggle(template._id)}>{template.isActive ? 'Deactivate' : 'Activate'}</button>
          </div>
        </article>
      ))}
    </div>
  );
}
