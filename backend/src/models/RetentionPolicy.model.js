import mongoose from 'mongoose';

const retentionPolicySchema = new mongoose.Schema(
  {
    graceDays: {
      type: Number,
      default: 30,
      min: [1, 'Grace days must be at least 1'],
      required: true,
    },
    purgeDays: {
      type: Number,
      default: 90,
      min: [1, 'Purge days must be at least 1'],
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure single document singleton
retentionPolicySchema.statics.getOrCreatePolicy = async function () {
  let policy = await this.findOne();
  if (!policy) {
    policy = await this.create({
      graceDays: 30,
      purgeDays: 90,
    });
  }
  return policy;
};

const RetentionPolicy = mongoose.model('retention_policy', retentionPolicySchema);

export default RetentionPolicy;
