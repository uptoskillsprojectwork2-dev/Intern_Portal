import crypto from 'crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Certificate from '../src/models/Certificate.js';
import Counter from '../src/models/Counter.model.js';
import User from '../src/models/User.js';

dotenv.config();

const CERTIFICATE_TITLE_MAP = {
  offer_letter: 'Offer Letter',
  bonafide: 'Bonafide Certificate',
  bonafide_certificate: 'Bonafide Certificate',
  ojt_certificate: 'On-the-Job Training Certificate',
  experience_letter: 'Experience Certificate',
  experience_letter1: 'Experience Certificate',
  experience_letter2: 'Experience Certificate',
  completion_certificate: 'Internship Completion Certificate',
  internship_completion_certificate: 'Internship Completion Certificate',
  intern_of_month: 'Intern of the Month',
  league_winner: 'League Winner Certificate',
  custom: 'Certificate',
};

const getCertificateTitle = (certificateType) => {
  if (!certificateType) return 'Certificate';
  return (
    CERTIFICATE_TITLE_MAP[certificateType] ||
    certificateType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
};

const runBackfill = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/intern_portal';
  console.log(`[Backfill] Connecting to MongoDB: ${mongoUri.replace(/:[^:@]+@/, ':****@')}`);
  await mongoose.connect(mongoUri);

  try {
    const certificates = await Certificate.find().populate('userId', 'fullName email domain');
    console.log(`[Backfill] Found ${certificates.length} total certificates.`);

    let updatedCount = 0;
    const year = new Date().getFullYear();

    for (const cert of certificates) {
      let modified = false;

      // 1. Assign verifyId if missing
      if (!cert.verifyId) {
        cert.verifyId = crypto.randomBytes(6).toString('hex');
        modified = true;
      }

      // 2. Assign UTS- formatted certificateNumber if missing or old format
      if (!cert.certificateNumber || !cert.certificateNumber.startsWith('UTS-')) {
        const counter = await Counter.findOneAndUpdate(
          { _id: 'certificateNumber' },
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );
        cert.certificateNumber = `UTS-${year}-${String(counter.seq).padStart(6, '0')}`;
        modified = true;
      }

      // 3. Snapshot fields (for Task C purged intern compatibility)
      if (!cert.recipientName) {
        cert.recipientName = cert.userId?.fullName || 'Intern';
        modified = true;
      }

      if (!cert.certificateTitle) {
        cert.certificateTitle = getCertificateTitle(cert.certificateType);
        modified = true;
      }

      if (!cert.domain) {
        cert.domain = cert.userId?.domain || '';
        modified = true;
      }

      if (!cert.issuedAt) {
        cert.issuedAt = cert.issuedDate || cert.finalizedAt || cert.createdAt || new Date();
        modified = true;
      }

      // Ensure isRevoked is boolean
      if (typeof cert.isRevoked !== 'boolean') {
        cert.isRevoked = cert.status === 'revoked';
        modified = true;
      }

      if (modified) {
        await cert.save();
        updatedCount += 1;
      }
    }

    console.log(`[Backfill] Successfully updated ${updatedCount} certificates with verifyId, certificateNumber and snapshot fields.`);
    console.log('[Backfill] PDFs were preserved untouched as per specification.');
  } catch (error) {
    console.error('[Backfill] Error during backfill:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('[Backfill] Disconnected from MongoDB.');
  }
};

runBackfill();
