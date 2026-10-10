import { useCallback, useEffect, useState } from "react";
import { getProfile } from "../services/intern.api";
import { useAuth } from "../../auth/hooks/useAuth";
import { InternContext } from "./intern-context";

export function InternProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getProfile();
      setProfile(data.user);
      return data.user;
    } catch (err) {
      setError(err.message || "Unable to load profile");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || user?.role !== "intern") return;

    const timeoutId = setTimeout(() => {
      void fetchProfile().catch(() => {});
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [authLoading, user?.role, fetchProfile]);

  return (
    <InternContext.Provider value={{ profile, loading, error, fetchProfile }}>
      {children}
    </InternContext.Provider>
  );
}
