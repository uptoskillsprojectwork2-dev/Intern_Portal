import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      default: null,
      index: true
    },
    actorRole: {
      type: String,
      enum: ['admin', 'teamleader', 'intern', 'system'],
      default: null
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
      index: true
    },
    targetId: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ip: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: -1
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// Backwards compatibility for legacy fields: userId, entityType, entityId, ipAddress
auditLogSchema.virtual('userId').get(function () {
  return this.actorId;
}).set(function (val) {
  this.actorId = val;
});

auditLogSchema.virtual('entityType').get(function () {
  return this.targetType;
}).set(function (val) {
  this.targetType = val;
});

auditLogSchema.virtual('entityId').get(function () {
  return this.targetId;
}).set(function (val) {
  this.targetId = val;
});

auditLogSchema.virtual('ipAddress').get(function () {
  return this.ip;
}).set(function (val) {
  this.ip = val;
});

auditLogSchema.pre('validate', function (next) {
  if (!this.actorId && this.get('userId')) {
    this.actorId = this.get('userId');
  }
  if (!this.targetType && this.get('entityType')) {
    this.targetType = this.get('entityType');
  }
  if (!this.targetId && this.get('entityId')) {
    this.targetId = this.get('entityId');
  }
  if (!this.ip && this.get('ipAddress')) {
    this.ip = this.get('ipAddress');
  }
  if (typeof next === 'function') next();
});

// Append-only enforcement: block updateOne, updateMany, findOneAndUpdate, deleteOne, deleteMany, etc.
const blockMutation = function (next) {
  const err = new Error('Audit logs are append-only. Updates and deletions are blocked.');
  if (typeof next === 'function') return next(err);
  throw err;
};

auditLogSchema.pre('updateOne', blockMutation);
auditLogSchema.pre('updateMany', blockMutation);
auditLogSchema.pre('findOneAndUpdate', blockMutation);
auditLogSchema.pre('findByIdAndUpdate', blockMutation);
auditLogSchema.pre('deleteOne', blockMutation);
auditLogSchema.pre('deleteMany', blockMutation);
auditLogSchema.pre('findOneAndDelete', blockMutation);
auditLogSchema.pre('findByIdAndDelete', blockMutation);
auditLogSchema.pre('findOneAndRemove', blockMutation);

auditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    const err = new Error('Audit logs are append-only. Updates are blocked.');
    if (typeof next === 'function') return next(err);
    throw err;
  }
  if (typeof next === 'function') next();
});

const AuditLog = mongoose.models.AuditLog ||
  mongoose.models.audit_log ||
  mongoose.model('AuditLog', auditLogSchema, 'audit_logs');

export default AuditLog;
