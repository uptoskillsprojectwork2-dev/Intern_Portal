import certificateRequestModel from "../models/CertificateRequest.js";
import userModel from "../models/User.js";

/*
 * GET PENDING CERTIFICATE REQUESTS
 */
export async function getPendingCertificateRequests(req, res) {
    try {
        const requests = await certificateRequestModel
            .find({ status: "pending" })
            .populate(
                "userId",
                "fullName email internCode domain startDate endDate"
            )
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
            message: "Pending certificate requests fetched successfully",
            requests
        });

    } catch (err) {
        console.error(
            "Get pending certificate requests error:",
            err
        );

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}


/*
 * APPROVE CERTIFICATE REQUEST
 */
export async function approveCertificateRequest(req, res) {
    try {
        const { id } = req.params;
        const reviewerId = req.user.id;

        // Check HR user exists
        const reviewer = await userModel.findById(reviewerId);

        if (!reviewer) {
            return res.status(404).json({
                message: "HR user not found"
            });
        }

        // Find only a pending request
        const request = await certificateRequestModel.findOne({
            _id: id,
            status: "pending"
        });

        if (!request) {
            return res.status(404).json({
                message: "Pending certificate request not found"
            });
        }

        // Update request
        request.status = "approved";
        request.reviewedAt = new Date();
        request.reviewedBy = reviewerId;
        request.rejectionReason = undefined;

        await request.save();

        // Populate data for response
        await request.populate(
            "userId",
            "fullName email internCode"
        );

        await request.populate(
            "internshipId",
            "internCode companyName domain startDate endDate duration mentorName mentorEmail status"
        );

        return res.status(200).json({
            message: "Certificate request approved successfully",
            request
        });

    } catch (err) {
        console.error(
            "Approve certificate request error:",
            err
        );

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}


/*
 * REJECT CERTIFICATE REQUEST
 */
export async function rejectCertificateRequest(req, res) {
    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;

        const userId = req.user.id;

        if (!rejectionReason || !rejectionReason.trim()) {
            return res.status(400).json({
                message: "Rejection reason is required"
            });
        }

        const request = await certificateRequestModel.findOneAndUpdate(
            {
                _id: id,
                status: "pending"
            },
            {
                $set: {
                    status: "rejected",
                    reviewedBy: userId,
                    reviewedAt: new Date(),
                    rejectionReason: rejectionReason.trim()
                }
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!request) {
            return res.status(404).json({
                message: "Pending certificate request not found"
            });
        }

        return res.status(200).json({
            message: "Certificate request rejected successfully",
            request
        });

    } catch (err) {
        console.error("Reject certificate request error:", err);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}