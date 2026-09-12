import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  details: { type: Object }
}, { timestamps: true, collection: 'certificaterequests' });

export default mongoose.model('Request', requestSchema);