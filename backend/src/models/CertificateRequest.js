import mongoose from 'mongoose';

const certificateRequestSchema = new mongoose.Schema(
  {
    internId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user', // <--- CHANGED THIS to lowercase 'user'
      required: true
    },
    type: {
      type: String,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    remarks: {
      type: String,
      default: ''
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user' // <--- CHANGED THIS to lowercase 'user'
    }
  },
  { timestamps: true }
);

export default mongoose.model('CertificateRequest', certificateRequestSchema);