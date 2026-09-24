import { createContext, useEffect, useState } from "react";
import { getProfile } from "../services/intern.api";
import { useAuth } from "../../auth/hooks/useAuth";

export const InternContext = createContext(null);

export function InternProvider({ children }) {
	const { user, loading: authLoading } = useAuth();
	const [profile, setProfile] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const fetchProfile = async () => {
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
	};

	useEffect(() => {
		if (!authLoading && user?.role === "intern") {
			fetchProfile();
		}
	}, [authLoading, user?.role]);

	return (
		<InternContext.Provider value={{ profile, loading, error, fetchProfile }}>
			{children}
		</InternContext.Provider>
	);
}
