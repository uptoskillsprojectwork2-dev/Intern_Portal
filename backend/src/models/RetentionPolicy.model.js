import mongoose from "mongoose";

const retentionPolicySchema = new mongoose.Schema(
  {
    // Enforces single-document constraint across concurrent requests
    singletonKey: {
      type: String,
      default: "default_policy",
      unique: true,
      required: true,
      index: true
    },

    graceDays: {
      type: Number,
      required: true,
      default: 30,
      min: [1, "Grace days must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Grace days must be an integer"
      }
    },

    purgeDays: {
      type: Number,
      required: true,
      default: 90,
      min: [1, "Purge days must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Purge days must be an integer"
      }
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Validate that purgeDays is strictly greater than graceDays before save
retentionPolicySchema.pre("validate", function () {
  if (this.graceDays != null && this.purgeDays != null) {
    if (this.purgeDays <= this.graceDays) {
      this.invalidate("purgeDays", "Purge days must be strictly greater than grace days");
    }
  }
});

/**
 * Safely fetches or creates the singleton RetentionPolicy document.
 * Guarantees exactly one active policy exists.
 */
retentionPolicySchema.statics.getOrCreatePolicy = async function () {
  let policy = await this.findOne({ singletonKey: "default_policy" });
  if (!policy) {
    policy = await this.findOneAndUpdate(
      { singletonKey: "default_policy" },
      { $setOnInsert: { singletonKey: "default_policy", graceDays: 30, purgeDays: 90 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  return policy;
};

const RetentionPolicy = mongoose.model("retention_policy", retentionPolicySchema);

export default RetentionPolicy;
