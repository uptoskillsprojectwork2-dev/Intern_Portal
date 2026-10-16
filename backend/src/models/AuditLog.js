import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      index: true
    },
    actorRole: {
      type: String,
      trim: true,
      default: "system"
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    targetType: {
      type: String,
      trim: true,
      default: "unknown"
    },
    entityType: {
      type: String,
      trim: true,
      default: "unknown"
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    description: {
      type: String
    },
    ip: {
      type: String,
      default: ""
    },
    ipAddress: {
      type: String,
      default: ""
    },
    userAgent: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false
    }
  }
);

auditLogSchema.index({ actorId: 1, action: 1, targetType: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

auditLogSchema.pre("save", async function () {
  if (!this.isNew) throw new Error("Audit logs are append-only and cannot be modified or deleted.");
  const actorId = this.actorId || this.userId;
  if (actorId) {
    const userModel = mongoose.model("user");
    const user = await userModel.findById(actorId);
    if (!user) throw new Error("actorId does not reference an existing user");
  }
});

auditLogSchema.pre(["findOneAndUpdate", "findOneAndReplace", "updateOne", "updateMany", "replaceOne", "findOneAndDelete", "deleteOne", "deleteMany"], function () {
  throw new Error("Audit logs are append-only and cannot be modified or deleted.");
});

auditLogSchema.pre("bulkWrite", function () {
  throw new Error("Audit logs are append-only and cannot be modified or deleted.");
});

const auditLogModel = mongoose.model(
  "audit_log",
  auditLogSchema
);

export default auditLogModel;
