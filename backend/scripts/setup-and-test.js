/**
 * setup-and-test.js
 *
 * Day 1 Task A — Full setup + parallel test in one script.
 *
 * What this does:
 *  1. Connects directly to MongoDB
 *  2. Creates a test admin (if not already exists)
 *  3. Creates a test intern (if not already exists)
 *  4. Logs in as intern via API
 *  5. Fires 10 parallel certificate requests
 *  6. Verifies all request numbers are unique
 *
 * HOW TO RUN (backend must be running on port 3000):
 *   node scripts/setup-and-test.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'testadmin@uptoskills.com';
const ADMIN_PASS = 'Admin@123456';
const TL_EMAIL = 'testtl@uptoskills.com';
const TL_PASS = 'TL@123456';
const INTERN_EMAIL = 'testintern@uptoskills.com';
const INTERN_PASS = 'Intern@123456';
const PARALLEL_COUNT = 10;
// ──────────────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n====================================================');
  console.log('  Day 1 Task A — Setup & Parallel Request Test');
  console.log('====================================================\n');

  // ── Step 1: Connect to MongoDB directly ──────────────────────────────────
  console.log('[1] Connecting to MongoDB...');
  if (!process.env.MONGO_URI) {
    console.error('    ❌ MONGO_URI not found in .env file!');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log('    ✅ MongoDB connected\n');

  // ── Import models (after mongoose connect) ────────────────────────────────
  const { default: User } = await import('../src/models/User.js');
  const { default: CertificateRequest } = await import('../src/models/CertificateRequest.js');

  // ── Step 2: Create test admin if not exists ───────────────────────────────
  console.log('[2] Checking/creating test admin...');
  let admin = await User.findOne({ email: ADMIN_EMAIL });
  if (!admin) {
    admin = await User.create({
      fullName: 'Test Admin',
      email: ADMIN_EMAIL,
      password: ADMIN_PASS,
      role: 'admin',
      mobileNo: '9000000001'
    });
    console.log('    ✅ Admin created:', ADMIN_EMAIL);
  } else {
    console.log('    ✅ Admin already exists:', ADMIN_EMAIL);
  }

  // ── Step 3: Create test team leader if not exists ─────────────────────────
  console.log('[3] Checking/creating test team leader...');
  let tl = await User.findOne({ email: TL_EMAIL });
  if (!tl) {
    tl = await User.create({
      fullName: 'Test Team Leader',
      email: TL_EMAIL,
      password: TL_PASS,
      role: 'teamleader',
      mobileNo: '9000000002'
    });
    console.log('    ✅ Team leader created:', TL_EMAIL);
  } else {
    console.log('    ✅ Team leader already exists:', TL_EMAIL);
  }

  // ── Step 4: Create test intern if not exists ──────────────────────────────
  console.log('[4] Checking/creating test intern...');
  let intern = await User.findOne({ email: INTERN_EMAIL });
  let internCode;
  if (!intern) {
    const { generateInternCode } = await import('../src/utils/generateInternCode.js');
    internCode = await generateInternCode();
    intern = await User.create({
      fullName: 'Test Intern',
      email: INTERN_EMAIL,
      password: internCode,
      role: 'intern',
      internCode,
      domain: 'Web Development',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      mobileNo: '9000000003',
      internshipDetails: {
        teamLeader: tl._id,
        teamleaderEmail: TL_EMAIL,
        status: 'ongoing',
        createdBy: admin._id
      }
    });
    console.log(`    ✅ Intern created: ${INTERN_EMAIL}`);
    console.log(`    🔑 Intern password (internCode): ${internCode}`);
  } else {
    internCode = intern.internCode;
    // Ensure internship status is ongoing for the test
    if (intern.internshipDetails?.status !== 'ongoing') {
      intern.internshipDetails = intern.internshipDetails || {};
      intern.internshipDetails.status = 'ongoing';
      await intern.save();
    }
    console.log(`    ✅ Intern already exists: ${INTERN_EMAIL}`);
    console.log(`    🔑 InternCode: ${internCode}`);
  }

  // ── Step 5: Clear existing pending requests for this intern (clean test) ──
  console.log('\n[5] Clearing old pending/processing requests for test intern...');
  const deleted = await CertificateRequest.deleteMany({
    userId: intern._id,
    status: { $in: ['pending', 'processing'] }
  });
  console.log(`    ✅ Cleared ${deleted.deletedCount} old requests\n`);

  // ── Step 6: Disconnect MongoDB (server will use its own connection) ────────
  await mongoose.disconnect();

  // ── Step 7: Login via API ─────────────────────────────────────────────────
  console.log(`[6] Logging in as intern via API (${INTERN_EMAIL})...`);
  let cookie;
  try {
    const loginRes = await axios.post(
      `${BASE_URL}/api/auth/login`,
      { email: INTERN_EMAIL, password: internCode },
      { withCredentials: true }
    );
    const setCookie = loginRes.headers['set-cookie'];
    if (!setCookie) throw new Error('No cookie in login response');
    cookie = setCookie.map(c => c.split(';')[0]).join('; ');
    console.log('    ✅ Login successful\n');
  } catch (err) {
    console.error('    ❌ Login failed:', err.response?.data?.message || err.message);
    process.exit(1);
  }

  // ── Step 8: Fire 10 parallel requests ────────────────────────────────────
  console.log(`[7] Firing ${PARALLEL_COUNT} parallel certificate requests...\n`);

  // Use different types to bypass the "one pending per type" check
  const certTypes = [
    'bonafide', 'offer_letter', 'ojt_certificate',
    'intern_of_month', 'league_winner', 'custom',
    'bonafide', 'offer_letter', 'ojt_certificate', 'custom'
  ];

  const requests = Array.from({ length: PARALLEL_COUNT }, (_, i) =>
    axios.post(
      `${BASE_URL}/api/intern/request-certificate`,
      { certificateType: certTypes[i], reason: `Parallel test #${i + 1}` },
      { headers: { Cookie: cookie } }
    ).then(res => ({
      index: i + 1,
      success: true,
      requestNumber: res.data.request?.requestNumber,
      type: certTypes[i]
    })).catch(err => ({
      index: i + 1,
      success: false,
      error: err.response?.data?.message || err.message,
      type: certTypes[i]
    }))
  );

  const results = await Promise.all(requests);

  // ── Step 9: Print results ─────────────────────────────────────────────────
  console.log('    Results:');
  results.forEach(r => {
    if (r.success) {
      console.log(`    [${r.index}] ✅  ${r.requestNumber}  (${r.type})`);
    } else {
      console.log(`    [${r.index}] ⚠️  FAILED (${r.type}) — ${r.error}`);
    }
  });

  const successfulNumbers = results.filter(r => r.success).map(r => r.requestNumber);
  const uniqueNumbers = new Set(successfulNumbers);

  console.log('\n====================================================');
  console.log(`  Total requests     : ${PARALLEL_COUNT}`);
  console.log(`  Succeeded          : ${successfulNumbers.length}`);
  console.log(`  Unique numbers     : ${uniqueNumbers.size}`);

  if (successfulNumbers.length > 0 && uniqueNumbers.size === successfulNumbers.length) {
    console.log('\n  ✅  PASS — All request numbers are UNIQUE!');
    console.log('     Atomic counter is working correctly.');
  } else if (successfulNumbers.length === 0) {
    console.log('\n  ⚠️  No requests succeeded. Check intern eligibility or server logs.');
  } else {
    console.log('\n  ❌  FAIL — Duplicate request numbers found!');
  }

  console.log('====================================================\n');
}

run().catch(err => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
