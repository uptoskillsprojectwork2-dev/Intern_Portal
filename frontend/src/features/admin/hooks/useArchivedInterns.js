import { useState, useEffect, useCallback } from "react";
import { getArchivedInterns, restoreArchivedIntern } from "../services/admin.service";

export default function useArchivedInterns() {
  const [archivedInterns, setArchivedInterns] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [restoringId, setRestoringId] = useState(null);

  const fetchArchivedInterns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getArchivedInterns();
      setArchivedInterns(data.interns || []);
      setPolicy(data.policy || null);
    } catch (err) {
      setError(err.message || "Failed to load archived interns.");
    } finally {
      setLoading(false);
    }
  }, []);

  const restore = async (id) => {
    setRestoringId(id);
    try {
      const res = await restoreArchivedIntern(id);
      // Remove restored intern from local state
      setArchivedInterns((prev) => prev.filter((intern) => intern._id !== id && intern.id !== id));
      return res;
    } catch (err) {
      throw new Error(err.message || "Failed to restore intern.");
    } finally {
      setRestoringId(null);
    }
  };

  useEffect(() => {
    fetchArchivedInterns();
  }, [fetchArchivedInterns]);

  return {
    archivedInterns,
    policy,
    loading,
    error,
    restoringId,
    fetchArchivedInterns,
    restore,
  };
}
