import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
{
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
        index: true
    },

    title: {
        type: String,
        required: true,
        trim: true
    },

    message: {
        type: String,
        required: true
    },

    type: {
        type: String,
        enum: [
            "general",
            "internship",
            "certificate",
            "system"
        ],
        default: "general"
    },

    isRead: {
        type: Boolean,
        default: false,
        index: true
    },

    readAt: {
        type: Date
    }
},
{
    timestamps: true
});

notificationSchema.pre("save", async function () {
    const userModel = mongoose.model("user");
    const user = await userModel.findById(this.userId);
    if (!user) throw new Error("userId does not reference an existing user");
});

const notificationModel = mongoose.model(
    "notification",
    notificationSchema
);

export default notificationModel;
