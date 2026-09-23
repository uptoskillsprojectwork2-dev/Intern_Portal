import { useState } from 'react';
import useTemplates from '../hooks/useTemplates';
import TemplateForm from './TemplateForm';
import TemplateList from './TemplateList';

export default function TemplateManager() {
  const { templates, loading, error, refetch, addTemplate, editTemplate, toggleTemplate } = useTemplates();
  const [editing, setEditing] = useState(null);
  const [actionError, setActionError] = useState(null);

  const save = async (payload) => {
    setActionError(null);
    if (editing) {
      await editTemplate(editing._id, payload);
      setEditing(null);
    } else {
      await addTemplate(payload);
    }
  };

  const toggle = async (id) => {
    setActionError(null);
    try {
      await toggleTemplate(id);
    } catch (toggleError) {
      setActionError(toggleError.message || 'Unable to change template status.');
    }
  };

  return (
    <section className="templates-panel" aria-labelledby="templates-title">
      <div className="templates-heading">
        <div>
          <p className="admin-eyebrow">CERTIFICATE TEMPLATES</p>
          <h2 id="templates-title">Manage templates</h2>
          <p>Create the HTML source used to generate certificate drafts. Use Handlebars placeholders such as <code>{'{{fullName}}'}</code>.</p>
        </div>
        <button type="button" className="template-refresh-button" onClick={refetch}>Refresh</button>
      </div>

      <div className="templates-layout">
        <TemplateForm
          template={editing}
          onSubmit={save}
          onCancel={() => setEditing(null)}
        />
        <div className="template-list-panel">
          <div className="template-list-heading">
            <h3>Existing templates</h3>
            <span>{templates.length}</span>
          </div>
          {loading && <p className="template-empty">Loading templates…</p>}
          {!loading && error && <div className="template-error" role="alert"><span>{error}</span><button type="button" onClick={refetch}>Retry</button></div>}
          {!loading && !error && actionError && <p className="template-error" role="alert">{actionError}</p>}
          {!loading && !error && <TemplateList templates={templates} onEdit={setEditing} onToggle={toggle} />}
        </div>
      </div>
    </section>
  );
}
