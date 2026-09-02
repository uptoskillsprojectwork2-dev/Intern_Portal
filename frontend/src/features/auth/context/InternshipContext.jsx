import {
  createContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const InternshipContext = createContext(null);

const STORAGE_KEY = "selectedInternshipId";

export function InternshipProvider({ children }) {
  const [internships, setInternships] = useState([]);
  const [selectedInternshipId, setSelectedInternshipId] =
    useState(() => {
      return localStorage.getItem(STORAGE_KEY) || "";
    });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadInternships = async () => {
      try {
        setLoading(true);
        setError("");

        /*
         * TEMPORARY FRONTEND DATA
         *
         * We are not inventing an internship here.
         * HR/backend data will be connected later.
         */
        const data = [];

        if (!mounted) {
          return;
        }

        setInternships(data);

        if (data.length === 0) {
          setSelectedInternshipId("");
          localStorage.removeItem(STORAGE_KEY);
          return;
        }

        const savedId =
          localStorage.getItem(STORAGE_KEY);

        const savedInternship = data.find(
          (internship) => {
            const id =
              internship.id ||
              internship._id ||
              internship.internshipId;

            return (
              String(id) ===
              String(savedId)
            );
          }
        );

        if (savedInternship) {
          const savedInternshipId = String(
            savedInternship.id ||
              savedInternship._id ||
              savedInternship.internshipId
          );

          setSelectedInternshipId(
            savedInternshipId
          );
        } else {
          const firstInternship = data[0];

          const firstId = String(
            firstInternship.id ||
              firstInternship._id ||
              firstInternship.internshipId
          );

          setSelectedInternshipId(firstId);

          localStorage.setItem(
            STORAGE_KEY,
            firstId
          );
        }
      } catch (err) {
        console.error(
          "Failed to load internships:",
          err
        );

        if (mounted) {
          setError(
            "Unable to load your internships."
          );

          setInternships([]);
          setSelectedInternshipId("");

          localStorage.removeItem(
            STORAGE_KEY
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadInternships();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedInternship = useMemo(() => {
    if (!selectedInternshipId) {
      return null;
    }

    return (
      internships.find((internship) => {
        const id =
          internship.id ||
          internship._id ||
          internship.internshipId;

        return (
          String(id) ===
          String(selectedInternshipId)
        );
      }) || null
    );
  }, [
    internships,
    selectedInternshipId,
  ]);

  const switchInternship = (internshipId) => {
    if (!internshipId) {
      return;
    }

    const internshipExists =
      internships.some((internship) => {
        const id =
          internship.id ||
          internship._id ||
          internship.internshipId;

        return (
          String(id) ===
          String(internshipId)
        );
      });

    if (!internshipExists) {
      console.warn(
        "Internship not found:",
        internshipId
      );

      return;
    }

    const newId = String(internshipId);

    setSelectedInternshipId(newId);

    localStorage.setItem(
      STORAGE_KEY,
      newId
    );
  };

  const clearSelectedInternship = () => {
    setSelectedInternshipId("");

    localStorage.removeItem(
      STORAGE_KEY
    );
  };

  const refreshInternships = async () => {
    /*
     * Backend/API connection will be added here.
     */
    return internships;
  };

  const value = {
    internships,
    selectedInternship,
    selectedInternshipId,
    switchInternship,
    clearSelectedInternship,
    refreshInternships,
    loading,
    error,
    hasInternship: Boolean(
      selectedInternship
    ),
  };

  return (
    <InternshipContext.Provider value={value}>
      {children}
    </InternshipContext.Provider>
  );
}

export default InternshipContext;