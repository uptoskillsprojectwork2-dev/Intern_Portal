import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
{
    certificateNumber: {
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

    internshipId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "internship",
        required: true,
        index: true
    },

    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "certificate_template"
    },

    certificateType: {
        type: String,
        required: true,
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

    status: {
        type: String,
        enum: ["generated", "issued", "revoked", "expired"],
        default: "generated",
        index: true
    },

    pdfPath: {
        type: String
    },

    verificationCode: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
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
    const userModel = mongoose.model("user");
    const internshipModel = mongoose.model("internship");

    const user = await userModel.findById(this.userId);
    if (!user) throw new Error("userId does not reference an existing user");

    const internship = await internshipModel.findById(this.internshipId);
    if (!internship) throw new Error("internshipId does not reference an existing internship");

    if (this.templateId) {
        const certificateTemplateModel = mongoose.model("certificate_template");
        const template = await certificateTemplateModel.findById(this.templateId);
        if (!template) throw new Error("templateId does not reference an existing certificate template");
    }

    if (this.generatedBy) {
        const generator = await userModel.findById(this.generatedBy);
        if (!generator) throw new Error("generatedBy does not reference an existing user");
    }
});

const certificateModel = mongoose.model(
    "certificate",
    certificateSchema
);

export default certificateModel;
