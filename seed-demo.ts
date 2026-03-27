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

/**
 * Delete all documents in a top-level collection (up to maxDocs).
 * Firestore Admin SDK does not provide a recursive delete from client paths,
 * so we batch-delete 200 at a time. Sub-collections (e.g., findings, notifications)
 * are handled separately below.
 */
async function deleteCollection(collectionPath: string, maxDocs = 2000): Promise<void> {
  const ref = db.collection(collectionPath);
  let deleted = 0;
  let snapshot = await ref.limit(200).get();
  while (!snapshot.empty) {
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    deleted += snapshot.size;
    if (deleted >= maxDocs) break;
    snapshot = await ref.limit(200).get();
  }
  if (deleted > 0) console.log(`  Deleted ${deleted} docs from /${collectionPath}`);
}

async function deleteSubcollectionForDocs(
  parentCol: string,
  subCol: string,
): Promise<void> {
  const parents = await db.collection(parentCol).limit(200).get();
  for (const parent of parents.docs) {
    const sub = parent.ref.collection(subCol);
    let snap = await sub.limit(200).get();
    while (!snap.empty) {
      const b = db.batch();
      snap.docs.forEach(d => b.delete(d.ref));
      await b.commit();
      snap = await sub.limit(200).get();
    }
  }
}

async function seedDemo() {
  console.log('=== Starting Comprehensive Demo Seed ===\n');

  // === CLEANUP: Delete existing demo data before re-seeding ===
  // This prevents duplicate documents accumulating across seed runs.
  // Auth users are NOT deleted — they are upserted (get or create) below.
  console.log('--- Cleaning existing seed data ---');
  // Findings sub-collections must be cleared before their parent procedures
  await deleteSubcollectionForDocs('procedures', 'findings');
  await deleteCollection('procedures');
  await deleteCollection('patients');
  await deleteCollection('reports');
  // Practices sub-collections (clinics, settings)
  const practiceDoc = db.collection('practices').doc(PRACTICE_ID);
  await deleteCollection(`practices/${PRACTICE_ID}/clinics`);
  await deleteCollection(`practices/${PRACTICE_ID}/settings`);
  await deleteCollection(`practices/${PRACTICE_ID}/auditLog`);
  await practiceDoc.delete();
  // User-level sub-collections (notifications). Keep user docs — auth-linked.
  await deleteSubcollectionForDocs('users', 'notifications');
  console.log('Cleanup complete.\n');

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
    console.log(`Created clinician: ${clinicianUid}`);
  }
  // Always set custom claims on clinician (ensures claims survive re-seed)
  await auth.setCustomUserClaims(clinicianUid, { role: 'clinician_auth', practiceId: PRACTICE_ID });
  console.log(`  Claims set: clinician_auth`);

  // Get or create all other test users (staff, admin, noauth, clinadmin)
  // Creates accounts if they don't exist, then sets custom claims.
  const testAccounts: Array<{ email: string; role: string; displayName: string }> = [
    { email: 'admin@zocw.com', role: 'admin', displayName: 'Practice Admin' },
    { email: 'staff@zocw.com', role: 'clinical_staff', displayName: 'Clinical Staff' },
    { email: 'noauth@zocw.com', role: 'clinician_noauth', displayName: 'Dr. Review Only' },
    { email: 'clinadmin@zocw.com', role: 'clinician_admin', displayName: 'Clinician Admin' },
  ];
  for (const { email, role, displayName } of testAccounts) {
    try {
      await auth.getUserByEmail(email);
      console.log(`  ${email} already exists`);
    } catch {
      await auth.createUser({ email, password: 'password', displayName });
      console.log(`  Created ${email}`);
    }
    const u = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(u.uid, { role, practiceId: PRACTICE_ID });
    console.log(`  Claims set for ${email}: ${role}`);
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

  // Additional test users created via Firebase Console (March 22, 2026)
  // These UIDs are stable and must be preserved on re-seed.
  batch1.set(db.collection('users').doc('cf9f1YBWFhNAB9KLbk1qVdoE1tE2'), {
    uid: 'cf9f1YBWFhNAB9KLbk1qVdoE1tE2',
    email: 'staff@zocw.com',
    firstName: 'Sandra',
    lastName: 'Martinez',
    role: 'clinical_staff',
    practiceId: PRACTICE_ID,
    clinicIds: [CLINIC_ID],
    isActive: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  batch1.set(db.collection('users').doc('0ZhIsvTsClV37xic0KQDYSMeEM33'), {
    uid: '0ZhIsvTsClV37xic0KQDYSMeEM33',
    email: 'noauth@zocw.com',
    firstName: 'Priya',
    lastName: 'Nair',
    role: 'clinician_noauth',
    practiceId: PRACTICE_ID,
    clinicIds: [CLINIC_ID],
    isActive: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  batch1.set(db.collection('users').doc('VtPqYvrpwCZhTFqCpzkP7FR3aZt2'), {
    uid: 'VtPqYvrpwCZhTFqCpzkP7FR3aZt2',
    email: 'admin@zocw.com',
    firstName: 'Marcus',
    lastName: 'Thompson',
    role: 'admin',
    practiceId: PRACTICE_ID,
    clinicIds: [CLINIC_ID],
    isActive: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

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
  // capsuleSerialNumber values link ZoCW procedures to pipeline Firestore data.
  // 'TEST-CAPSULE-99' matches existing processed frames in podium-capsule-ingest.
  // Procedures without capsuleSerialNumber will show "No Capsule Frames Loaded" in Viewer.
  const procedureConfigs = [
    { status: 'capsule_return_pending', studyType: 'sb_diagnostic', urgency: 'routine' },
    { status: 'capsule_return_pending', studyType: 'upper_gi', urgency: 'urgent' },
    { status: 'capsule_received', studyType: 'crohns_monitor', urgency: 'routine' },
    { status: 'capsule_received', studyType: 'sb_diagnostic', urgency: 'routine' },
    { status: 'ready_for_review', studyType: 'sb_diagnostic', urgency: 'routine', capsuleSerialNumber: 'TEST-CAPSULE-99' },
    { status: 'ready_for_review', studyType: 'colon_eval', urgency: 'urgent', capsuleSerialNumber: 'TEST-CAPSULE-99' },
    { status: 'ready_for_review', studyType: 'upper_gi', urgency: 'routine', capsuleSerialNumber: 'TEST-CAPSULE-99' },
    { status: 'draft', studyType: 'sb_diagnostic', urgency: 'routine', capsuleSerialNumber: 'TEST-CAPSULE-99' },
    { status: 'draft', studyType: 'crohns_monitor', urgency: 'routine', capsuleSerialNumber: 'TEST-CAPSULE-99' },
    { status: 'appended_draft', studyType: 'sb_diagnostic', urgency: 'routine' },
    { status: 'completed', studyType: 'sb_diagnostic', urgency: 'routine' },
    { status: 'completed', studyType: 'upper_gi', urgency: 'routine' },
    { status: 'completed', studyType: 'colon_eval', urgency: 'routine' },
    { status: 'completed_appended', studyType: 'sb_diagnostic', urgency: 'routine' },
    { status: 'closed', studyType: 'sb_diagnostic', urgency: 'routine' },
    // BUG-SEED-4: void-status procedure (previously missing from seed)
    { status: 'void', studyType: 'crohns_monitor', urgency: 'routine' },
    // UX-04 test data: ready_for_review with 0 findings to trigger "no anomalies" empty state
    { status: 'ready_for_review', studyType: 'colon_eval', urgency: 'routine' },
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
      ...('capsuleSerialNumber' in config && config.capsuleSerialNumber ? {
        capsuleSerialNumber: config.capsuleSerialNumber,
      } : {}),
    });
  }

  await batch3.commit();
  console.log(`16 procedures created across all statuses (including void).`);

  // 7. Reports (for completed + draft/appended_draft procedures)
  // BUG-SEED-5: Fix William Taylor sb_diagnostic mismatch — draft procedures must get
  // report status='draft', not 'signed'. Only completed/completed_appended/closed get signed reports.
  console.log('\n--- Seeding Reports ---');
  const batch4 = db.batch();
  // Build a map from procedureId → config index so we can look up status when creating reports
  const procIdToConfigIndex = new Map<string, number>(
    procedureIds.map((id, i) => [id, i])
  );
  const completedProcIds = procedureIds.filter((_, i) =>
    ['completed', 'completed_appended', 'closed', 'draft', 'appended_draft'].includes(procedureConfigs[i].status)
  );

  // Full clinical text for two completed procedures (sb_diagnostic index 10, upper_gi index 11)
  // Used to demonstrate rich report content in Reports Hub and Summary screens
  const tailoredReportSections = new Map<string, { findings: string; impression: string; recommendations: string }>();
  tailoredReportSections.set(procedureIds[10], {
    findings: [
      '1. 4mm sessile polyp, proximal jejunum, frame 11,342 (AI-detected, confidence 94%). Paris classification 0-IIa. Pale pink, smooth surface, no stalk. Borders well-defined. No surface irregularity or spontaneous bleeding.',
      '2. Superficial mucosal erosion, duodenal bulb, frame 3,874 (AI-detected, confidence 89%). 6mm diameter. Surrounding erythema and mild edema noted. No active bleeding. Appearance consistent with NSAID-induced mucosal injury.',
      '3. Small focus of patchy erythema, mid-jejunum, frame 18,203 (clinician-marked). Non-ulcerated. 15mm in longest dimension. May represent early inflammatory change or submucosal hemorrhage; clinical correlation advised.',
      '4. Normal terminal ileum and cecal valve visualized. No strictures, masses, vascular malformations, or villous atrophy identified. Complete small bowel transit in 4 hours 17 minutes.',
    ].join('\n'),
    impression: "Capsule endoscopy demonstrates a 4mm sessile jejunal polyp (Paris 0-IIa, AI confidence 94%), a duodenal erosion likely attributable to NSAID use (confidence 89%), and a small focus of mid-jejunal erythema of uncertain significance. No evidence of active hemorrhage, Crohn's disease, celiac disease, or high-grade dysplasia. Complete small bowel transit achieved with adequate mucosal visualization throughout all segments.",
    recommendations: "1. Gastroenterology follow-up within 6 weeks to review jejunal polyp finding and determine need for device-assisted enteroscopy with biopsy.\n2. Discontinue or reduce NSAIDs if clinically feasible; initiate proton pump inhibitor therapy (omeprazole 20mg daily) for 8 weeks for duodenal erosion healing.\n3. Repeat capsule endoscopy in 12 months if NSAID use continues or if patient develops recurrent iron-deficiency anemia or overt GI bleeding.\n4. Patient educated on symptoms requiring urgent evaluation: melena, hematemesis, significant change in bowel habits, or syncope.",
  });
  tailoredReportSections.set(procedureIds[11], {
    findings: [
      "1. 2cm sliding hiatal hernia identified at GEJ. Z-line regular and well-defined. No evidence of erosive reflux esophagitis. Frames 120–340.",
      "2. Salmon-colored tongues of columnar epithelium extending 1.5cm above GEJ, frame 287 (AI-detected, confidence 86%). No visible nodularity, ulceration, or surface irregularity. Consistent with short-segment Barrett's esophagus requiring endoscopic confirmation.",
      "3. Gastric antrum: mild diffuse erythema and edema throughout, frame 2,103 (AI-detected, confidence 81%). No ulceration, mass lesion, or active bleeding. Endoscopic biopsy recommended to rule out H. pylori gastritis.",
      "4. Duodenal bulb and second portion: normal appearance. Mucosa intact. No ulcers, erosions, or masses. Papilla of Vater visualized at frame 4,412 without abnormality.",
      "5. Proximal jejunum: normal mucosal pattern with intact villi and no pathological findings in visualized segments.",
    ].join('\n'),
    impression: "Upper GI capsule endoscopy demonstrates short-segment Barrett's esophagus (1.5cm, AI confidence 86%) with associated small sliding hiatal hernia, and mild antral gastritis without ulceration. No active bleeding source identified in the visualized upper GI tract. The Barrett's finding requires urgent endoscopic confirmation with targeted biopsies. Antral gastritis pattern is consistent with H. pylori infection; formal testing and treatment are indicated.",
    recommendations: "1. Urgent referral for upper endoscopy (EGD) with biopsies within 4 weeks: (a) four-quadrant biopsies at 1cm intervals within the Barrett's segment per Seattle protocol to assess dysplasia grade; (b) antral and corpus biopsies for H. pylori rapid urease test and histological gastritis grading.\n2. If H. pylori confirmed: initiate standard quadruple eradication therapy (bismuth-based or concomitant) per current ACG guidelines; confirm eradication with stool antigen or urea breath test ≥4 weeks post-treatment.\n3. If Barrett's confirmed without dysplasia: initiate high-dose PPI therapy; schedule EGD surveillance every 3–5 years per ACG/AGA guidelines.\n4. If low-grade dysplasia on biopsy: refer to advanced endoscopy for endoscopic eradication therapy (radiofrequency ablation or EMR).\n5. Lifestyle counseling: smoking cessation, alcohol reduction, weight management, and head-of-bed elevation for GERD symptom control.\n6. Repeat upper GI capsule endoscopy not indicated; ongoing management and surveillance via conventional endoscopy.",
  });

  for (const procId of completedProcIds) {
    const configIdx = procIdToConfigIndex.get(procId)!;
    const procConfig = procedureConfigs[configIdx];
    const isSignedStatus = ['completed', 'completed_appended', 'closed'].includes(procConfig.status);
    const reportStatus = isSignedStatus ? 'signed' : 'draft';
    const tailored = tailoredReportSections.get(procId);

    const reportId = faker.string.uuid();
    batch4.set(db.collection('reports').doc(reportId), {
      id: reportId,
      procedureId: procId,
      practiceId: PRACTICE_ID,
      clinicianId: clinicianUid,
      status: reportStatus,
      sections: {
        findings: tailored?.findings ?? faker.helpers.arrayElement([
          '1. 3mm sessile polyp in proximal jejunum at frame 12,847 (AI-detected, confidence 92%). No bleeding noted.\n2. Small erosion in duodenal bulb at frame 4,231 (clinician-marked). Consistent with NSAID use.\n3. Normal cecal appearance. No masses or vascular malformations identified.',
          '1. Moderate erythema and edema in terminal ileum consistent with active Crohn\'s disease. Lewis Score: 450 (moderate).\n2. Two aphthous ulcers in mid-ileum at frames 28,103 and 29,445.\n3. No strictures or obstruction identified. Transit time normal.',
          'No significant pathology identified throughout the small bowel examination. Normal mucosal appearance with adequate visualization of all segments. Complete small bowel transit achieved in 4 hours 23 minutes.',
          '1. 5mm pedunculated polyp in ascending colon at frame 38,921 (AI-detected, confidence 88%).\n2. Angiodysplasia in cecum at frame 41,203 (AI-detected, confidence 76%). No active bleeding.\n3. Normal terminal ileum. No Crohn\'s features.',
        ]),
        impression: tailored?.impression ?? faker.helpers.arrayElement([
          'Capsule endoscopy demonstrates small sessile polyp in proximal jejunum and mild duodenal erosion. Overall findings are of low clinical significance. No evidence of active bleeding, Crohn\'s disease, or neoplasia.',
          'Findings consistent with mild-to-moderate Crohn\'s disease activity in the terminal ileum. Lewis Score 450 indicates moderate disease. Recommend gastroenterology follow-up for treatment adjustment.',
          'Normal capsule endoscopy. Complete small bowel examination with no pathology identified. Adequate bowel preparation and complete transit.',
          'Two significant findings requiring follow-up: colonic polyp (recommend polypectomy referral) and cecal angiodysplasia (surveillance recommended). No evidence of active hemorrhage.',
        ]),
        recommendations: tailored?.recommendations ?? faker.helpers.arrayElement([
          'Routine surveillance follow-up in 12 months. Continue current medications. No dietary restrictions. Patient may resume normal activities.',
          'Recommend gastroenterology referral for treatment escalation. Consider biologic therapy initiation. Repeat capsule endoscopy in 6 months to monitor response. Continue iron supplementation.',
          'No further imaging required at this time. Annual screening per guideline recommendations. Patient counseled on symptoms requiring urgent evaluation.',
          'Urgent referral for colonoscopic polypectomy of ascending colon polyp. Surveillance capsule endoscopy for angiodysplasia in 6 months. Continue aspirin per cardiology recommendation.',
        ]),
      },
      // Only populate signature fields for truly signed reports (BUG-SEED-5)
      ...(isSignedStatus ? {
        signedAt: Timestamp.fromDate(new Date(Date.now() - Math.floor(Math.random() * 7) * 86400000)),
        signedBy: clinicianUid,
        signerName: 'Dr. Sarah Chen',
      } : {}),
      icdCodes: faker.helpers.arrayElement([
        [{ code: 'K92.1', description: 'Melena', status: 'confirmed' }, { code: 'K63.5', description: 'Polyp of colon', status: 'suggested' }],
        [{ code: 'K50.10', description: 'Crohn\'s disease of large intestine', status: 'confirmed' }, { code: 'K50.80', description: 'Crohn\'s disease, other', status: 'confirmed' }],
        [{ code: 'Z12.11', description: 'Screening for malignant neoplasm of colon', status: 'confirmed' }],
        [{ code: 'K55.20', description: 'Angiodysplasia of colon', status: 'confirmed' }, { code: 'K63.5', description: 'Polyp of colon', status: 'confirmed' }, { code: 'K92.1', description: 'Melena', status: 'suggested' }],
      ]),
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
  const detailedFindings = [
    { type: 'polyp', classification: 'Sessile polyp', description: '3mm sessile polyp, smooth surface, no stalk visible. Paris classification 0-IIa.', region: 'jejunum', confidence: 92 },
    { type: 'erosion', classification: 'Mucosal erosion', description: 'Superficial erosion with surrounding erythema. Consistent with NSAID-induced gastropathy.', region: 'duodenum', confidence: 87 },
    { type: 'ulcer', classification: 'Aphthous ulcer', description: 'Small aphthous ulcer, 4mm diameter, with fibrinous base. Suggestive of early Crohn\'s disease.', region: 'ileum', confidence: 81 },
    { type: 'angiodysplasia', classification: 'Vascular malformation', description: 'Small angiodysplasia, 2mm, cherry-red appearance. No active bleeding at time of observation.', region: 'cecum', confidence: 76 },
    { type: 'polyp', classification: 'Pedunculated polyp', description: '5mm pedunculated polyp with visible stalk. Paris classification 0-Ip. Recommend polypectomy.', region: 'colon', confidence: 88 },
    { type: 'mass', classification: 'Submucosal mass', description: 'Smooth submucosal bulge, 8mm, with intact overlying mucosa. May represent lipoma or GIST. Further evaluation recommended.', region: 'stomach', confidence: 71 },
    { type: 'erosion', classification: 'Barrett\'s-like epithelium', description: 'Salmon-colored tongues of columnar epithelium extending 2cm above GEJ. Consistent with short-segment Barrett\'s.', region: 'esophagus', confidence: 84 },
    { type: 'stricture', classification: 'Inflammatory stricture', description: 'Narrowing with edematous mucosa in mid-ileum. Capsule passage delayed 15 minutes. Consistent with Crohn\'s stricture.', region: 'ileum', confidence: 79 },
  ];

  for (let i = 0; i < Math.min(10, procedureIds.length); i++) {
    const procId = procedureIds[i];
    const numFindings = Math.floor(Math.random() * 3) + 1;

    for (let j = 0; j < numFindings; j++) {
      const findingId = faker.string.uuid();
      const template = faker.helpers.arrayElement(detailedFindings);
      const frameNum = Math.floor(Math.random() * 50000);
      await db.collection('procedures').doc(procId).collection('findings').doc(findingId).set({
        id: findingId,
        procedureId: procId,
        type: template.type,
        classification: template.classification,
        description: template.description,
        region: template.region,
        anatomicalRegion: template.region,
        confidence: template.confidence,
        provenance: faker.helpers.arrayElement(['ai_detected', 'ai_detected', 'clinician_marked']), // 2:1 ratio AI to manual
        reviewStatus: faker.helpers.arrayElement(['pending', 'confirmed', 'confirmed', 'rejected']),
        isIncidental: Math.random() > 0.8,
        frameNumber: frameNum,
        primaryFrameNumber: frameNum,
        primaryFrameTimestamp: frameNum * 250,
        additionalFrames: [],
        modificationHistory: [],
        annotations: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }
  }
  console.log('Findings created for 8 procedures.');

  // 8b. Rich showcase findings for the 3 ready_for_review procedures (indices 4, 5, 6)
  // These have deterministic frame numbers, confidence scores, and anatomical detail
  // to give the Viewer drill-down meaningful data to display.
  console.log('\n--- Seeding Rich Showcase Findings (ready_for_review procedures) ---');
  const showcaseFindings: Array<{ procIdx: number; items: Array<Record<string, unknown>> }> = [
    {
      procIdx: 4, // sb_diagnostic, routine — Jennifer Martinez / David Wilson
      items: [
        {
          type: 'polyp', classification: 'Sessile polyp', confidence: 94,
          description: '3mm sessile polyp, smooth surface, pale pink coloration. Paris classification 0-IIa. No stalk visible. Well-demarcated borders. No surface irregularity or friability.',
          region: 'jejunum', anatomicalRegion: 'Proximal jejunum',
          frameNumber: 11342, primaryFrameNumber: 11342, primaryFrameTimestamp: 11342 * 250,
          provenance: 'ai_detected', reviewStatus: 'confirmed', isIncidental: false,
        },
        {
          type: 'erosion', classification: 'Mucosal erosion', confidence: 89,
          description: 'Superficial erosion 6mm diameter with surrounding erythema and mild edema. No active bleeding at time of observation. Appearance consistent with NSAID-induced mucosal injury.',
          region: 'duodenum', anatomicalRegion: 'Duodenal bulb',
          frameNumber: 3874, primaryFrameNumber: 3874, primaryFrameTimestamp: 3874 * 250,
          provenance: 'ai_detected', reviewStatus: 'confirmed', isIncidental: false,
        },
        {
          type: 'erythema', classification: 'Mucosal erythema', confidence: 72,
          description: 'Patchy non-ulcerated erythema, approximately 15mm in longest dimension. May represent early inflammatory change or submucosal hemorrhage; clinical correlation advised.',
          region: 'jejunum', anatomicalRegion: 'Mid-jejunum',
          frameNumber: 18203, primaryFrameNumber: 18203, primaryFrameTimestamp: 18203 * 250,
          provenance: 'clinician_marked', reviewStatus: 'pending', isIncidental: true,
        },
      ],
    },
    {
      procIdx: 5, // colon_eval, urgent — Sarah Johnson
      items: [
        {
          type: 'polyp', classification: 'Pedunculated polyp', confidence: 91,
          description: '6mm pedunculated polyp with 2mm stalk. Head smooth, no lobulation or surface irregularity. Paris classification 0-Ip. Located on haustra fold. Polypectomy referral recommended.',
          region: 'colon', anatomicalRegion: 'Ascending colon',
          frameNumber: 38214, primaryFrameNumber: 38214, primaryFrameTimestamp: 38214 * 250,
          provenance: 'ai_detected', reviewStatus: 'confirmed', isIncidental: false,
        },
        {
          type: 'angiodysplasia', classification: 'Vascular malformation', confidence: 78,
          description: '3mm angiodysplasia with cherry-red stellate vascular pattern. Flat, non-bleeding at time of capsule passage. Surveillance recommended given size and location.',
          region: 'cecum', anatomicalRegion: 'Cecum',
          frameNumber: 41058, primaryFrameNumber: 41058, primaryFrameTimestamp: 41058 * 250,
          provenance: 'ai_detected', reviewStatus: 'pending', isIncidental: false,
        },
      ],
    },
    {
      procIdx: 6, // upper_gi, routine — Robert Brown
      items: [
        {
          type: 'erosion', classification: "Barrett's-like epithelium", confidence: 86,
          description: "Salmon-colored tongues of columnar epithelium extending 1.5cm above the GEJ. Irregular Z-line. No nodularity, ulceration, or mucosal break. Consistent with short-segment Barrett's esophagus; endoscopic confirmation required.",
          region: 'esophagus', anatomicalRegion: 'Distal esophagus / GEJ',
          frameNumber: 287, primaryFrameNumber: 287, primaryFrameTimestamp: 287 * 250,
          provenance: 'ai_detected', reviewStatus: 'confirmed', isIncidental: false,
        },
        {
          type: 'erythema', classification: 'Antral gastritis', confidence: 81,
          description: 'Diffuse erythema and mild edema throughout gastric antrum. No ulceration or mass lesion. Pattern consistent with H. pylori-associated gastritis; mucosal biopsy recommended.',
          region: 'stomach', anatomicalRegion: 'Gastric antrum',
          frameNumber: 2103, primaryFrameNumber: 2103, primaryFrameTimestamp: 2103 * 250,
          provenance: 'ai_detected', reviewStatus: 'pending', isIncidental: false,
        },
      ],
    },
  ];

  for (const showcase of showcaseFindings) {
    const procId = procedureIds[showcase.procIdx];
    for (const item of showcase.items) {
      const findingId = faker.string.uuid();
      await db.collection('procedures').doc(procId).collection('findings').doc(findingId).set({
        id: findingId,
        procedureId: procId,
        additionalFrames: [],
        modificationHistory: [],
        annotations: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        ...item,
      });
    }
  }
  console.log('Rich showcase findings seeded for 3 ready-for-review procedures (indices 4, 5, 6).');

  // 9. Notifications (for the clinician)
  console.log('\n--- Seeding Notifications ---');
  const notifBatch = db.batch();
  // BUG-51 fix: notifications now include routeTo and entityId so clicking navigates to the linked procedure
  const notifications = [
    { title: 'New Study Assigned', body: 'Patient Jennifer Martinez - Small Bowel Diagnostic has been assigned to you.', type: 'study_assigned', isRead: false, entityId: procedureIds[0], entityType: 'procedure', routeTo: `/summary/${procedureIds[0]}` },
    { title: 'Signature Required', body: 'Report for patient Michael Thompson is awaiting your signature.', type: 'signature_required', isRead: false, entityId: procedureIds[7], entityType: 'procedure', routeTo: `/sign-deliver/${procedureIds[7]}` },
    { title: 'QA Alert', body: 'AI detection confidence below threshold for procedure #4821. Manual review recommended.', type: 'qa_alert', isRead: false, entityId: procedureIds[4], entityType: 'procedure', routeTo: `/viewer/${procedureIds[4]}` },
    { title: 'Report Delivered', body: 'Report for Emily Davis has been delivered to referring physician Dr. Adams.', type: 'delivery_confirmed', isRead: true, entityId: procedureIds[10], entityType: 'procedure', routeTo: `/summary/${procedureIds[10]}` },
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
    { event: 'procedure.created', entity: 'procedure', details: 'New SB diagnostic capsule endoscopy scheduled for Jennifer Martinez', userName: 'Maria Rodriguez' },
    { event: 'procedure.created', entity: 'procedure', details: 'New Crohn\'s monitoring procedure created for Robert Brown (urgent)', userName: 'Dr. Sarah Chen' },
    { event: 'procedure.checkin', entity: 'procedure', details: 'Patient David Wilson checked in — consent captured, capsule SN-48291-A scanned', userName: 'James Wilson' },
    { event: 'procedure.checkin', entity: 'procedure', details: 'Patient Emily Davis checked in — consent captured, capsule SN-48292-B scanned', userName: 'Maria Rodriguez' },
    { event: 'procedure.status_changed', entity: 'procedure', details: 'Status: capsule_return_pending → capsule_received (Jennifer Martinez)', userName: 'James Wilson' },
    { event: 'procedure.status_changed', entity: 'procedure', details: 'Status: capsule_received → ready_for_review (David Wilson, 47,832 frames indexed)', userName: 'System' },
    { event: 'procedure.status_changed', entity: 'procedure', details: 'Status: ready_for_review → draft (Emily Davis, pre-review checklist completed)', userName: 'Dr. Sarah Chen' },
    { event: 'finding.created', entity: 'finding', details: 'AI detected sessile polyp in jejunum (confidence: 92%, frame 12,847)', userName: 'AI Copilot' },
    { event: 'finding.created', entity: 'finding', details: 'AI detected angiodysplasia in cecum (confidence: 76%, frame 41,203)', userName: 'AI Copilot' },
    { event: 'finding.created', entity: 'finding', details: 'Clinician marked aphthous ulcer in ileum (frame 28,103)', userName: 'Dr. Sarah Chen' },
    { event: 'report.signed', entity: 'report', details: 'Report signed for patient Michael Thompson — 2 findings confirmed, 1 rejected', userName: 'Dr. Sarah Chen' },
    { event: 'report.signed', entity: 'report', details: 'Report signed for patient Lisa Anderson — normal capsule endoscopy', userName: 'Dr. Sarah Chen' },
    { event: 'report.delivered', entity: 'report', details: 'Report for Michael Thompson delivered via email to Dr. Adams (referring physician)', userName: 'System' },
    { event: 'report.delivered', entity: 'report', details: 'Report for Lisa Anderson delivered via PDF download and HL7/FHIR', userName: 'System' },
    { event: 'user.login', entity: 'user', details: 'Dr. Sarah Chen logged in from 192.168.1.45', userName: 'Dr. Sarah Chen' },
    { event: 'user.login', entity: 'user', details: 'Cameron Plummer logged in from 10.0.0.1', userName: 'Cameron Plummer' },
    { event: 'user.login', entity: 'user', details: 'Maria Rodriguez logged in from 192.168.1.87', userName: 'Maria Rodriguez' },
    { event: 'user.role_changed', entity: 'user', details: 'Maria Rodriguez role updated: clinical_staff (unchanged). Clinic assignment: Main + North County', userName: 'Dr. Robert Kim' },
    { event: 'procedure.status_changed', entity: 'procedure', details: 'Status: completed → closed (Sarah Johnson, 90-day retention period expired)', userName: 'System' },
    { event: 'finding.created', entity: 'finding', details: 'Clinician marked Barrett\'s-like epithelium in esophagus (frame 1,203)', userName: 'Dr. Sarah Chen' },
  ];

  for (let i = 0; i < auditEvents.length; i++) {
    const audit = auditEvents[i];
    const id = faker.string.uuid();
    const hoursAgo = i * 4 + Math.floor(Math.random() * 3); // Spread across last ~3 days
    auditBatch.set(db.collection('practices').doc(PRACTICE_ID).collection('auditLog').doc(id), {
      id,
      event: audit.event,
      entity: audit.entity,
      details: audit.details,
      userId: clinicianUid,
      userName: audit.userName,
      timestamp: Timestamp.fromDate(new Date(Date.now() - hoursAgo * 3600000)),
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
