import mongoose from 'mongoose';

const retentionPolicySchema = new mongoose.Schema(
  {
    graceDays: {
      type: Number,
      default: 30,
      min: 1
    },
    purgeDays: {
      type: Number,
      default: 90,
      min: 1
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user'
    }
  },
  {
    timestamps: true
  }
);

const RetentionPolicy = mongoose.model('retention_policy', retentionPolicySchema);

export default RetentionPolicy;
