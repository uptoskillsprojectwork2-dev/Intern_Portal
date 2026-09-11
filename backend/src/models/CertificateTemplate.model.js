import mongoose from "mongoose";

const certificateTemplateSchema = new mongoose.Schema(
{
    name: {
        type: String,
        required: true,
        trim: true
    },
    templateName: {
        type: String,
        trim: true
    },
    templateCode: {
        type: String,
        trim: true
    },
    certificateType: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    title: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    content: {
        type: String
    },
    htmlContent: {
        type: String,
        required: true
    },
    placeholders: {
        type: [String],
        default: []
    },
    logoPath: {
        type: String
    },
    backgroundPath: {
        type: String
    },
    signaturePath: {
        type: String
    },
    version: {
        type: Number,
        default: 1
    },
    status: {
        type: String,
        enum: ["draft", "active", "inactive", "archived"],
        default: "active",
        index: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }
},
{
    timestamps: true
});

certificateTemplateSchema.pre("save", async function () {
    if (!this.name && this.templateName) {
        this.name = this.templateName;
    }
    if (!this.templateName && this.name) {
        this.templateName = this.name;
    }
    if (!this.htmlContent && this.content) {
        this.htmlContent = this.content;
    }
    if (!this.content && this.htmlContent) {
        this.content = this.htmlContent;
    }
    if (this.createdBy) {
        const userModel = mongoose.models.user || mongoose.model("user");
        const creator = await userModel.findById(this.createdBy);
        if (!creator) throw new Error("createdBy does not reference an existing user");
    }
});

const certificateTemplateModel = mongoose.models.certificate_template || mongoose.model(
    "certificate_template",
    certificateTemplateSchema
);

export default certificateTemplateModel;
