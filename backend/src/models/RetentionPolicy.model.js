import mongoose from "mongoose";

const retentionPolicySchema = new mongoose.Schema({
    graceDays: {
        type: Number,
        default: 30
    },
    purgeDays: {
        type: Number,
        default: 90
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }
}, { timestamps: true });

const RetentionPolicy = mongoose.model("RetentionPolicy", retentionPolicySchema);
export default RetentionPolicy;
