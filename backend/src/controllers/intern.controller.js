import CertificateRequest from '../models/CertificateRequest.js';

// 1. Submit a new certificate request
export const submitCertificateRequest = async (req, res) => {
    try {
        const { type, reason, status } = req.body;

        // Grab the ID from the token so you never have to send it manually in Postman
        const userId = req.user.id || req.user._id;

        const newRequest = await CertificateRequest.create({
            internId: userId, 
            type: type,
            reason: reason,
            status: status || 'pending'
        });

        res.status(201).json({
            message: "Certificate request submitted successfully",
            data: newRequest
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// 2. Get all requests made by the logged-in intern
export const getMyRequests = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        
        // Find only the certificates that belong to this specific intern
        const requests = await CertificateRequest.find({ internId: userId });

        res.status(200).json({
            message: "Requests fetched successfully",
            data: requests
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};