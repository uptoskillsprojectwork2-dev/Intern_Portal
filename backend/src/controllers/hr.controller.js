import CertificateRequest from '../models/CertificateRequest.js';
import userModel from '../models/User.js';

// 1. Get all pending requests for HR to review
export const getPendingRequests = async (req, res) => {
    try {
        // Find all pending requests and attach the intern's details (but hide the password!)
        const requests = await CertificateRequest.find({ status: 'pending' })
            .populate('internId', 'fullName email internCode domain'); 

        res.status(200).json({
            message: "Pending requests fetched successfully",
            data: requests
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching requests", error: error.message });
    }
};

// 2. Approve or Reject a request
export const updateCertificateStatus = async (req, res) => {
    try {
        const { id } = req.params; 
        const { status, remarks } = req.body; 

        const updatedRequest = await CertificateRequest.findByIdAndUpdate(
            id,
            { 
                status: status, 
                remarks: remarks, 
                approvedBy: req.user.id 
            },
            { new: true } 
        );

        if (!updatedRequest) {
            return res.status(404).json({ message: "Certificate request not found" });
        }

        res.status(200).json({
            message: `Certificate successfully marked as ${status}`,
            data: updatedRequest
        });
    } catch (error) {
        res.status(500).json({ message: "Error updating certificate", error: error.message });
    }
};