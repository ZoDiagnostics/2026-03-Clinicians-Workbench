# Test Validation Packet — Zo Clinicians Workbench (ZoCW) v3.1.0

**Purpose:** Acceptance criteria and testable assertions for Firebase Studio build validation. After each build packet, verify these items before proceeding to next packet.

---

## Section 1: Critical Path Test
**Objective:** Full workflow from Check-In through Sign & Deliver with expected Firestore state at each step.

### Test Scenario: New Procedure → Complete Review → Sign & Deliver

```
STEP 1: Create Procedure (Check-In Screen)
  Precondition: Logged in as clinician_auth
  Action: Patient selector → Select patient → Study type "Upper GI" →
          Scan capsule (serial ABC123, lot XYZ789) → Select indication "GERD evaluation" →
          Complete pre-checks (6 items) → Select consent method "Digital" →
          Verify contraindications "None" → Click "Proceed"

  Expected Firestore State After:
  ✓ documents/procedures/{procId} created with:
    - patientId: correct patient ID
    - studyType: 'upper_gi'
    - status: 'capsule_return_pending' ← INITIAL STATE
    - createdAt: current timestamp
    - createdBy: current user UID
    - capsuleInfo.lotNumber: 'XYZ789'
    - capsuleInfo.serialNumber: 'ABC123'
    - indications: ['GERD evaluation']
    - preReviewConfig.sensitivity: 5 (default)
  ✓ auditLog entry created: event='procedure_created'
  ✓ Procedure ID returned and displayed to user
  ✓ Navigation to SCR-10 Viewer with {procId}

STEP 2: Upload Capsule Data (Capsule Upload Screen)
  Precondition: Procedure status = 'capsule_return_pending'
  Action: Upload file (simulated .zip) → Validate quality score → Confirm capsule serial →
          Click "Proceed"

  Expected Firestore State After:
  ✓ procedures/{procId} updated with:
    - status: 'capsule_received' → 'ready_for_review' (auto-transition)
    - capsuleUploadedAt: current timestamp
    - qualityScore: 95 (simulated)
  ✓ Cloud Storage object created: gs://bucket/capsule-studies/{practiceId}/{procId}/
  ✓ auditLog entries created: events=['capsule_uploaded', 'status_transitioned']
  ✓ Navigation to SCR-10 Viewer

STEP 3: Diagnostic Review (Viewer Screen)
  Precondition: Procedure status = 'ready_for_review'
  Action: Pre-Review banner shown → Click "Confirm & Begin Review" →
          Review findings → Confirm 3 AI findings → Add 1 manual finding →
          Navigate to SCR-11 Summary

  Expected Firestore State After:
  ✓ procedures/{procId}/findings subcollection contains:
    - 3 findings with reviewStatus: 'confirmed' (AI findings)
    - 1 finding with origin: 'clinician_marked' (manual)
    - All have provenance metadata (origin, confidence, modelVersion, createdAt, createdBy)
    - All have reportable: true flag
  ✓ procedures/{procId}/annotations subcollection contains:
    - Drawing annotations persisted
    - editHistory[] tracked
  ✓ procedures/{procId} status: still 'draft' (no transition yet)
  ✓ auditLog entries created: events=['finding_confirmed' × 3, 'finding_added', 'annotation_created']

STEP 4: Review Summary (Summary Screen)
  Precondition: Procedure status = 'draft'
  Action: View findings summary → Click "Generate Report" (status gate check) →
          Navigate to SCR-12 Report

  Expected Firestore State After:
  ✓ reports/{reportId} created with:
    - status: 'auto_drafted'
    - findings: [array of confirmed findings]
    - sections.clinicalImpression: { content: '', edited: false }
    - sections.recommendations: { content: '', edited: false }
  ✓ procedures/{procId} status: still 'draft'
  ✓ auditLog entry created: event='report_created'
  ✓ Copilot auto-draft triggered (Cloud Function)
  ✓ Navigation to SCR-12 Report

STEP 5: Generate Report (Report Screen)
  Precondition: Report status = 'auto_drafted'
  Action: Copilot panel shows auto-draft Clinical Impression → Click "Accept" →
          ICD code suggestions show K11.9 (90% confidence) → Click "Accept" →
          Click "Next" to proceed to sign

  Expected Firestore State After:
  ✓ reports/{reportId} updated with:
    - sections.clinicalImpression.content: [auto-drafted text]
    - sections.clinicalImpression.acceptedFromDraft: true
    - sections.clinicalImpression.edited: false
    - codes.icd10[0]: { code: 'K11.9', confidence: 0.9, acceptedByUser: true }
  ✓ auditLog entries created: events=['report_section_accepted', 'code_accepted']
  ✓ Validation gates passed: findings present, impression provided
  ✓ Navigation to SCR-13 Sign & Deliver

STEP 6: Sign & Deliver Report (Sign & Deliver Screen)
  Precondition: Report status = 'auto_drafted', all sections complete
  Action: Patient identity verification modal → Click "Correct patient" →
          Click "Sign Report" → Select delivery method "Email to Patient" →
          Click "Send" → Accept education materials suggestion → Click "Send Education"

  Expected Firestore State After:
  ✓ reports/{reportId} updated with:
    - status: 'signed'
    - signatureData: { signedBy: current user UID, signedAt: timestamp }
    - deliveryRecords[]: [ { method: 'email', deliveredAt: timestamp, status: 'sent' } ]
  ✓ procedures/{procId} updated with:
    - status: 'completed' ← STATE MACHINE TRANSITION
    - procedureCompletedAt: timestamp
    - reportId: reference to signed report
  ✓ patients/{patientId}/educationAssignments created with:
    - materialId: [selected material]
    - deliveredAt: timestamp
    - status: 'sent'
  ✓ Cloud Storage: PDF report generated at gs://bucket/reports/{reportId}.pdf
  ✓ auditLog entries created: events=['report_signed', 'report_delivered', 'education_assigned']
  ✓ Notifications sent to patient + referring physician
  ✓ Navigation to SCR-01 Dashboard with completion toast

FINAL VERIFICATION:
✓ Firestore document hierarchy intact (procedures → findings, annotations, reports)
✓ All timestamps in UTC
✓ All user IDs match current auth user UID
✓ Practice ID consistent across all documents
✓ No cross-practice data leakage (all docs scoped to practiceId)
✓ Audit trail complete (all operations logged)
✓ State machine enforced (procedure transitioned through valid states only)
```

---

## Section 2: Navigation Contract Tests

**Objective:** Verify every status × source screen combination routes correctly.

### Navigation Routing Matrix

```
| Source Screen | Procedure Status | Expected Destination | Route | Role Required |
|---|---|---|---|---|
| Dashboard | capsule_return_pending | SCR-08 Check-In | /workflow/checkin/{id} | auth |
| Dashboard | capsule_received | SCR-09 Upload | /workflow/upload/{id} | clinical_staff, clinician_* |
| Dashboard | ready_for_review | SCR-10 Viewer | /workflow/viewer/{id} | clinician_*, clinical_staff |
| Dashboard | draft | SCR-10 Viewer | /workflow/viewer/{id} | clinician_*, clinical_staff |
| Dashboard | appended_draft | SCR-10 Viewer | /workflow/viewer/{id} | clinician_*, clinical_staff |
| Dashboard | completed | SCR-12 Report (RO) | /workflow/report/{id} | auth |
| Dashboard | completed_appended | SCR-12 Report (RO) | /workflow/report/{id} | auth |
| Dashboard | closed | SCR-11 Summary (RO) | /workflow/summary/{id} | auth |
| Dashboard | void | SCR-11 Summary (RO) | /workflow/summary/{id} | auth |
| My Worklist (SCR-35) | ready_for_review | SCR-10 Viewer | /workflow/viewer/{id} | clinician_*, clinician_admin |
| My Worklist | draft | SCR-10 Viewer | /workflow/viewer/{id} | clinician_*, clinician_admin |
| My Worklist | appended_draft | SCR-10 Viewer | /workflow/viewer/{id} | clinician_*, clinician_admin |
| Procedures (SCR-03) | ready_for_review | SCR-10 Viewer | /workflow/viewer/{id} | clinician_*, clinical_staff, clinician_admin |
| Procedures | draft | SCR-10 Viewer | /workflow/viewer/{id} | clinician_*, clinical_staff, clinician_admin |
| Procedures | completed | SCR-12 Report | /workflow/report/{id} | clinician_*, clinical_staff, clinician_admin |
| Patient Overview (SCR-14) Procedures Tab | ready_for_review | SCR-10 Viewer | /workflow/viewer/{id} | auth |
| Patient Overview Procedures Tab | completed | SCR-12 Report | /workflow/report/{id} | auth |
| Notification click | all statuses | Per getRouteForProcedure() | Varies | auth |

Test Method:
1. Create procedures with each of 9 statuses
2. Navigate from each source screen to procedure
3. Verify route matches expected destination
4. Verify screen loads correctly (no 404, no infinite loops)
5. Verify unauthorized roles see "Access Denied" toast
```

**Test Execution:**
```bash
For each (sourceScreen, status, expectedRoute):
  1. Navigate to sourceScreen
  2. Click procedure → route to {expectedRoute}
  3. Assert screen displays correct content
  4. Assert Back button returns to sourceScreen
```

---

## Section 3: Role Access Control Tests

**Objective:** Verify each of 5 roles accesses only authorized screens.

### Role-Based Access Matrix

```
| Role | Accessible | Blocked |
|---|---|---|
| clinician_auth | SCR-01, 02, 03, 04, 05, 08–13, 14–21, 30, 35 | SCR-06, 07, 22–28, 29, 33, 34 |
| clinician_noauth | SCR-01, 02, 03, 05, 08–12, 14–21, 35 | SCR-04, 06, 07, 13, 22–28, 29, 30, 33, 34 (cannot sign) |
| clinician_admin | SCR-01–07, 08–13, 14–35 (all screens) | None |
| admin | SCR-01–07, 08–13, 14–35 (all screens) | None |
| clinical_staff | SCR-01, 02, 03, 05, 08–12, 14–21 | SCR-04, 06, 07, 13, 22–28, 29, 30, 33, 34, 35 |

Test Method:
For each role:
  1. Sign in as role
  2. Verify Sidebar shows only accessible screens
  3. For each blocked screen:
     a. Attempt direct navigation via URL
     b. Assert redirect to /dashboard with "Access Denied" toast
     c. Verify access attempt logged in auditLog as 'access_denied'
  4. For each accessible screen:
     a. Navigate via sidebar or direct URL
     b. Assert screen loads without error
     c. Verify content appropriately filtered per role
```

**Test Examples:**
- clinician_noauth: SCR-13 Sign & Deliver shows "You do not have signing authority" banner
- clinical_staff: SCR-30 Analytics not visible in sidebar
- clinician_auth: SCR-35 My Worklist shows only own assigned procedures
- admin: All screens visible and accessible
- clinician_admin: All screens visible, clinician + admin features both available

---

## Section 4: Firestore Security Rule Validation

**Objective:** Verify security rules prevent unauthorized access.

### Test Cases

```
TEST 1: Cross-Practice Data Isolation
  Setup:
    - Practice A: practiceId='prac_AAA'
    - Practice B: practiceId='prac_BBB'
    - User U1: role=clinician_auth, practiceId='prac_AAA'

  Test: U1 attempts to read procedures/{procId} where practiceId='prac_BBB'
  Expected: DENY
  Verification: Firestore rule: allow read if request.auth.token.practiceId == resource.data.practiceId

  Audit: Browser console shows "Permission denied" error
  Failure Criteria: If U1 can read Practice B data, security bypass exists

TEST 2: Staff Role-Based Access
  Setup:
    - Procedure created, assigned to U1 (clinician_auth)
    - U2 is clinical_staff (cannot review procedures)

  Test: U2 attempts to read/write procedure document
  Expected: ALLOW read (view procedure), DENY write (cannot modify status)
  Verification: Firestore rule: allow read if role in ['clinician_auth', 'clinician_admin', 'clinical_staff']
                                 allow write if role in ['clinician_auth', 'clinician_admin']

TEST 3: Audit Log Append-Only
  Setup:
    - Audit log entry created for 'procedure_created'

  Test: User attempts to update/delete audit entry
  Expected: DENY
  Verification: Firestore rule: allow create only (no update/delete)

  Failure Criteria: If audit entries can be deleted, compliance audit trail compromised

TEST 4: Patient Data PHI Access
  Setup:
    - Patient document contains SSN field
    - clinical_staff user logs in

  Test: Query patients collection, SSN field returned
  Expected: SSN masked or not returned (per role)
  Implementation: Client-side masking via hooks, or Firestore rules with request.auth.token.role check

  Verification: If clinical_staff queries patient, SSN not visible in data

TEST 5: Notification Ownership
  Setup:
    - Notification created for user U1

  Test: User U2 attempts to read U1's notifications
  Expected: DENY
  Verification: Firestore rule: allow read/write only if request.auth.uid == resource.ref.parent.parent.id

  (Path: users/{uid}/notifications/{notificationId}, so uid in path must match request.auth.uid)

TEST 6: Real-time Listener Scope
  Setup:
    - Clinician U1 opens Viewer for procedure in Practice A
    - Real-time listener: onSnapshot(procedures where practiceId=='prac_A')

  Test: Manually add procedure to Practice B in Firestore
  Expected: Real-time listener does NOT receive the Practice B procedure

  Verification: Firestore query filters to practiceId, so cross-practice data excluded at query level
```

**Automated Test (Firestore Emulator):**
```bash
# Install Firebase Emulator Suite
npm install -g firebase-tools
firebase emulators:start

# Run security rules tests
firebase emulators:exec 'npm run test:firestore-rules'
```

---

## Section 5: State Machine Validation

**Objective:** Verify procedure lifecycle transitions are correct and invalid transitions rejected.

### Valid State Transitions

```
| From | To | Allowed | Trigger | Comment |
|---|---|---|---|---|
| capsule_return_pending | capsule_received | ✓ YES | Upload completed | Capsule data received |
| capsule_received | ready_for_review | ✓ YES | Auto-transition | After upload validation passes |
| ready_for_review | draft | ✓ YES | Clinician starts review | Clicks "Confirm & Begin" in Pre-Review |
| draft | appended_draft | ✓ YES | Clinician adds findings | After initial findings confirmed |
| appended_draft | appended_draft | ✓ YES | More findings added | Can append multiple times |
| draft | completed | ✓ YES | Report signed | Report status → signed |
| appended_draft | completed_appended | ✓ YES | Report signed | Report signed after appends |
| draft | void | ✓ YES | Cancel review | Clinician or admin cancels |
| appended_draft | void | ✓ YES | Cancel review | Clinician or admin cancels |
| ready_for_review | void | ✓ YES | Supervisor voids | Before review starts |
| completed | closed | ✓ YES | 90+ days or admin | Auto-archive or manual |
| completed_appended | closed | ✓ YES | 90+ days or admin | Auto-archive or manual |
| any | closed | ✓ YES | Admin force-close | Admin override |
```

### Invalid State Transitions (Must REJECT)

```
| From | To | Allowed | Expected Error |
|---|---|---|---|
| capsule_return_pending | draft | ✗ NO | "Cannot transition from capsule_return_pending to draft" |
| capsule_return_pending | completed | ✗ NO | "Cannot skip review stages" |
| capsule_received | draft | ✗ NO | "Must be ready_for_review first" |
| ready_for_review | completed | ✗ NO | "Cannot skip draft stage" |
| draft | capsule_received | ✗ NO | "Invalid backward transition" |
| completed | draft | ✗ NO | "Cannot revert signed procedure" |
| void | draft | ✗ NO | "Void procedures are final" |
| closed | any | ✗ NO | "Closed procedures cannot transition" |
```

**Test Execution:**

```bash
Test Procedure:
1. Create procedure with status='capsule_return_pending'
2. For each valid transition:
   a. Call Cloud Function transitionProcedureStatus(procId, newStatus)
   b. Assert success: { success: true, newStatus: ... }
   c. Verify Firestore: procedure.status updated
3. For each invalid transition:
   a. Call Cloud Function transitionProcedureStatus(procId, invalidStatus)
   b. Assert failure: { success: false, error: "Cannot transition..." }
   c. Verify Firestore: procedure.status NOT updated (unchanged)
4. Verify state machine rule enforcement at Cloud Function level
```

---

## Section 6: Build Phase Verification Checklist

### After BUILD_01: Auth & Patients

- [ ] Firebase Auth user creation works (email/password)
- [ ] Custom claims set in ID token (role, practiceId, clinicIds)
- [ ] useAuth hook returns currentUser, currentRole, isLoading
- [ ] Header role switcher displays current role
- [ ] Patient list loads from Firestore
- [ ] Patient search by name/MRN functional
- [ ] Patient CRUD persists to Firestore
- [ ] EMR source badges visible on pre-populated fields
- [ ] EMR-sourced identity fields read-only
- [ ] PHI masking works: clinical_staff cannot see SSN
- [ ] Patient Overview all 8 tabs load correctly
- [ ] Real-time listeners active (changes appear without reload)
- [ ] Role-based route guards functional (unauthorized redirect to dashboard)
- [ ] Audit log entries created for patient operations
- [ ] Cloud Function `onUserCreate` executes on Auth user creation
- [ ] Custom role provisioning available (BRD-0088)
- [ ] No console errors or warnings

### After BUILD_02: Clinical Workflow

- [ ] Procedure CRUD works: create persists to Firestore
- [ ] Initial status set to 'capsule_return_pending'
- [ ] Check-In patient selector works
- [ ] Patient pre-population from query param functional
- [ ] Study type selection auto-configures downstream tools
- [ ] Indication templates load per study type
- [ ] Capsule scan (barcode) validates expiry and recall list
- [ ] Duplicate serial number warning shows
- [ ] Contraindication review gates ALL items as "None"
- [ ] Proceed button creates procedure and navigates to Viewer
- [ ] Capsule Upload file acceptance works
- [ ] Quality score validation (< 70 shows warning)
- [ ] Upload status transition: capsule_return_pending → capsule_received → ready_for_review
- [ ] Dashboard metrics calculated from Firestore
- [ ] My Worklist displays assigned procedures
- [ ] Worklist filters functional (study type, urgency, status)
- [ ] Status-based routing works for all 9 statuses
- [ ] Color-coded status badges display per 0293
- [ ] State machine Cloud Function enforces valid transitions
- [ ] Invalid transitions rejected with error message
- [ ] Audit log entries created for all procedure operations

### After BUILD_03: Viewer & Findings

- [ ] Findings load from Firestore subcollection
- [ ] AI-detected findings display on timeline (red/yellow/green)
- [ ] Confidence scores visible
- [ ] Clinician can confirm finding → reviewStatus='confirmed'
- [ ] Clinician can reject finding with reason
- [ ] Clinician can modify finding → provenance tracked
- [ ] Clinician can add manual finding → origin='clinician_marked'
- [ ] Modification history tracked in provenance.modifications[]
- [ ] Pre-Review banner displays with editable badges
- [ ] Sensitivity threshold configurable (1-10 slider)
- [ ] Banner auto-collapses after 3 seconds of playback
- [ ] "Confirm & Begin Review" button collapses banner
- [ ] Configuration changes saved to Firestore
- [ ] Incidental Findings tray shows unreviewed incidentals
- [ ] "Confirm All" batch action works with gate modal
- [ ] "Dismiss All" batch action with reason selector
- [ ] Generate Referral available for confirmed incidentals
- [ ] Finding-Linked Education panel slides out
- [ ] Annotations persist to Firestore
- [ ] Drawing tools (circle, arrow, freeform) functional
- [ ] Undo/Redo buttons work (last 10 actions)
- [ ] Edit history trackable per annotation
- [ ] Reportable flag toggles per finding/annotation
- [ ] Patient identity context verification blocks if not confirmed
- [ ] Audit entries created for all finding operations

### After BUILD_04: Report & Sign

- [ ] Report created with status='auto_drafted'
- [ ] Copilot auto-draft generates Clinical Impression
- [ ] Auto-draft content displays with confidence scores
- [ ] "Accept" button copies auto-draft to report section
- [ ] "Edit" button allows inline modification
- [ ] Edited sections flagged in Firestore
- [ ] ICD-10 code suggestions displayed (confidence > 80%)
- [ ] CPT codes suggested per study type
- [ ] "Accept All" bulk-accepts high-confidence codes
- [ ] Codes added to report.codes arrays
- [ ] Finding provenance displays in report (origin, confidence, model version)
- [ ] Validation gates: findings required, impression required, cannot sign incomplete
- [ ] Report preview shows PDF-like rendering
- [ ] Mobile PWA responsive layout works on mobile
- [ ] Identity verification modal prevents signing wrong patient
- [ ] Sign button creates signature with timestamp
- [ ] Report status → 'signed', procedure status → 'completed'
- [ ] Delivery defaults pre-populated from Practice Settings
- [ ] Email delivery recipient pre-filled from patient
- [ ] Print option opens browser print dialog
- [ ] Patient portal delivery available
- [ ] Education materials auto-suggested after signing
- [ ] Delivery records created for each method
- [ ] Audit entries created for all report operations

### After BUILD_05: Admin & Settings

- [ ] Practice Settings load from Firestore
- [ ] Delivery defaults configured and persisted
- [ ] Indication templates configurable per study type
- [ ] Incidental findings sensitivity configurable (1-10)
- [ ] EHR integration endpoint saveable
- [ ] Notification preferences configurable (channels, quiet hours, digest)
- [ ] Locale settings update date/number formatting globally
- [ ] Staff table loads all practice staff
- [ ] Add Staff creates Auth user + staff document
- [ ] Invitation email sent (simulated)
- [ ] Role dropdown updates custom claims via Cloud Function
- [ ] Role change creates audit log entry
- [ ] Clinic assignment multi-select works
- [ ] Clinic CRUD functional (create, edit, delete)
- [ ] Delegation rules creation working
- [ ] Delegation expiry countdown visible
- [ ] PHI masking rules configurable per staff
- [ ] Unmask action logged in audit trail
- [ ] Subscription plan information displays
- [ ] Features enabled/disabled per plan
- [ ] Invoice history shows with download links
- [ ] ICD-10 search functional
- [ ] Favorite codes add/remove works
- [ ] Usage count increments on report creation
- [ ] Favorites sorted by usage count
- [ ] Capsule recall initiated creates recall document
- [ ] Active recall banner displays on Dashboard
- [ ] Affected procedures list shows all matching lots
- [ ] Recall resolution removes banner

### After BUILD_06: Analytics, Notifications & Polish

- [ ] Notification system event-driven routing functional
- [ ] Real-time listener on procedures creates notifications
- [ ] Notification bell badge shows unread count
- [ ] Drawer displays all notifications with types/icons
- [ ] Click notification navigates via actionUrl
- [ ] Mark read toggles read status
- [ ] Mark all read batch updates all
- [ ] Notification preferences modal configurable
- [ ] Quiet hours enforced (notifications delayed)
- [ ] Digest mode batches notifications
- [ ] Mandatory notifications always sent (signature requests)
- [ ] Dashboard metrics load from Firestore aggregation
- [ ] Procedure funnel chart shows status distribution
- [ ] Lag metrics show waiting procedures
- [ ] Clinician productivity table sortable
- [ ] Operational alerts banner shows critical issues
- [ ] Capsule inventory tracking visible
- [ ] Export buttons (PDF/CSV/PNG) functional
- [ ] Schedule Report modal saves to scheduled_reports
- [ ] Analytics Workbench filters persist across views
- [ ] Finding Prevalence chart drillable
- [ ] Longitudinal disease tracking shows trends
- [ ] Copilot panel shares filter context
- [ ] Save View creates saved_views document
- [ ] Share View sends to selected users
- [ ] AI QA Dashboard shows sensitivity/specificity
- [ ] Override patterns visible in heatmap
- [ ] Model drift alerts on threshold breach
- [ ] Activity Log displays all events
- [ ] Filter bar works (date, event type, user)
- [ ] Activity export downloads CSV
- [ ] Real-time activity updates appear
- [ ] Education Library searchable and filterable
- [ ] Assign to Patient button functional
- [ ] Education delivery triggers at check-in
- [ ] Education delivery triggers at post-sign
- [ ] Post-referral education suggestions shown
- [ ] All operations create audit log entries
- [ ] Firestore security rules prevent unauthorized access
- [ ] No console errors or warnings
- [ ] Application loads in < 2 seconds
- [ ] Real-time updates push within 1 second

---

## Section 7: Critical Bug Checklist

**If any of these occur, stop and debug before proceeding:**

- [ ] Firestore query timeout (> 5s response time)
- [ ] Cross-practice data leakage (user sees another practice's data)
- [ ] Missing audit log entry for critical operation
- [ ] State machine allows invalid transition
- [ ] Security rule allows unauthorized access
- [ ] Real-time listener doesn't update (stale data)
- [ ] Role-based access control not enforced (unauthorized screen accessible)
- [ ] Cloud Function timeout or error in logs
- [ ] PDF export blank or incomplete
- [ ] Notification not routed to correct user
- [ ] Procedure status stuck (cannot transition to next state)
- [ ] Clinician can sign for another user
- [ ] Voided procedure can be reopened
- [ ] Practice A user can see Practice B data
- [ ] Admin role switch not reflected in token
- [ ] Finding provenance metadata missing from report
- [ ] Education not delivered to patient after triggering

---

## Section 8: Performance & Load Testing

**Run after BUILD_06 is complete:**

```bash
TEST: Firestore Aggregation Performance
Scenario: Dashboard with 10,000 procedures in practice
Expected: Metrics calculated in < 2 seconds
Verification: Browser DevTools Network tab, Cloud Firestore metrics

TEST: Real-Time Listener Concurrency
Scenario: 5 clinicians simultaneously reviewing different procedures
Expected: Each receives real-time updates within 1 second
Verification: Open 5 browser windows, side-by-side, modify finding in one tab
Check: Other tabs update without page reload

TEST: Bulk Operation Performance
Scenario: "Confirm All Incidentals" on 50 incidentals
Expected: Batch write completes in < 3 seconds
Verification: Firestore Console shows single batch write operation

TEST: PDF Export Performance
Scenario: Export 30-page report to PDF
Expected: Generation completes in < 5 seconds
Verification: Cloud Function logs show execution time

TEST: Mobile Performance
Scenario: Load Viewer on 4G mobile connection
Expected: Screen interactive in < 3 seconds
Verification: Mobile DevTools Lighthouse score > 80

TEST: Browser Storage
Scenario: Auth token persists across page reloads
Expected: User stays logged in without re-entering credentials
Verification: Check localStorage for 'firebase-auth' key
```

---

## Section 9: UAT Sign-Off Checklist

**Before declaring build complete:**

- [ ] All 6 build packets implemented
- [ ] All acceptance criteria from each packet passing
- [ ] All Firestore collections created and populated
- [ ] All Cloud Functions deployed and tested
- [ ] All security rules applied and verified
- [ ] All TypeScript types defined
- [ ] All hooks implemented
- [ ] No critical bugs remaining
- [ ] All audit log entries tested
- [ ] All role-based access controls verified
- [ ] No console errors or warnings
- [ ] No Firestore quota exceeded
- [ ] Responsive on mobile devices
- [ ] Responsive on tablet devices
- [ ] Responsive on desktop
- [ ] Accessibility: keyboard navigation works
- [ ] Accessibility: color contrast OK
- [ ] Accessibility: ARIA labels present
- [ ] Performance: page load < 2 seconds
- [ ] Performance: real-time updates < 1 second
- [ ] Performance: bulk operations < 3 seconds
- [ ] Documentation: all Cloud Functions documented
- [ ] Documentation: all types documented
- [ ] Documentation: all hooks documented
- [ ] Tested with 5+ users concurrently
- [ ] Tested on Chrome, Firefox, Safari, Edge
- [ ] Tested on iOS Safari and Android Chrome

---

## Appendix: Test Data Fixtures

```javascript
// Test patient
{
  patientId: "PAT-TEST-001",
  firstName: "Jane",
  lastName: "Doe",
  mrn: "MRN123456",
  dateOfBirth: "1985-06-15",
  ssn: "123-45-6789",
  phone: "(555) 123-4567",
  email: "jane@example.com",
  emrSource: { system: "epic", syncedAt: now() }
}

// Test procedure (ready_for_review)
{
  procedureId: "PROC-TEST-001",
  patientId: "PAT-TEST-001",
  studyType: "upper_gi",
  status: "ready_for_review",
  assignedTo: ["uid-clinician-001"],
  capsuleInfo: { lotNumber: "ABC123", serialNumber: "XYZ789", expiryDate: future_date() }
}

// Test finding (confirmed)
{
  findingId: "FIND-TEST-001",
  findingType: "ulcer",
  classification: "gastric ulcer",
  confidence: 0.95,
  origin: "ai_detected",
  reviewStatus: "confirmed",
  confirmedBy: "uid-clinician-001",
  reportable: true,
  provenance: {
    modelVersion: "v2.1",
    confidence: 0.95,
    createdBy: "ai_system"
  }
}

// Test staff (clinical_staff role)
{
  staffId: "uid-staff-001",
  email: "staff@practice.com",
  firstName: "John",
  lastName: "Smith",
  role: "clinical_staff",
  status: "active",
  clinicIds: ["clinic-001"]
}

// Test practice settings
{
  practiceId: "prac-TEST-001",
  name: "Test Medical Center",
  deliveryDefaults: {
    emailRecipients: { patient: true, referringPhysician: true }
  },
  indicationTemplates: [
    {
      studyType: "upper_gi",
      indications: ["GERD evaluation", "dysphagia", "upper GI bleeding"]
    }
  ]
}
```

---
