import mongoose from "mongoose";

const certificateRequestSchema = new mongoose.Schema(
{
    requestNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
        index: true
    },

    internCode: {
        type: String,
        required: true,
        index: true
    },

    certificateType: {
        type: String,
        required: true,
        trim: true
    },

    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "certificate_template"
    },

    reason: {
        type: String,
        trim: true
    },

    status: {
        type: String,
        enum: [
            "pending",
            "approved",
            "rejected",
            "processing",
            "completed",
            "cancelled"
        ],
        default: "pending",
        index: true
    },

    requestedAt: {
        type: Date,
        default: Date.now
    },

    reviewedAt: {
        type: Date
    },

    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },

    rejectionReason: {
        type: String,
        trim: true
    },

    certificateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "certificate"
    }
},
{
    timestamps: true
});

certificateRequestSchema.pre("save", async function () {
    const userModel = mongoose.model("user");

    const user = await userModel.findById(this.userId);
    if (!user) throw new Error("userId does not reference an existing user");

    if (this.templateId) {
        const certificateTemplateModel = mongoose.model("certificate_template");
        const template = await certificateTemplateModel.findById(this.templateId);
        if (!template) throw new Error("templateId does not reference an existing certificate template");
    }

    if (this.reviewedBy) {
        const reviewer = await userModel.findById(this.reviewedBy);
        if (!reviewer) throw new Error("reviewedBy does not reference an existing user");
    }

    if (this.certificateId) {
        const certificateModel = mongoose.model("certificate");
        const certificate = await certificateModel.findById(this.certificateId);
        if (!certificate) throw new Error("certificateId does not reference an existing certificate");
    }
});

const certificateRequestModel = mongoose.model(
    "certificate_request",
    certificateRequestSchema
);

export default certificateRequestModel;
