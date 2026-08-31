import axios from "axios";

const API_BASE_URL = "http://localhost:3000";

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json"
    },
    withCredentials: true
});


/*
 * Get logged-in intern's internship
 */
export const getMyInternship = async () => {
    try {
        const response = await apiClient.get(
            "/api/intern/internship"
        );

        return response.data;

    } catch (error) {
        throw error.response?.data || error;
    }
};


/*
 * Submit certificate request
 */
export const submitCertificateRequest = async (
    requestData
) => {
    try {
        const response = await apiClient.post(
            "/api/intern/certificate-requests",
            requestData
        );

        return response.data;

    } catch (error) {
        throw error.response?.data || error;
    }
};


/*
 * Get logged-in intern's certificate requests
 */
export const getMyCertificateRequests = async () => {
    try {
        const response = await apiClient.get(
            "/api/intern/certificate-requests"
        );

        return response.data;

    } catch (error) {
        throw error.response?.data || error;
    }
};