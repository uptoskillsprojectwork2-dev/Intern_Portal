import axios from 'axios';

const publicApi = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
  // No withCredentials — this is a public, unauthenticated endpoint.
});

/**
 * Verify a certificate using its public verifyId.
 * Calls GET /api/verify/:verifyId with no auth.
 *
 * @param {string} verifyId
 * @returns {Promise<Object>} Certificate verification data
 */
export const verifyCertificate = async (verifyId) => {
  const response = await publicApi.get(`/api/verify/${encodeURIComponent(verifyId)}`);
  return response.data;
};
