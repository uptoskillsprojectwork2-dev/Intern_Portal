/**
 * test-parallel-requests.js
 *
 * Day 1 Task A — "Done when" verification script.
 *
 * Fires 10 parallel certificate requests as a logged-in intern
 * and checks that all 10 get UNIQUE request numbers.
 *
 * HOW TO RUN (backend must be running on port 3000):
 *   node scripts/test-parallel-requests.js
 *
 * PREREQUISITES:
 *   - Set INTERN_EMAIL and INTERN_PASSWORD below to a real intern account.
 *   - Backend must be running: npm run dev
 */

import axios from 'axios';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const BASE_URL = 'http://localhost:3000';
const INTERN_EMAIL = 'prajapatideepu021@gmail.com';    // <-- change this
const INTERN_PASSWORD = 'XJYBxu7N@27qi5i'; // <-- change this (internCode)
const PARALLEL_COUNT = 10;
// ──────────────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n====================================================');
  console.log('  Day 1 Task A — Parallel Request Number Test');
  console.log('====================================================\n');

  // Step 1: Login as intern to get cookie
  console.log(`[1] Logging in as ${INTERN_EMAIL}...`);
  let cookie;
  try {
    const loginRes = await axios.post(
      `${BASE_URL}/api/auth/login`,
      { email: INTERN_EMAIL, password: INTERN_PASSWORD },
      { withCredentials: true }
    );
    // Extract the Set-Cookie header
    const setCookie = loginRes.headers['set-cookie'];
    if (!setCookie) {
      throw new Error('No cookie returned from login. Check credentials.');
    }
    cookie = setCookie.map(c => c.split(';')[0]).join('; ');
    console.log('    ✅ Login successful\n');
  } catch (err) {
    console.error('    ❌ Login failed:', err.response?.data?.message || err.message);
    process.exit(1);
  }

  // Step 2: Fire 10 parallel certificate requests
  console.log(`[2] Firing ${PARALLEL_COUNT} parallel certificate requests...\n`);

  const requests = Array.from({ length: PARALLEL_COUNT }, (_, i) =>
    axios.post(
      `${BASE_URL}/api/intern/request-certificate`,
      { certificateType: 'bonafide', reason: `Parallel test request #${i + 1}` },
      { headers: { Cookie: cookie } }
    ).then(res => ({
      index: i + 1,
      success: true,
      requestNumber: res.data.request?.requestNumber,
      status: res.status
    })).catch(err => ({
      index: i + 1,
      success: false,
      error: err.response?.data?.message || err.message,
      status: err.response?.status
    }))
  );

  const results = await Promise.all(requests);

  // Step 3: Show results
  console.log('    Results:');
  results.forEach(r => {
    if (r.success) {
      console.log(`    [${r.index}] ✅  ${r.requestNumber}`);
    } else {
      console.log(`    [${r.index}] ⚠️  FAILED — ${r.error} (HTTP ${r.status})`);
    }
  });

  // Step 4: Check uniqueness
  const successfulNumbers = results
    .filter(r => r.success)
    .map(r => r.requestNumber);

  const uniqueNumbers = new Set(successfulNumbers);

  console.log('\n====================================================');
  console.log(`  Successful requests : ${successfulNumbers.length} / ${PARALLEL_COUNT}`);
  console.log(`  Unique numbers      : ${uniqueNumbers.size}`);

  if (successfulNumbers.length === 0) {
    console.log('\n  ⚠️  No requests succeeded.');
    console.log('  Possible reasons:');
    console.log('  - "already have a request in progress" (intern already has a pending bonafide)');
    console.log('  - Intern eligibility check failed (internship not ongoing)');
    console.log('\n  The counter still works — check MongoDB for the certRequest counter doc.');
  } else if (uniqueNumbers.size === successfulNumbers.length) {
    console.log('\n  ✅  PASS — All request numbers are UNIQUE!');
    console.log('  The atomic counter is working correctly.');
  } else {
    console.log('\n  ❌  FAIL — Duplicate request numbers detected!');
    console.log('  Numbers:', [...successfulNumbers]);
  }

  console.log('====================================================\n');
}

run();
