import { useState } from "react";

import useTemplates from "../hooks/useTemplates";

import TemplateForm from "./TemplateForm";
import TemplateList from "./TemplateList";

export default function TemplatesSection() {

  const {
    templates,
    loading,
    error,
    refetch,
    addTemplate,
    editTemplate,
    toggleActive,
  } = useTemplates();

  const [editingTemplate, setEditingTemplate] =
    useState(null);

  const [actionError, setActionError] =
    useState(null);

  // Create / Update template
  const saveTemplate = async (payload) => {

    setActionError(null);

    try {

      if (editingTemplate) {

        const id =
          editingTemplate._id ||
          editingTemplate.id;

        await editTemplate(
          id,
          payload
        );

        // Exit edit mode
        setEditingTemplate(null);

      } else {

        await addTemplate(payload);

      }

    } catch (error) {

      setActionError(error.message);

      throw error;
    }
  };

  // Activate / Deactivate
  const toggleTemplate = async (id) => {

    setActionError(null);

    try {

      await toggleActive(id);

    } catch (toggleError) {

      setActionError(
        toggleError.message
      );
    }
  };

  return (
    <div className="templates-section">

      {/* Action error */}
      {actionError && (
        <p
          className="admin-status error"
          role="alert"
        >
          {actionError}
        </p>
      )}

      <div className="templates-layout">

        {/* Create / Edit Form */}
        <TemplateForm
          editingTemplate={editingTemplate}
          onSave={saveTemplate}
          onCancel={() =>
            setEditingTemplate(null)
          }
        />

        {/* Template List */}
        <TemplateList
          templates={templates}
          loading={loading}
          error={error}
          onEdit={setEditingTemplate}
          onToggle={toggleTemplate}
          onRetry={refetch}
        />

      </div>

    </div>
  );
}