import { useCallback, useEffect, useState } from "react";

import {
  createTemplate,
  getAllTemplates,
  updateTemplate,
  toggleTemplateActive,
} from "../services/admin.service";

export default function useTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all templates
  const loadTemplates = useCallback(async () => {
    try {
      const data = await getAllTemplates();

      setTemplates(data.templates || []);
      setError(null);
    } catch (requestError) {
      setError(requestError.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadTemplates();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [loadTemplates]);

  // Create template
  const addTemplate = async (payload) => {
    const data = await createTemplate(payload);

    const newTemplate = data.template;

    setTemplates((currentTemplates) => [newTemplate, ...currentTemplates]);

    return newTemplate;
  };

  // Update template
  const editTemplate = async (id, payload) => {
    const data = await updateTemplate(id, payload);

    const updatedTemplate = data.template;

    setTemplates((currentTemplates) =>
      currentTemplates.map((template) => {
        const templateId = template._id || template.id;

        return templateId === id ? updatedTemplate : template;
      }),
    );

    return updatedTemplate;
  };

  // Activate / deactivate template
  const toggleActive = async (id) => {
    const data = await toggleTemplateActive(id);

    const updatedTemplate = data.template;

    setTemplates((currentTemplates) =>
      currentTemplates.map((template) => {
        const templateId = template._id || template.id;

        return templateId === id ? updatedTemplate : template;
      }),
    );

    return updatedTemplate;
  };

  return {
    templates,
    loading,
    error,

    // Reload templates
    refetch: loadTemplates,

    // Template operations
    addTemplate,
    editTemplate,
    toggleActive,
  };
}
