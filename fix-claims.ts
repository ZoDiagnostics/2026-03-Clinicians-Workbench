/**
 * fix-claims.ts — One-shot script to set Firebase Auth custom claims on all test users.
 *
 * Root cause: seed-demo.ts only sets claims for clinician@zocw.com on first creation.
 * The other 3 test users (admin, staff, noauth) have roles in Firestore docs but NOT
 * as Firebase Auth custom claims. The useAuth() hook requires claims.role and
 * claims.practiceId in the ID token — without them, login succeeds but the app
 * redirects back to /login after ~15 seconds of "Loading...".
 *
 * Run from Firebase Studio terminal:
 *   npx tsx fix-claims.ts
 */

import * as admin from 'firebase-admin';

// Initialize with default credentials (Firebase Studio provides these)
if (!admin.apps.length) {
  admin.initializeApp();
}

const auth = admin.auth();
const PRACTICE_ID = 'practice-gastro-sd-001';

interface UserClaims {
  email: string;
  role: string;
  practiceId: string;
}

const TEST_USERS: UserClaims[] = [
  { email: 'clinician@zocw.com', role: 'clinician_auth', practiceId: PRACTICE_ID },
  { email: 'admin@zocw.com', role: 'admin', practiceId: PRACTICE_ID },
  { email: 'staff@zocw.com', role: 'clinical_staff', practiceId: PRACTICE_ID },
  { email: 'noauth@zocw.com', role: 'clinician_noauth', practiceId: PRACTICE_ID },
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
        practiceId: user.practiceId,
      });

      // Verify
      const updated = await auth.getUser(userRecord.uid);
      console.log(`  Updated claims: ${JSON.stringify(updated.customClaims)}`);
      console.log(`  ✓ Done\n`);
    } catch (err: any) {
      console.error(`  ✗ Failed for ${user.email}: ${err.message}\n`);
    }
  }

  console.log('All claims set. Users must sign out and sign back in (or wait for token refresh) to pick up new claims.');
}

fixClaims().catch(console.error);
