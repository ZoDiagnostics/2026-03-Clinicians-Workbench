/**
 * Minimal script to set custom claims on the clinadmin@zocw.com account.
 * Run with: npx tsx set-clinadmin-claims.ts
 *
 * Requires: gcloud auth application-default login (run first if you get credential errors)
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

initializeApp({ projectId: 'cw-e7c19' });
const auth = getAuth();

const PRACTICE_ID = 'practice_abc123';

async function main() {
  const accounts = [
    { email: 'clinadmin@zocw.com', role: 'clinician_admin' },
    { email: 'admin@zocw.com', role: 'admin' },
    { email: 'staff@zocw.com', role: 'clinical_staff' },
    { email: 'noauth@zocw.com', role: 'clinician_noauth' },
    { email: 'clinician@zocw.com', role: 'clinician_auth' },
  ];

  for (const { email, role } of accounts) {
    try {
      const user = await auth.getUserByEmail(email);
      await auth.setCustomUserClaims(user.uid, { role, practiceId: PRACTICE_ID });
      console.log(`✅ ${email} → ${role} (uid: ${user.uid})`);
    } catch (err: any) {
      console.log(`❌ ${email} — ${err.message}`);
    }
  }
  console.log('\nDone. Claims will take effect on next login (or force token refresh).');
}

main();
