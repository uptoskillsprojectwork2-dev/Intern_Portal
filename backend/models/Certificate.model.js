import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema({
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'CertificateRequest', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'CertificateTemplate', required: true },
  htmlContent: { type: String, required: true },
  status: { type: String, enum: ['draft', 'completed'], default: 'draft' },
  pdfUrl: { type: String }
}, { timestamps: true });

export const Certificate = mongoose.models.Certificate || mongoose.model('Certificate', certificateSchema);
export default Certificate;
