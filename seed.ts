import { initializeApp, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { faker } from '@faker-js/faker';
import 'dotenv/config';

// Initialize Firebase Admin SDK using Application Default Credentials.
try {
    initializeApp({
        projectId: 'cw-e7c19',
    });
    console.log("Firebase Admin SDK initialized successfully with project cw-e7c19.");
} catch (error: any) {
    if (error.code !== 'app/duplicate-app') {
        console.error("Firebase Admin SDK initialization failed.", error);
        process.exit(1);
    } else {
        console.log("Firebase Admin SDK already initialized.");
    }
}

const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

const PRACTICE_ID = 'practice_abc123';
const CLINICIAN_EMAIL = 'clinician@zocw.com';
const CLINICIAN_PASSWORD = 'password';

const COLLECTIONS_ADMIN = {
    PATIENTS: 'patients',
    PROCEDURES: 'procedures',
    PRACTICES: 'practices',
};

async function seed() {
  console.log('Starting database seed with Admin SDK...');

  const batch = db.batch();

  // 1. Create Practice
  const practiceRef = db.collection(COLLECTIONS_ADMIN.PRACTICES).doc(PRACTICE_ID);
  batch.set(practiceRef, {
    name: 'Gastroenterology Associates (from Admin Seed)',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  console.log(`Practice document prepared for ${PRACTICE_ID}`);

  // 2. Create Patients
  const patientIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const patientId = faker.string.uuid();
    patientIds.push(patientId);
    const patientRef = db.collection(COLLECTIONS_ADMIN.PATIENTS).doc(patientId);
    batch.set(patientRef, {
      id: patientId,
      practiceId: PRACTICE_ID,
      mrn: faker.string.alphanumeric(8).toUpperCase(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      dateOfBirth: Timestamp.fromDate(faker.date.past({ years: 40, refDate: '2000-01-01' })),
      sex: faker.helpers.arrayElement(['male', 'female']),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      preferredLanguage: 'en',
      isArchived: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: 'seed_script_admin',
    });
  }
  console.log('3 Patient documents prepared for batch.');

  // 3. Create Clinician User with Custom Claims (before procedures so we can assign them)
  let uid: string;
  try {
    const userRecord = await auth.createUser({
      email: CLINICIAN_EMAIL,
      password: CLINICIAN_PASSWORD,
      emailVerified: true,
      displayName: 'Test Clinician',
    });
    uid = userRecord.uid;
    console.log(`Successfully created new user: ${CLINICIAN_EMAIL} with UID: ${uid}`);
    
    await auth.setCustomUserClaims(uid, { role: 'clinician_auth', practiceId: PRACTICE_ID });
    console.log('Custom claims set successfully.');

  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      console.log(`User ${CLINICIAN_EMAIL} already exists. Fetching user to set claims.`);
      const user = await auth.getUserByEmail(CLINICIAN_EMAIL);
      uid = user.uid;
      await auth.setCustomUserClaims(uid, { role: 'clinician_auth', practiceId: PRACTICE_ID });
      console.log(`Custom claims set for existing user ${uid}.`);
    } else {
      console.error('Error creating user:', error);
      return;
    }
  }

  // 4. Create Procedures (now uid is available for assignedClinicianId)
  const statuses = ['capsule_return_pending', 'capsule_received', 'ready_for_review', 'draft', 'completed'];
  for (let i = 0; i < 5; i++) {
    const procedureId = faker.string.uuid();
    const procedureRef = db.collection(COLLECTIONS_ADMIN.PROCEDURES).doc(procedureId);
    batch.set(procedureRef, {
      id: procedureId,
      patientId: faker.helpers.arrayElement(patientIds),
      practiceId: PRACTICE_ID,
      clinicId: 'clinic_default',
      assignedClinicianId: uid,
      status: statuses[i],
      studyType: faker.helpers.arrayElement(['sb_diagnostic', 'upper_gi', 'crohns_monitor', 'colon_eval']),
      urgency: faker.helpers.arrayElement(['routine', 'urgent']),
      indications: [faker.lorem.sentence()],
      contraindications: {
        hasPacemaker: false,
        hasSwallowingDisorder: false,
        hasBowelObstruction: false,
        hasKnownAllergy: false,
        reviewedAt: Timestamp.now(),
        reviewedBy: uid,
      },
      preProcedureChecks: [],
      preReviewConfig: {
        studyType: 'sb_diagnostic',
        crohnsMode: false,
        sensitivityThreshold: 50,
        configuredAt: Timestamp.now(),
        configuredBy: uid,
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: uid,
    });
  }
  console.log('5 Procedure documents prepared for batch.');

  // Commit the batch
  await batch.commit();
  console.log('Firestore batch commit successful. Seed data written.');

  // 5. Verification
  console.log('Verifying seeded data...');
  const patientsSnapshot = await db.collection(COLLECTIONS_ADMIN.PATIENTS).where('practiceId', '==', PRACTICE_ID).get();
  const proceduresSnapshot = await db.collection(COLLECTIONS_ADMIN.PROCEDURES).where('practiceId', '==', PRACTICE_ID).get();
  
  console.log(`Verification - Found ${patientsSnapshot.size} patients (expected >= 3).`);
  console.log(`Verification - Found ${proceduresSnapshot.size} procedures (expected >= 5).`);

  if (patientsSnapshot.size >= 3 && proceduresSnapshot.size >= 5) {
    console.log('Seed verification successful!');
  } else {
    console.error('Seed verification failed. Check Firestore data and script logs.');
  }
}

seed().catch(err => {
  console.error('CRITICAL: Seeding script failed.', err);
  process.exit(1);
});
