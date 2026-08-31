import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
{
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        index: true
    },

    action: {
        type: String,
        required: true,
        trim: true,
        index: true
    },

    entityType: {
        type: String,
        required: true,
        trim: true
    },

    entityId: {
        type: mongoose.Schema.Types.ObjectId
    },

    description: {
        type: String
    },

    ipAddress: {
        type: String
    },

    userAgent: {
        type: String
    }
},
{
    timestamps: true
});

auditLogSchema.pre("save", async function () {
    if (this.userId) {
        const userModel = mongoose.model("user");
        const user = await userModel.findById(this.userId);
        if (!user) throw new Error("userId does not reference an existing user");
    }
});

const auditLogModel = mongoose.model(
    "audit_log",
    auditLogSchema
);

export default auditLogModel;
