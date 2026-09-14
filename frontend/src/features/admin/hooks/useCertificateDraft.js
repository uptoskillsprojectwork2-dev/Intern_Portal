import { useState } from 'react';

const useCertificateDraft = () => {
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  return {
    draft,
    setDraft,
    loading,
    error,
    setLoading,
    setError,
  };
};

export default useCertificateDraft;