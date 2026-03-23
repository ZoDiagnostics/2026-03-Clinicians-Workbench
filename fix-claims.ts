/**
 * fix-claims.ts — Provision all 5 test users with Firebase Auth custom claims.
 * Also creates any missing Auth users and Firestore user docs.
 *
 * Run from Firebase Studio terminal:
 *   npx tsx fix-claims.ts
 */

import { initializeApp, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK (same pattern as seed-demo.ts)
try {
  initializeApp({ projectId: 'cw-e7c19' });
} catch {
  getApp(); // already initialized
}

const auth = getAuth();
const db = getFirestore();
const PRACTICE_ID = 'practice-gastro-sd-001';

const TEST_USERS = [
  { email: 'clinician@zocw.com', role: 'clinician_auth', displayName: 'Dr. Sarah Chen', firstName: 'Sarah', lastName: 'Chen' },
  { email: 'admin@zocw.com', role: 'admin', displayName: 'Marcus Thompson', firstName: 'Marcus', lastName: 'Thompson' },
  { email: 'staff@zocw.com', role: 'clinical_staff', displayName: 'Sandra Martinez', firstName: 'Sandra', lastName: 'Martinez' },
  { email: 'noauth@zocw.com', role: 'clinician_noauth', displayName: 'Dr. Priya Nair', firstName: 'Priya', lastName: 'Nair' },
  { email: 'clinadmin@zocw.com', role: 'clinician_admin', displayName: 'Dr. James Whitfield', firstName: 'James', lastName: 'Whitfield' },
];

async function fixClaims() {
  console.log('Provisioning all 5 test users...\n');

  for (const user of TEST_USERS) {
    let uid: string;

    // 1. Get or create Firebase Auth user
    try {
      const existing = await auth.getUserByEmail(user.email);
      uid = existing.uid;
      console.log(`${user.email} (uid: ${uid}) — exists`);
      console.log(`  Current claims: ${JSON.stringify(existing.customClaims || {})}`);
    } catch {
      // User doesn't exist — create it
      const created = await auth.createUser({
        email: user.email,
        password: 'password',
        displayName: user.displayName,
      });
      uid = created.uid;
      console.log(`${user.email} (uid: ${uid}) — CREATED`);
    }

    // 2. Set custom claims
    await auth.setCustomUserClaims(uid, {
      role: user.role,
      practiceId: PRACTICE_ID,
    });
    const updated = await auth.getUser(uid);
    console.log(`  Claims set: ${JSON.stringify(updated.customClaims)}`);

    // 3. Ensure Firestore user doc exists
    const userDocRef = db.collection('users').doc(uid);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      await userDocRef.set({
        uid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: true,
        practiceId: PRACTICE_ID,
        clinicIds: ['clinic_main'],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      console.log(`  Firestore doc CREATED`);
    } else {
      console.log(`  Firestore doc exists`);
    }

    console.log(`  Done\n`);
  }

  console.log('All 5 users provisioned. Password for all: "password"');
}

fixClaims().catch(console.error);
