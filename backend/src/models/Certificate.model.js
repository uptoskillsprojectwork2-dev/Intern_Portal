import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
{
    requestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "certificate_request",
        required: true,
        index: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
        index: true
    },

    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "certificate_template",
        required: true,
        index: true
    },

    htmlContent: {
        type: String,
        required: true
    },

    status: {
        type: String,
        enum: ["draft", "finalized", "generated", "issued", "revoked", "expired"],
        default: "draft",
        index: true
    },

    fileUrl: {
        type: String
    },

    emailSentAt: {
        type: Date
    },

    certificateNumber: {
        type: String,
        trim: true
    },

    internCode: {
        type: String,
        trim: true
    },

    internshipId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "internship"
    },

    certificateType: {
        type: String,
        trim: true
    },

    domain: {
        type: String,
        trim: true
    },

    startDate: {
        type: Date
    },

    endDate: {
        type: Date
    },

    issuedDate: {
        type: Date,
        default: Date.now
    },

    pdfPath: {
        type: String
    },

    verificationCode: {
        type: String,
        trim: true
    },

    qrCodePath: {
        type: String
    },

    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }
},
{
    timestamps: true
});

certificateSchema.pre("save", async function () {
    const userModel = mongoose.models.user || mongoose.model("user");

    if (this.userId) {
        const user = await userModel.findById(this.userId);
        if (!user) throw new Error("userId does not reference an existing user");
    }

    if (this.templateId) {
        const certificateTemplateModel = mongoose.models.certificate_template || mongoose.model("certificate_template");
        const template = await certificateTemplateModel.findById(this.templateId);
        if (!template) throw new Error("templateId does not reference an existing certificate template");
    }
});

const certificateModel = mongoose.models.certificate || mongoose.model(
    "certificate",
    certificateSchema
);

export default certificateModel;
