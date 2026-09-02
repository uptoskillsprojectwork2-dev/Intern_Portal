import mongoose from "mongoose";

const certificateTemplateSchema = new mongoose.Schema(
{
    templateCode: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    templateName: {
        type: String,
        required: true,
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
        required: true,
        trim: true
    },

    description: {
        type: String,
        trim: true
    },

    content: {
        type: String
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
        default: "draft",
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
    if (this.createdBy) {
        const userModel = mongoose.model("user");
        const creator = await userModel.findById(this.createdBy);
        if (!creator) throw new Error("createdBy does not reference an existing user");
    }
});

const certificateTemplateModel = mongoose.model(
    "certificate_template",
    certificateTemplateSchema
);

export default certificateTemplateModel;
