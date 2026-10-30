import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import Certificate from '../src/models/Certificate.js';
import '../src/models/User.js';
import { verifyPublicCertificate } from '../src/controllers/public.controller.js';

dotenv.config();

const apply = process.argv.includes('--apply');
const verifyOnly = process.argv.includes('--verify');
let connected = false;
const newVerificationId = () => `VER-${randomBytes(24).toString('hex').toUpperCase()}`;

function resolveMongoUri() {
  const configured = new URL(process.env.MONGO_URI);
  if (configured.protocol !== 'mongodb+srv:' || !process.env.MONGO_SEED_HOSTS) return process.env.MONGO_URI;

  const query = new URLSearchParams(configured.search);
  for (const [key, value] of new URLSearchParams(process.env.MONGO_SRV_OPTIONS || '')) {
    if (!query.has(key)) query.set(key, value);
  }
  if (!query.has('tls') && !query.has('ssl')) query.set('tls', 'true');
  const auth = configured.username
    ? `${configured.username}${configured.password ? `:${configured.password}` : ''}@`
    : '';
  const hosts = process.env.MONGO_SEED_HOSTS.split(',').map((host) => `${host.trim()}:27017`).join(',');
  return `mongodb://${auth}${hosts}${configured.pathname || '/'}?${query.toString()}`;
}

try {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI must be configured.');
  let connectionTimer;
  try {
    const connection = mongoose.connect(resolveMongoUri(), { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 });
    connection.catch(() => {});
    await Promise.race([
      connection,
      new Promise((_, reject) => { connectionTimer = setTimeout(() => reject(new Error('Database connection check timed out after 10 seconds.')), 10000); }),
    ]);
  } finally {
    clearTimeout(connectionTimer);
  }
  connected = true;
  const query = { $or: [
    { verificationCode: { $exists: false } },
    { verificationCode: null },
    { verificationCode: '' },
    { verificationIdVersion: { $exists: false } },
  ] };
  if (verifyOnly) {
    const migrated = await Certificate.collection.find({ verificationIdVersion: 1 }).toArray();
    const codes = migrated.map(({ verificationCode }) => verificationCode);
    const codesAreValid = codes.every((code) => typeof code === 'string' && /^VER-[A-F\d]{32,48}$/.test(code));
    const codesAreUnique = new Set(codes).size === codes.length;
    if (!codesAreValid || !codesAreUnique) throw new Error('Post-backfill verification found missing, malformed, or duplicate IDs.');
    for (const certificate of migrated) {
      const response = {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
      };
      await verifyPublicCertificate({ params: { verificationId: certificate.verificationCode } }, response);
      if (response.statusCode !== 200 || response.body?.valid !== true) {
        throw new Error(`Public verification failed for certificate record ${certificate._id}.`);
      }
    }
    console.log(`Verified ${migrated.length} legacy records have unique random IDs and pass the public verification controller.`);
  } else {
    const certificates = await Certificate.collection.find(query).toArray();
    console.log(`${apply ? 'Applying' : 'Dry run:'} ${certificates.length} certificate verification ID backfill(s).`);
    for (const certificate of certificates) {
      console.log(`record ${certificate._id} | ${certificate.status || 'status missing'} | version ${certificate.verificationIdVersion ?? 'missing'} -> 1 | verificationCode ${certificate.verificationCode ? 'preserved' : 'will generate'} | certificateNumber ${certificate.certificateNumber ? 'present' : 'absent'}`);
    }

    if (apply) {
      for (const certificate of certificates) {
        const update = { $set: { verificationIdVersion: 1 } };
        if (!certificate.verificationCode) {
          let verificationCode;
          do { verificationCode = newVerificationId(); }
          while (await Certificate.exists({ verificationCode }));
          update.$set.verificationCode = verificationCode;
        }
        await Certificate.collection.updateOne(
          { _id: certificate._id },
          update
        );
        console.log(`Backfilled record ${certificate._id}`);
      }
    } else {
      console.log('Run with --apply to write the generated IDs.');
    }
  }
} catch (error) {
  console.error(`Certificate verification ID backfill failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (connected) await mongoose.disconnect();
  else if (process.exitCode) process.exit(process.exitCode);
}
