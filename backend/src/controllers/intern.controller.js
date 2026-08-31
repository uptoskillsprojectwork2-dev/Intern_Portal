import certificateRequestModel from "../models/CertificateRequest.js";
import certificateTemplateModel from "../models/CertificateTemplate.js";
import internshipModel from "../models/Internship.js";
import userModel from "../models/User.js";

/*
 * Get the internship belonging to the logged-in intern
 */
export async function getMyInternship(req, res) {
    try {
        const userId = req.user.id;

        // Check that the logged-in user exists
        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "Intern not found"
            });
        }

        // Find internship belonging to this user
        const internship = await internshipModel
            .findOne({ userId })
            .populate(
                "userId",
                "name email internCode"
            );

        if (!internship) {
            return res.status(404).json({
                message: "No internship found"
            });
        }

        return res.status(200).json({
            message: "Internship fetched successfully",
            internship
        });

    } catch (err) {
        console.error("Get internship error:", err);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}


/*
 * Submit a certificate request
 */
export async function submitCertificateRequest(req, res) {
    try {
        const userId = req.user.id;

        const {
            internshipId,
            certificateType,
            templateId,
            reason
        } = req.body;

        // Check that the logged-in user exists
        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "Intern not found"
            });
        }

        // Check that the internship exists
        // and belongs to this intern
        const internship = await internshipModel.findOne({
            _id: internshipId,
            userId: userId
        });

        if (!internship) {
            return res.status(404).json({
                message:
                    "Internship not found or does not belong to this intern"
            });
        }

        // Generate a unique request number
        const requestNumber = `REQ-${Date.now()}`;

        const request = await certificateRequestModel.create({
            requestNumber,
            userId,
            internCode: user.internCode,
            internshipId: internship._id,
            certificateType,
            templateId,
            reason,
            status: "pending"
        });

        return res.status(201).json({
            message:
                "Certificate request submitted successfully",
            request
        });

    } catch (err) {
        console.error(
            "Submit certificate request error:",
            err
        );

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}


/*
 * Get certificate requests belonging to the logged-in intern
 */
export async function getMyCertificateRequests(req, res) {
    try {
        const userId = req.user.id;

        const requests = await certificateRequestModel
            .find({ userId })
            .populate(
                "internshipId",
                "internCode companyName domain startDate endDate duration mentorName mentorEmail status"
            )
            .populate(
                "templateId",
                "templateCode templateName certificateType title"
            )
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message:
                "Certificate requests fetched successfully",
            requests
        });

    } catch (err) {
        console.error(
            "Get certificate requests error:",
            err
        );

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}