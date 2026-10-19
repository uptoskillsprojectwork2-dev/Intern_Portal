/**
 * Backfill script for Task F: Certificate Verification IDs
 *
 * Assigns certificateNumber (UTS-format), verifyId, and snapshot fields
 * (recipientName, certificateTitle) to certificates finalized before
 * Task F was deployed.
 *
 * - Does NOT regenerate PDFs (already emailed ones have no QR code).
 * - Idempotent: safe to run multiple times.
 *
 * Usage:
 *   node scripts/backfillCertificateIds.js
 */

import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config();

/* ───────────────────────── Models ───────────────────────── */

import Certificate from '../src/models/Certificate.js';
import Counter from '../src/models/Counter.js';
import User from '../src/models/User.js';
import CertificateTemplate from '../src/models/CertificateTemplate.js';

/* ───────────────────── Certificate title map ──────────────── */

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

function getCertificateTitle(type) {
  if (!type) return 'Certificate';
  return (
    CERTIFICATE_TITLE_MAP[type] ||
    type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function generateVerifyId() {
  return crypto.randomBytes(9).toString('base64url').slice(0, 12);
}

/* ─────────────────────── Main ──────────────────────────── */

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('[backfill] Connected to MongoDB.');

  // Find finalized certificates that are missing verifyId or snapshot fields
  const certs = await Certificate.find({
    status: { $in: ['finalized', 'generated', 'issued'] },
    $or: [
      { verifyId: { $exists: false } },
      { verifyId: null },
      { verifyId: '' },
      { recipientName: { $exists: false } },
      { recipientName: null },
      { recipientName: '' },
    ],
  });

  console.log(`[backfill] Found ${certs.length} certificate(s) to backfill.`);

  let updated = 0;
  let skipped = 0;

  for (const cert of certs) {
    let changed = false;

    // --- verifyId ---
    if (!cert.verifyId) {
      cert.verifyId = generateVerifyId();
      changed = true;
    }

    // --- certificateNumber (migrate old CERT- prefix to UTS-) ---
    if (!cert.certificateNumber || cert.certificateNumber.startsWith('CERT-')) {
      const year = new Date().getFullYear();
      const counter = await Counter.findOneAndUpdate(
        { _id: 'certificateNumber' },
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true }
      );
      cert.certificateNumber = `UTS-${year}-${String(counter.seq).padStart(6, '0')}`;
      changed = true;
    }

    // --- recipientName snapshot ---
    if (!cert.recipientName) {
      const user = await User.findById(cert.userId).select('fullName').lean();
      cert.recipientName = user?.fullName || '';
      changed = true;
    }

    // --- certificateTitle snapshot ---
    if (!cert.certificateTitle) {
      cert.certificateTitle = getCertificateTitle(cert.certificateType);
      changed = true;
    }

    // --- domain snapshot ---
    if (!cert.domain) {
      const user = await User.findById(cert.userId).select('domain').lean();
      if (user?.domain) {
        cert.domain = user.domain;
        changed = true;
      }
    }

    if (changed) {
      await cert.save();
      updated++;
      console.log(`  ✓ ${cert.certificateNumber} → verifyId=${cert.verifyId}`);
    } else {
      skipped++;
    }
  }

  console.log(`[backfill] Done. Updated: ${updated}, Skipped: ${skipped}.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[backfill] Fatal error:', err);
  process.exit(1);
});
