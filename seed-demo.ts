/**
 * ZoCW Demo Data Seed Script
 * Creates comprehensive test data across ALL collections to validate every screen.
 * Run with: npx tsx seed-demo.ts
 *
 * IMPORTANT: This creates demo data on top of existing data.
 * To start fresh, delete collections in Firebase Console first.
 */

import { initializeApp, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { faker } from '@faker-js/faker';
import 'dotenv/config';

// Initialize Firebase Admin SDK
try {
  initializeApp({ projectId: 'cw-e7c19' });
  console.log('Firebase Admin SDK initialized.');
} catch (error: any) {
  if (error.code !== 'app/duplicate-app') {
    console.error('Init failed:', error);
    process.exit(1);
  }
}

const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

const PRACTICE_ID = 'practice_abc123';
const CLINIC_ID = 'clinic_main';

async function seedDemo() {
  console.log('=== Starting Comprehensive Demo Seed ===\n');

  // Get or create the clinician user
  let clinicianUid: string;
  try {
    const user = await auth.getUserByEmail('clinician@zocw.com');
    clinicianUid = user.uid;
    console.log(`Using existing clinician: ${clinicianUid}`);
  } catch {
    const user = await auth.createUser({
      email: 'clinician@zocw.com',
      password: 'password',
      displayName: 'Dr. Sarah Chen',
    });
    clinicianUid = user.uid;
    await auth.setCustomUserClaims(clinicianUid, { role: 'clinician_auth', practiceId: PRACTICE_ID });
    console.log(`Created clinician: ${clinicianUid}`);
  }

  // Get Cameron's UID if exists
  let cameronUid: string | null = null;
  try {
    const cameron = await auth.getUserByEmail('cameron.plummer@gmail.com');
    cameronUid = cameron.uid;
    console.log(`Found Cameron: ${cameronUid}`);
  } catch {
    console.log('Cameron account not found, skipping.');
  }

  const batch1 = db.batch();

  // 1. Practice
  console.log('\n--- Seeding Practice ---');
  batch1.set(db.collection('practices').doc(PRACTICE_ID), {
    name: 'Gastroenterology Associates of San Diego',
    npiNumber: '1234567890',
    address: { street: '4321 Medical Center Dr', city: 'San Diego', state: 'CA', postalCode: '92121', country: 'US' },
    phone: '(858) 555-0100',
    timezone: 'America/Los_Angeles',
    defaultLanguage: 'en',
    subscription: { tier: 'professional', isActive: true, startDate: Timestamp.now(), renewalDate: Timestamp.fromDate(new Date('2027-03-01')), monthlyProcedureLimit: 500, currentMonthUsage: 47, billingEmail: 'billing@gastrosd.com', billingContactName: 'Lisa Martinez' },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  // 2. Clinic
  batch1.set(db.collection('practices').doc(PRACTICE_ID).collection('clinics').doc(CLINIC_ID), {
    id: CLINIC_ID,
    practiceId: PRACTICE_ID,
    name: 'Main Clinic - La Jolla',
    address: { street: '4321 Medical Center Dr', city: 'San Diego', state: 'CA', postalCode: '92121', country: 'US' },
    phone: '(858) 555-0100',
    staffIds: [clinicianUid, cameronUid].filter(Boolean),
    capsuleInventory: [],
    isActive: true,
    createdAt: Timestamp.now(),
  });

  batch1.set(db.collection('practices').doc(PRACTICE_ID).collection('clinics').doc('clinic_north'), {
    id: 'clinic_north',
    practiceId: PRACTICE_ID,
    name: 'North County Satellite',
    address: { street: '789 Rancho Bernardo Rd', city: 'San Diego', state: 'CA', postalCode: '92127', country: 'US' },
    phone: '(858) 555-0200',
    staffIds: [clinicianUid],
    capsuleInventory: [],
    isActive: true,
    createdAt: Timestamp.now(),
  });

  // 3. Practice Settings
  batch1.set(db.collection('practices').doc(PRACTICE_ID).collection('settings').doc('default'), {
    id: 'default',
    practiceId: PRACTICE_ID,
    allowUnscheduledProcedures: true,
    defaultFromEmail: 'noreply@gastrosd.com',
    reportBranding: { logoUrl: '', footerText: 'Gastroenterology Associates of San Diego' },
    deliveryDefaults: { defaultMethods: ['pdf_download', 'email_referring'], autoCheckPatientEmail: true, autoCheckReferringEmail: true, defaultRecipients: [], preferredFormat: 'pdf' },
    incidentalSensitivityThreshold: 70,
    notificationConfig: { includePhiInNotifications: false, defaultChannels: ['in_app', 'email'], globalQuietHoursEnabled: true, globalQuietHoursStart: '22:00', globalQuietHoursEnd: '07:00' },
    phiMaskingRules: [],
    recalledCapsuleLots: [],
    reportTemplates: { sb_diagnostic: 'template_sb', upper_gi: 'template_ugi', crohns_monitor: 'template_crohns', colon_eval: 'template_colon' },
    annotationTemplates: [],
    updatedAt: Timestamp.now(),
    updatedBy: clinicianUid,
  });

  // 4. Staff/Users
  console.log('--- Seeding Staff ---');
  const staffMembers = [
    { uid: clinicianUid, firstName: 'Sarah', lastName: 'Chen', email: 'clinician@zocw.com', role: 'clinician_auth' },
    { uid: 'staff_nurse_01', firstName: 'Maria', lastName: 'Rodriguez', email: 'maria.r@gastrosd.com', role: 'clinical_staff' },
    { uid: 'staff_tech_01', firstName: 'James', lastName: 'Wilson', email: 'james.w@gastrosd.com', role: 'clinical_staff' },
    { uid: 'dr_admin_01', firstName: 'Robert', lastName: 'Kim', email: 'robert.k@gastrosd.com', role: 'clinician_admin' },
  ];

  for (const staff of staffMembers) {
    batch1.set(db.collection('users').doc(staff.uid), {
      uid: staff.uid,
      practiceId: PRACTICE_ID,
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      role: staff.role,
      clinicIds: [CLINIC_ID],
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }

  if (cameronUid) {
    batch1.set(db.collection('users').doc(cameronUid), {
      uid: cameronUid,
      practiceId: PRACTICE_ID,
      firstName: 'Cameron',
      lastName: 'Plummer',
      email: 'cameron.plummer@gmail.com',
      role: 'clinician_admin',
      clinicIds: [CLINIC_ID, 'clinic_north'],
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }

  await batch1.commit();
  console.log('Batch 1 committed (practice, clinics, settings, staff).');

  // 5. Patients (10 realistic patients)
  console.log('\n--- Seeding Patients ---');
  const batch2 = db.batch();
  const patientIds: string[] = [];
  const patientNames = [
    { first: 'Jennifer', last: 'Martinez', sex: 'female' },
    { first: 'Michael', last: 'Thompson', sex: 'male' },
    { first: 'Emily', last: 'Davis', sex: 'female' },
    { first: 'David', last: 'Wilson', sex: 'male' },
    { first: 'Sarah', last: 'Johnson', sex: 'female' },
    { first: 'Robert', last: 'Brown', sex: 'male' },
    { first: 'Lisa', last: 'Anderson', sex: 'female' },
    { first: 'William', last: 'Taylor', sex: 'male' },
    { first: 'Amanda', last: 'Garcia', sex: 'female' },
    { first: 'Christopher', last: 'Lee', sex: 'male' },
  ];

  for (const patient of patientNames) {
    const id = faker.string.uuid();
    patientIds.push(id);
    batch2.set(db.collection('patients').doc(id), {
      id,
      practiceId: PRACTICE_ID,
      mrn: `MRN${faker.string.numeric(6)}`,
      firstName: patient.first,
      lastName: patient.last,
      dateOfBirth: Timestamp.fromDate(faker.date.past({ years: 40, refDate: '2000-01-01' })),
      sex: patient.sex,
      email: `${patient.first.toLowerCase()}.${patient.last.toLowerCase()}@email.com`,
      phone: faker.phone.number(),
      preferredLanguage: 'en',
      isArchived: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: clinicianUid,
    });
  }

  await batch2.commit();
  console.log(`10 patients created.`);

  // 6. Procedures (15 procedures across all statuses)
  console.log('\n--- Seeding Procedures ---');
  const batch3 = db.batch();
  const procedureConfigs = [
    { status: 'capsule_return_pending', studyType: 'sb_diagnostic', urgency: 'routine' },
    { status: 'capsule_return_pending', studyType: 'upper_gi', urgency: 'urgent' },
    { status: 'capsule_received', studyType: 'crohns_monitor', urgency: 'routine' },
    { status: 'capsule_received', studyType: 'sb_diagnostic', urgency: 'routine' },
    { status: 'ready_for_review', studyType: 'sb_diagnostic', urgency: 'routine' },
    { status: 'ready_for_review', studyType: 'colon_eval', urgency: 'urgent' },
    { status: 'ready_for_review', studyType: 'upper_gi', urgency: 'routine' },
    { status: 'draft', studyType: 'sb_diagnostic', urgency: 'routine' },
    { status: 'draft', studyType: 'crohns_monitor', urgency: 'routine' },
    { status: 'appended_draft', studyType: 'sb_diagnostic', urgency: 'routine' },
    { status: 'completed', studyType: 'sb_diagnostic', urgency: 'routine' },
    { status: 'completed', studyType: 'upper_gi', urgency: 'routine' },
    { status: 'completed', studyType: 'colon_eval', urgency: 'routine' },
    { status: 'completed_appended', studyType: 'sb_diagnostic', urgency: 'routine' },
    { status: 'closed', studyType: 'sb_diagnostic', urgency: 'routine' },
  ];

  const procedureIds: string[] = [];
  for (let i = 0; i < procedureConfigs.length; i++) {
    const config = procedureConfigs[i];
    const id = faker.string.uuid();
    procedureIds.push(id);
    const daysAgo = Math.floor(Math.random() * 30);

    batch3.set(db.collection('procedures').doc(id), {
      id,
      patientId: patientIds[i % patientIds.length],
      practiceId: PRACTICE_ID,
      clinicId: i % 3 === 0 ? 'clinic_north' : CLINIC_ID,
      assignedClinicianId: clinicianUid,
      status: config.status,
      studyType: config.studyType,
      urgency: config.urgency,
      indications: [faker.lorem.sentence()],
      contraindications: {
        hasPacemaker: false,
        hasSwallowingDisorder: false,
        hasBowelObstruction: false,
        hasKnownAllergy: false,
        reviewedAt: Timestamp.now(),
        reviewedBy: clinicianUid,
      },
      preProcedureChecks: [],
      preReviewConfig: {
        studyType: config.studyType,
        crohnsMode: config.studyType === 'crohns_monitor',
        sensitivityThreshold: 50,
        configuredAt: Timestamp.now(),
        configuredBy: clinicianUid,
      },
      createdAt: Timestamp.fromDate(new Date(Date.now() - daysAgo * 86400000)),
      updatedAt: Timestamp.now(),
      createdBy: clinicianUid,
      ...(config.status === 'completed' || config.status === 'completed_appended' || config.status === 'closed' ? {
        signedAt: Timestamp.fromDate(new Date(Date.now() - (daysAgo - 1) * 86400000)),
        signedBy: clinicianUid,
      } : {}),
    });
  }

  await batch3.commit();
  console.log(`15 procedures created across all statuses.`);

  // 7. Reports (for completed procedures)
  console.log('\n--- Seeding Reports ---');
  const batch4 = db.batch();
  const completedProcIds = procedureIds.filter((_, i) =>
    ['completed', 'completed_appended', 'closed', 'draft', 'appended_draft'].includes(procedureConfigs[i].status)
  );

  for (const procId of completedProcIds) {
    const reportId = faker.string.uuid();
    batch4.set(db.collection('reports').doc(reportId), {
      id: reportId,
      procedureId: procId,
      practiceId: PRACTICE_ID,
      clinicianId: clinicianUid,
      status: 'signed',
      sections: {
        findings: 'No significant pathology identified in the small bowel. Normal mucosal appearance throughout.',
        impression: 'Normal capsule endoscopy. No evidence of Crohn\'s disease, bleeding, or neoplasia.',
        recommendations: 'Routine follow-up in 12 months. Continue current medications.',
      },
      icdCodes: [
        { code: 'K92.1', description: 'Melena', status: 'confirmed' },
        { code: 'K63.5', description: 'Polyp of colon', status: 'suggested' },
      ],
      cptCodes: [
        { code: '91110', description: 'GI tract imaging, capsule endoscopy', status: 'confirmed' },
      ],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }

  await batch4.commit();
  console.log(`${completedProcIds.length} reports created.`);

  // 8. Findings (for ready_for_review and completed procedures)
  console.log('\n--- Seeding Findings ---');
  const findingTypes = ['polyp', 'erosion', 'ulcer', 'angiodysplasia', 'stricture', 'mass'];
  const regions = ['esophagus', 'stomach', 'duodenum', 'jejunum', 'ileum', 'cecum', 'colon'];

  for (let i = 0; i < Math.min(8, procedureIds.length); i++) {
    const procId = procedureIds[i];
    const numFindings = Math.floor(Math.random() * 4) + 1;

    for (let j = 0; j < numFindings; j++) {
      const findingId = faker.string.uuid();
      await db.collection('procedures').doc(procId).collection('findings').doc(findingId).set({
        id: findingId,
        procedureId: procId,
        type: faker.helpers.arrayElement(findingTypes),
        description: faker.lorem.sentence(),
        region: faker.helpers.arrayElement(regions),
        confidence: Math.floor(Math.random() * 40) + 60,
        provenance: faker.helpers.arrayElement(['ai_detected', 'clinician_marked']),
        reviewStatus: faker.helpers.arrayElement(['pending', 'confirmed', 'rejected']),
        frameNumber: Math.floor(Math.random() * 50000),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }
  }
  console.log('Findings created for 8 procedures.');

  // 9. Notifications (for the clinician)
  console.log('\n--- Seeding Notifications ---');
  const notifBatch = db.batch();
  const notifications = [
    { title: 'New Study Assigned', body: 'Patient Jennifer Martinez - Small Bowel Diagnostic has been assigned to you.', type: 'study_assigned', isRead: false },
    { title: 'Signature Required', body: 'Report for patient Michael Thompson is awaiting your signature.', type: 'signature_required', isRead: false },
    { title: 'QA Alert', body: 'AI detection confidence below threshold for procedure #4821. Manual review recommended.', type: 'qa_alert', isRead: false },
    { title: 'Report Delivered', body: 'Report for Emily Davis has been delivered to referring physician Dr. Adams.', type: 'delivery_confirmed', isRead: true },
    { title: 'System Update', body: 'ZoCW v3.1.0 has been deployed. See release notes for details.', type: 'system', isRead: true },
  ];

  for (const notif of notifications) {
    const id = faker.string.uuid();
    notifBatch.set(db.collection('users').doc(clinicianUid).collection('notifications').doc(id), {
      id,
      ...notif,
      createdAt: Timestamp.fromDate(new Date(Date.now() - Math.floor(Math.random() * 7) * 86400000)),
    });
  }

  // Also create notifications for Cameron if exists
  if (cameronUid) {
    for (const notif of notifications.slice(0, 3)) {
      const id = faker.string.uuid();
      notifBatch.set(db.collection('users').doc(cameronUid).collection('notifications').doc(id), {
        id,
        ...notif,
        createdAt: Timestamp.fromDate(new Date(Date.now() - Math.floor(Math.random() * 7) * 86400000)),
      });
    }
  }

  await notifBatch.commit();
  console.log('Notifications created.');

  // 10. Audit Log entries
  console.log('\n--- Seeding Activity Log ---');
  const auditBatch = db.batch();
  const auditEvents = [
    { event: 'procedure.created', entity: 'procedure', details: 'New capsule endoscopy scheduled for Jennifer Martinez' },
    { event: 'procedure.status_changed', entity: 'procedure', details: 'Status changed: capsule_return_pending → capsule_received' },
    { event: 'user.login', entity: 'user', details: 'Dr. Sarah Chen logged in' },
    { event: 'report.signed', entity: 'report', details: 'Report signed for patient Michael Thompson' },
    { event: 'report.delivered', entity: 'report', details: 'Report delivered via email to Dr. Adams (referring)' },
    { event: 'finding.created', entity: 'finding', details: 'AI detected polyp in jejunum (confidence: 87%)' },
    { event: 'user.role_changed', entity: 'user', details: 'Maria Rodriguez role updated to clinical_staff' },
    { event: 'procedure.checkin', entity: 'procedure', details: 'Patient David Wilson checked in for capsule procedure' },
  ];

  for (const audit of auditEvents) {
    const id = faker.string.uuid();
    auditBatch.set(db.collection('practices').doc(PRACTICE_ID).collection('auditLog').doc(id), {
      id,
      ...audit,
      userId: clinicianUid,
      userName: 'Dr. Sarah Chen',
      timestamp: Timestamp.fromDate(new Date(Date.now() - Math.floor(Math.random() * 14) * 86400000)),
    });
  }

  await auditBatch.commit();
  console.log('Audit log entries created.');

  // Verification
  console.log('\n=== Verification ===');
  const patients = await db.collection('patients').where('practiceId', '==', PRACTICE_ID).get();
  const procedures = await db.collection('procedures').where('practiceId', '==', PRACTICE_ID).get();
  const reports = await db.collection('reports').where('practiceId', '==', PRACTICE_ID).get();
  const users = await db.collection('users').where('practiceId', '==', PRACTICE_ID).get();
  const clinics = await db.collection('practices').doc(PRACTICE_ID).collection('clinics').get();

  console.log(`Patients: ${patients.size}`);
  console.log(`Procedures: ${procedures.size}`);
  console.log(`Reports: ${reports.size}`);
  console.log(`Users/Staff: ${users.size}`);
  console.log(`Clinics: ${clinics.size}`);
  console.log('\n=== Demo Seed Complete ===');
}

seedDemo().catch(err => {
  console.error('CRITICAL: Demo seeding failed.', err);
  process.exit(1);
});
