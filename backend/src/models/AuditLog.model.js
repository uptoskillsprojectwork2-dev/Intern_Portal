import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      default: null,
      index: true,
    },

    actorRole: {
      type: String,
      enum: ['admin', 'teamleader', 'intern', 'system'],
      required: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    targetType: {
      type: String,
      trim: true,
      index: true,
    },

    targetId: {
      type: mongoose.Schema.Types.Mixed,
    },

    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    ip: {
      type: String,
    },

    userAgent: {
      type: String,
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    // Disable the automatic updatedAt field — logs are append-only.
    timestamps: false,
  }
);

// Descending index on createdAt for efficient list queries.
auditLogSchema.index({ createdAt: -1 });

// ─── Append-only enforcement ────────────────────────────────────────────────
// Block all update and delete operations at the schema level.

const blockOperation = function (next) {
  next(new Error('AuditLog is append-only. Updates and deletes are not permitted.'));
};

auditLogSchema.pre('updateOne', blockOperation);
auditLogSchema.pre('findOneAndUpdate', blockOperation);
auditLogSchema.pre('updateMany', blockOperation);
auditLogSchema.pre('deleteOne', blockOperation);
auditLogSchema.pre('deleteMany', blockOperation);
auditLogSchema.pre('findOneAndDelete', blockOperation);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
