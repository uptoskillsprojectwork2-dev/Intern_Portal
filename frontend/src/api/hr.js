import axios from "axios";

const API_BASE_URL = "http://localhost:3000";

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});


/*
 * GET PENDING CERTIFICATE REQUESTS
 */
export const getPendingCertificateRequests = async () => {
    try {
        const response = await apiClient.get(
            "/api/hr/pending-requests"
        );

        return response.data;

    } catch (error) {
        throw error.response?.data || error;
    }
};


/*
 * APPROVE CERTIFICATE REQUEST
 */
export const approveCertificateRequest = async (requestId) => {
    try {
        const response = await apiClient.put(
            `/api/hr/certificate-requests/${requestId}/approve`
        );

        return response.data;

    } catch (error) {
        throw error.response?.data || error;
    }
};


/*
 * REJECT CERTIFICATE REQUEST
 */
export const rejectCertificateRequest = async (
    requestId,
    rejectionReason
) => {
    try {
        const response = await apiClient.put(
            `/api/hr/certificate-requests/${requestId}/reject`,
            {
                rejectionReason
            }
        );

        return response.data;

    } catch (error) {
        throw error.response?.data || error;
    }
};