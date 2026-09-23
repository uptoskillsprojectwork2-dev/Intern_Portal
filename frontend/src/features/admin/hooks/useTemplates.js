import { useCallback, useEffect, useState } from 'react';

import {
  createTemplate,
  getAllTemplates,
  updateTemplate,
  toggleTemplateActive,
} from '../services/admin.service';

const getErrorMessage = (error) =>
  error.message || 'Unable to load certificate templates.';

export default function useTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getAllTemplates();

      setTemplates(data.templates || []);
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  const addTemplate = useCallback(
    async (payload) => {
      const data = await createTemplate(payload);

      setTemplates((current) => [
        data.template,
        ...current.filter(
          (item) => item._id !== data.template._id
        ),
      ]);

      await refetch();

      return data.template;
    },
    [refetch]
  );

  const editTemplate = useCallback(
    async (id, payload) => {
      const data = await updateTemplate(id, payload);

      setTemplates((current) =>
        current.map((item) =>
          item._id === id ? data.template : item
        )
      );

      await refetch();

      return data.template;
    },
    [refetch]
  );

  const toggleTemplate = useCallback(
    async (id) => {
      const data = await toggleTemplateActive(id);

      setTemplates((current) =>
        current.map((item) =>
          item.certificateType ===
          data.template.certificateType
            ? {
                ...item,
                isActive:
                  item._id === data.template._id
                    ? data.template.isActive
                    : false,
              }
            : item
        )
      );

      await refetch();

      return data.template;
    },
    [refetch]
  );

  useEffect(() => {
    let cancelled = false;

    const loadTemplates = async () => {
      setLoading(true);

      try {
        const data = await getAllTemplates();

        if (cancelled) return;

        setTemplates(data.templates || []);
        setError(null);
      } catch (requestError) {
        if (cancelled) return;

        setError(getErrorMessage(requestError));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadTemplates();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    templates,
    loading,
    error,
    refetch,
    addTemplate,
    editTemplate,
    toggleTemplate,
  };
}