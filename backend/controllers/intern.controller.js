import { Certificate } from '../models/Certificate.model.js';

export const getInternCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const certificate = await Certificate.findOne({ request: id, status: 'completed' });
    if (!certificate) {
      return res.status(404).json({ success: false, error: 'Certificate not found or not yet finalized.' });
    }
    res.status(200).json({ success: true, data: certificate });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
