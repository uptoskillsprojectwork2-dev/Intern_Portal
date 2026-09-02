import mongoose from "mongoose";

const internshipSchema = new mongoose.Schema(
    {
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

        companyName: {
            type: String,
            required: true
        },

        domain: {
            type: String
        },

        startDate: {
            type: Date,
            required: true
        },

        endDate: {
            type: Date,
            required: true
        },

        duration: {
            type: Number
        },

        mentorName: {
            type: String
        },

        mentorEmail: {
            type: String
        },

        status: {
            type: String,
            enum: ["upcoming", "ongoing", "completed", "cancelled"],
            default: "upcoming"
        }
    },
    {
        timestamps: true
    }
);

internshipSchema.pre("save", async function () {
    const userModel = mongoose.model("user");
    const user = await userModel.findById(this.userId);
    if (!user) throw new Error("userId does not reference an existing user");
});

export default mongoose.model("internship", internshipSchema);
