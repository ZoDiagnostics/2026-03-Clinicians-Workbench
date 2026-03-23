/**
 * fix-claims.ts — One-shot script to set Firebase Auth custom claims on all test users.
 *
 * Root cause: seed-demo.ts only set claims for clinician@zocw.com on first creation.
 * The other 3 test users (admin, staff, noauth) had roles in Firestore docs but NOT
 * as Firebase Auth custom claims. The useAuth() hook requires claims.role and
 * claims.practiceId in the ID token — without them, login bounces after ~15s.
 *
 * Run from Firebase Studio terminal:
 *   npx tsx fix-claims.ts
 */

import { initializeApp, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK (same pattern as seed-demo.ts)
try {
  initializeApp({ projectId: 'cw-e7c19' });
} catch {
  getApp(); // already initialized
}

const auth = getAuth();
const PRACTICE_ID = 'practice-gastro-sd-001';

const TEST_USERS = [
  { email: 'clinician@zocw.com', role: 'clinician_auth' },
  { email: 'admin@zocw.com', role: 'admin' },
  { email: 'staff@zocw.com', role: 'clinical_staff' },
  { email: 'noauth@zocw.com', role: 'clinician_noauth' },
];

async function fixClaims() {
  console.log('Setting custom claims on all test users...\n');

  for (const user of TEST_USERS) {
    try {
      const userRecord = await auth.getUserByEmail(user.email);
      const existingClaims = userRecord.customClaims;

      console.log(`${user.email} (uid: ${userRecord.uid})`);
      console.log(`  Current claims: ${JSON.stringify(existingClaims || {})}`);

      await auth.setCustomUserClaims(userRecord.uid, {
        role: user.role,
        practiceId: PRACTICE_ID,
      });

      // Verify
      const updated = await auth.getUser(userRecord.uid);
      console.log(`  Updated claims: ${JSON.stringify(updated.customClaims)}`);
      console.log(`  Done\n`);
    } catch (err: any) {
      console.error(`  Failed for ${user.email}: ${err.message}\n`);
    }
  }

  console.log('All claims set. Users must sign out and back in (or wait for token refresh) to pick up new claims.');
}

fixClaims().catch(console.error);
