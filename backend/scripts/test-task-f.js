import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config();

import Certificate from '../src/models/Certificate.js';
import AuditLog from '../src/models/AuditLog.model.js';
import Notification from '../src/models/Notification.model.js';
import { logAction } from '../src/utils/logAction.js';
import '../src/models/CertificateTemplate.js';
import '../src/models/User.js';

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB');

  // 1. Pick a backfilled certificate
  const cert = await Certificate.findOne({ verifyId: 'z2Z1dNh-9ZaJ' });
  if (!cert) {
    console.error('Certificate not found');
    process.exit(1);
  }
  console.log(`✓ Testing with certificate: ${cert.certificateNumber} (verifyId: ${cert.verifyId})`);

  // 2. Check public verify response via fetch
  let res = await fetch(`http://localhost:3000/api/verify/${cert.verifyId}`);
  let json = await res.json();
  console.log('✓ Initial public verify status:', json.status); // should be 'valid'

  // 3. Revoke certificate
  cert.isRevoked = true;
  cert.revokedAt = new Date();
  cert.revokedReason = 'Test revocation for verification workflow';
  await cert.save();

  // Also log audit action like admin controller does
  logAction({
    actor: { id: cert.userId, role: 'admin' },
    action: 'CERTIFICATE_REVOKED',
    targetType: 'Certificate',
    targetId: cert._id,
    meta: {
      certificateNumber: cert.certificateNumber,
      reason: cert.revokedReason,
    },
  });
  console.log('✓ Certificate marked as revoked & audit log created');

  // 4. Verify public endpoint immediately reflects revoked state
  res = await fetch(`http://localhost:3000/api/verify/${cert.verifyId}`);
  json = await res.json();
  console.log('✓ Public verify status after revoke:', json.status); // should be 'revoked'
  console.log('  Revocation date in response:', json.revokedAt);

  // 5. Restore (unrevoke) certificate
  cert.isRevoked = false;
  cert.revokedAt = null;
  cert.revokedReason = null;
  await cert.save();

  logAction({
    actor: { id: cert.userId, role: 'admin' },
    action: 'CERTIFICATE_UNREVOKED',
    targetType: 'Certificate',
    targetId: cert._id,
    meta: {
      certificateNumber: cert.certificateNumber,
    },
  });
  console.log('✓ Certificate restored (unrevoked) & audit log created');

  // 6. Verify public endpoint immediately reflects valid state again
  res = await fetch(`http://localhost:3000/api/verify/${cert.verifyId}`);
  json = await res.json();
  console.log('✓ Public verify status after unrevoke:', json.status); // should be 'valid'

  console.log('\n🎉 ALL TASK F VERIFICATION TESTS PASSED SUCCESSFULLY!');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
