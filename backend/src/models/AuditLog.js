import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      index: true,
      default: null
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      index: true,
      default: null
    },
    actorRole: {
      type: String,
      trim: true,
      default: 'system'
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
      default: 'unknown'
    },
    entityType: {
      type: String,
      trim: true,
      default: 'unknown'
    },
    targetId: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    entityId: {
      type: mongoose.Schema.Types.Mixed,
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
      default: ''
    },
    ipAddress: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
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

auditLogSchema.pre('validate', function (next) {
  if (!this.actorId && this.userId) {
    this.actorId = this.userId;
  }
  if (!this.userId && this.actorId) {
    this.userId = this.actorId;
  }
  if ((!this.targetType || this.targetType === 'unknown') && this.entityType && this.entityType !== 'unknown') {
    this.targetType = this.entityType;
  }
  if ((!this.entityType || this.entityType === 'unknown') && this.targetType && this.targetType !== 'unknown') {
    this.entityType = this.targetType;
  }
  if (!this.targetId && this.entityId) {
    this.targetId = this.entityId;
  }
  if (!this.entityId && this.targetId) {
    this.entityId = this.targetId;
  }
  if (!this.ip && this.ipAddress) {
    this.ip = this.ipAddress;
  }
  if (!this.ipAddress && this.ip) {
    this.ipAddress = this.ip;
  }
  if (typeof next === 'function') next();
});

auditLogSchema.pre('save', async function () {
  if (!this.isNew) throw new Error('Audit logs are append-only and cannot be modified or deleted.');
  const actorId = this.actorId || this.userId;
  if (actorId) {
    const userModel = mongoose.model('user');
    const user = await userModel.findById(actorId);
    if (!user) throw new Error('actorId does not reference an existing user');
  }
});

auditLogSchema.pre(
  ['findOneAndUpdate', 'findOneAndReplace', 'updateOne', 'updateMany', 'replaceOne', 'findOneAndDelete', 'deleteOne', 'deleteMany'],
  function () {
    throw new Error('Audit logs are append-only and cannot be modified or deleted.');
  }
);

auditLogSchema.pre('bulkWrite', function () {
  throw new Error('Audit logs are append-only and cannot be modified or deleted.');
});

const auditLogModel =
  mongoose.models.audit_log ||
  mongoose.models.AuditLog ||
  mongoose.model('audit_log', auditLogSchema, 'audit_logs');

mongoose.models.AuditLog = auditLogModel;

export default auditLogModel;
