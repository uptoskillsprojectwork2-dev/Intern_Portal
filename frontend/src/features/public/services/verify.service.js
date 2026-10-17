import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * Public certificate verification request.
 * Intentionally does NOT attach any auth logic, tokens, or credentials.
 *
 * @param {string} verifyId - The random unguessable verification ID
 * @returns {Promise<object>} The verified certificate payload
 */
export const verifyCertificate = async (verifyId) => {
  const response = await axios.get(
    `${API_BASE_URL}/api/verify/${encodeURIComponent(verifyId)}`,
    {
      headers: {
        Accept: 'application/json'
      }
    }
  );
  return response.data;
};
