import mongoose from 'mongoose';

const certificateTemplateSchema = new mongoose.Schema({
    title: { type: String, required: true },
    templateName: { type: String, required: true },
    certificateType: { type: String, required: true },
    templateCode: { type: String, required: true, unique: true },
    htmlContent: { type: String, required: true },
    isActive: { type: Boolean, default: true }
});

export default mongoose.model('CertificateTemplate', certificateTemplateSchema);