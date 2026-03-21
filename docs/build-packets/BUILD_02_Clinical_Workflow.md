# Build Packet 02: Clinical Workflow & Procedure Lifecycle

## Objective
Implement the complete clinical workflow with procedure CRUD, 9-state lifecycle transitions, capsule upload with validation, and status-based routing. Wire Firestore writes to trigger state machine enforcement via Cloud Functions.

## Files to Have Open in Firebase Studio
- `types/procedure.ts`, `types/enums.ts`
- `screens/CheckIn.tsx`, `screens/CapsuleUpload.tsx`, `screens/Viewer.tsx`, `screens/Summary.tsx`
- `screens/Dashboard.tsx`, `screens/Procedures.tsx`, `screens/MyWorklist.tsx`
- `lib/hooks.ts` (add procedure hooks)
- `lib/routeByStatus.ts` (routing table)
- `scaffold/firestore.rules` (procedure rules)

## Requirements Implemented

### ZCW-BRD-0293: Procedure Lifecycle UI
9-state color-coded status badges with distinct visual indicators. States: `capsule_return_pending`, `capsule_received`, `ready_for_review`, `draft`, `appended_draft`, `completed`, `completed_appended`, `closed`, `void`. Each state has unique color (green/blue/yellow/red/orange), icon, and allowed actions per role.

### ZCW-BRD-0276: Capsule Package Scan at Check-In
Barcode/QR scan with serial/lot/UDI auto-population. Recall validation checks scanned lot against capsule recall list. Scan-first UX: camera launches by default, manual entry as fallback.

### ZCW-BRD-0288: Structured Indication Templates
Check-in loads practice-defined indication templates per study type. Clinical staff selects from checkboxes rather than free-text. Templates configurable in Practice Settings (SCR-23).

### ZCW-BRD-0250: New Procedure Navigation
Row action "New Procedure" in Patients list navigates to SCR-08 Check-In with patientId query parameter pre-populated.

### ZCW-BRD-0251–0252: Analytics Export & Scheduling
Dashboard and Worklist support PDF/CSV/PNG export and scheduled email delivery. Implemented via Cloud Function `exportDashboard()`.

## Implementation Steps

### Step 1: Procedure Firestore Schema & CRUD

Prompt Gemini:
```
Create Firestore integration for procedures with full CRUD and lifecycle management.

1. Collection structure:
   `practices/{practiceId}/procedures/{procedureId}`

   Document schema:
   {
     procedureId: string (PROC-NNNN format, auto-generated)
     patientId: string (reference to patient)
     practiceId: string
     clinicId: string
     studyType: 'upper_gi' | 'sb_diagnostic' | 'sb_crohns' | 'colon'
     status: 'capsule_return_pending' | 'capsule_received' | 'ready_for_review' |
             'draft' | 'appended_draft' | 'completed' | 'completed_appended' | 'closed' | 'void'
     createdAt: timestamp
     createdBy: userId (reference)
     assignedTo: userId[] (array of clinician UIDs assigned to review)
     assignedBy: userId (who assigned)
     capsuleInfo: {
       lotNumber: string
       serialNumber: string
       barcode: string
       scanMethod: 'camera_barcode' | 'camera_qr' | 'manual_entry'
       scannedAt: timestamp
       expiryDate: date
     }
     indications: string[] (selected from templates)
     clinicalNotes: string (free-text pre-procedure notes)
     preReviewConfig: {
       sensitivity: 1-10 (incidental findings sensitivity)
       primaryFocus: string
       crohnsMode: boolean
     }
     findings: {
       count: number
       confirmed: number
       aiDetected: number
       clinicianAdded: number
     }
     procedureCompletedAt?: timestamp
     signedAt?: timestamp
     reportId?: string (reference to signed report)
     transferredTo?: userId (if review transferred)
     transferredAt?: timestamp
     updatedAt: timestamp
     updatedBy: userId
     archivedAt?: timestamp
     archivedBy?: userId
   }

2. Create Firestore collection: `procedures`

3. Create Cloud Function `createProcedure(input)` that:
   - Validates input with Zod schema
   - Generates procedureId (PROC-NNNN, incremental)
   - Sets initial status = 'capsule_return_pending'
   - Creates document in `practices/{practiceId}/procedures/{procedureId}`
   - Creates audit log entry: 'procedure_created'
   - Returns { procedureId, success }

4. Create Cloud Function `transitionProcedureStatus(procedureId, newStatus, metadata)`:
   - Validates state machine rules (see Step 5)
   - Updates status field
   - Adds timestamp to audit trail
   - Returns { success, newStatus, error }

5. Create hooks in `lib/hooks.ts`:
   - `useProcedure(procedureId)`: returns single procedure + real-time updates
   - `useProcedures(filters)`: returns all procedures, filtered by status/clinic/assignee
   - `useProceduresByPatient(patientId)`: returns procedures for one patient
   - `createProcedure(input)`: creates new procedure, returns procedureId
   - `updateProcedureStatus(procedureId, newStatus)`: transitions status

Language: TypeScript with Firestore SDK.
```

### Step 2: Check-In Flow Integration

Prompt Gemini:
```
Update CheckIn.tsx to persist to Firestore and enforce contraindication gates.

1. Patient selection:
   - If no patientId in query params: show patient selector dropdown
   - If patientId provided: load patient from Firestore
   - Display patient demographics (pre-populated from patient document)
   - Show EMR source badges on EMR fields (0278)

2. Identity verification (0283):
   - Before capsule ingestion: click "Verify Patient Identity"
   - Modal shows patient name, DOB, MRN
   - Clinician confirms "This is the correct patient"
   - Gate prevents proceeding without verification

3. Study type selection:
   - Radio buttons: Upper GI, SB-Diagnostic, SB-Crohn's, Colon
   - Auto-configures downstream tools (0228)
   - Loads indication templates for selected study type

4. Structured indication templates (0288):
   - Load from `practices/{practiceId}/indicationTemplates` per study type
   - Example for Upper GI: dysphagia, GERD evaluation, Barrett's surveillance, upper GI bleeding
   - Checkboxes for each template
   - Free-text "Other" fallback
   - Templates configurable in Practice Settings (SCR-23)

5. Capsule scan (Primary UX - Scan First) (0276):
   - Camera launches by default (camera barcode scan mode)
   - Manual entry fallback
   - Barcode scanning extracts: lotNumber, serialNumber, expiryDate
   - Validation:
     a. Check expiry date >= today (error if expired)
     b. Check against capsule recall list (error if recalled lot)
     c. Check for duplicate serial in practice (warning)
   - Show scan results: "Lot ABC123, Serial XYZ789, Expires 2026-06-15"

6. Pre-procedure checks:
   - 6-item checklist (all mandatory)
   - Items: "Informed consent obtained", "Contraindication review completed",
     "Procedure preparation verified", "Patient NPO confirmed",
     "Capsule package integrity verified", "EMR procedure record updated"
   - Checkboxes toggle
   - Gate: all must be checked to proceed

7. Informed consent:
   - Checkbox: "Informed consent captured"
   - Method selector: Digital / Paper / Video recorded
   - If Digital: show checkbox and timestamp capture
   - If Paper: note "Scanned PDF uploaded" (future feature)
   - If Video: note "Video recorded" (future feature)

8. Contraindication review (0283):
   - 4-item gate:
     a. Pacemaker or metallic implant present?
     b. Swallowing disorder or dysphagia?
     c. Bowel obstruction or stricture?
     d. Known allergy to capsule materials?
   - Selectors for each: "None", "Suspected", "Confirmed"
   - Gate: if ANY "Suspected" or "Confirmed" → "PROCEDURE BLOCKED" banner
   - Message: "This patient should not swallow the capsule. Consult with physician."
   - Proceed button disabled until all are "None"

9. Capsule ingestion recording:
   - Timestamp captured: "Capsule swallowed at HH:MM"
   - Display: "Patient is now in capsule return phase (1-3 days expected)"
   - Inform: "After capsule passes, proceed to Capsule Upload screen"

10. Proceed button:
    - Enabled only when: patient verified + study type selected + indications selected +
      pre-checks all done + consent obtained + all contraindications are "None"
    - onClick:
      a. Call createProcedure() with all data
      b. Wait for procedureId return
      c. Navigate to SCR-10 Viewer with procedureId
      d. Toast: "Procedure PROCxxxx created. Patient ready for capsule return."

11. Firestore write:
    - Call `createProcedure()` Cloud Function with:
      {
        patientId, practiceId, clinicId, studyType, indications,
        capsuleInfo: { lotNumber, serialNumber, expiryDate, scanMethod, scannedAt },
        preReviewConfig: { sensitivity: 5 (default), primaryFocus: studyType },
        createdBy: currentUser.uid,
        createdAt: FieldValue.serverTimestamp()
      }
    - Initial status set to 'capsule_return_pending' by Cloud Function
```

### Step 3: Capsule Upload Integration

Prompt Gemini:
```
Update CapsuleUpload.tsx to handle Cloud Storage integration and Firestore status transition.

1. Load procedure by procedureId from URL:
   - Call useProcedure(procedureId)
   - Display procedure context: patient name, study type, capsule serial/lot
   - Show banner: "Procedure PROCxxxx ready for capsule upload"

2. Upload simulation (Cloud Storage integration):
   - File input: accept .zip (simulated capsule data package)
   - Show: "Upload capsule study data (typically 500MB–1GB)"
   - Drag-and-drop area for file upload
   - Progress bar: simulates upload (0–100%)
   - Actual integration: upload to `gs://bucket/capsule-studies/{practiceId}/{procedureId}/`

3. Data validation summary:
   - After upload: show validation results card
   - Frame count: "8,400 frames"
   - Duration: "7 minutes 32 seconds"
   - Quality score: "95/100" (AI analysis)
   - Camera integrity: "OK (both cameras functional)"
   - Validation gate: if Quality < 70, show warning "Low quality. Proceed with caution?"

4. Capsule info confirmation:
   - Show capsule serial/lot from SCR-08
   - "Confirm this matches the uploaded study data"
   - Checkbox to confirm match

5. Proceed button:
   - Enabled after: file uploaded + validation passed + capsule confirmed
   - onClick:
     a. Update procedure status to 'capsule_received' (Cloud Function call)
     b. Set capsuleUploadedAt timestamp
     c. Cloud Function auto-transitions to 'ready_for_review' if all conditions met
     d. Navigate to SCR-10 Viewer

6. Firestore writes:
   - Cloud Function `uploadCapsuleStudy()`:
     {
       procedureId, practiceId,
       fileSize: bytes,
       frameCount: number,
       duration: string,
       qualityScore: number,
       uploadedAt: FieldValue.serverTimestamp(),
       uploadedBy: currentUser.uid
     }
   - Updates procedure document with capsuleUploadedAt, qualityScore
   - Transitions status to 'capsule_received', then 'ready_for_review'
   - Creates audit log: 'capsule_uploaded'
```

### Step 4: Dashboard & Worklist Firestore Integration

Prompt Gemini:
```
Update Dashboard.tsx and MyWorklist.tsx to read from Firestore with role-based filtering.

Dashboard (SCR-01):
1. Load metrics from Firestore aggregation:
   - "Awaiting Review": count(procedures where status in ['ready_for_review', 'appended_draft']
     AND assignedTo contains currentUser.uid)
   - "In Progress": count(procedures where status = 'draft' AND assignedTo contains currentUser.uid)
   - "Completed This Week": count(reports where createdAt >= (now - 7 days) AND signedBy = currentUser.uid)
   - For admin/clinician_admin: show ALL clinic numbers, not just personal

2. Recent procedures table:
   - Query: procedures ordered by createdAt DESC, limit 5
   - For non-admin: filter by assignedTo contains currentUser.uid
   - Display: patient name, study type, status, created date
   - Status badge with color per 0293
   - Click row → navigate via getRouteForProcedure(procedureId, status)

3. Notification bell:
   - Read-time listener to notifications collection per user
   - Badge count = unread notifications
   - Click → open drawer (see notification integration in BUILD_06)

4. "Start Next Review" button:
   - Query procedures where status = 'ready_for_review' AND assignedTo contains currentUser.uid
   - Order by createdAt ASC (oldest first)
   - Click → navigate to SCR-10 Viewer for that procedure
   - If none found: toast "No studies awaiting review"

MyWorklist (SCR-35) (0287):
1. Load procedure list with filters:
   - Base query: `practices/{practiceId}/procedures` with statuses [ready_for_review, draft, appended_draft]
   - For clinician_auth/clinician_noauth: filter assignedTo contains currentUser.uid
   - For clinician_admin: show all clinic procedures
   - Real-time listener with onSnapshot

2. Filter UI:
   - Study type selector: Upper GI, SB-Diagnostic, SB-Crohn's, Colon, All
   - Urgency selector: Routine, Urgent, Emergent (set at check-in or by priority rules)
   - Status selector: Awaiting Review, In Progress, All
   - Search: by patient name, MRN, procedure ID

3. Worklist table columns:
   - Patient name (click → SCR-14 Patient Overview)
   - MRN
   - Study type (with icon)
   - Status (color badge, 0293)
   - Urgency (color: gray/amber/red, 0287)
   - Days pending (color: green/amber/red based on aging rules)
   - Created date
   - Clinician (if admin view)

4. Row actions:
   - Click row → navigate via getRouteForProcedure(procedureId, status)
   - Transferred review acceptance: if procedure.transferredTo = currentUser.uid,
     show "Accept Transfer" button → click to lock ownership

5. Sorting & pagination:
   - Default sort: urgency DESC, days pending DESC
   - Sortable columns: patient, study type, urgency, status, days pending
   - Pagination: 25 per page with next/prev

6. Firestore queries:
   - Use composite indexes for (practiceId, status, createdAt)
   - Use (practiceId, assignedTo, status) for personal worklist
```

### Step 5: State Machine Enforcement

Prompt Gemini:
```
Create Cloud Function `enforceStateMachine()` that validates and enforces the 9-state procedure
lifecycle transitions. This function is triggered on procedure status update.

Valid transition matrix:
- capsule_return_pending → capsule_received (when upload happens)
- capsule_received → ready_for_review (auto-transition after upload validation)
- ready_for_review → draft (when review starts)
- draft → appended_draft (when clinician adds findings)
- appended_draft → appended_draft (additional appends)
- draft → completed (when report signed)
- appended_draft → completed_appended (when report signed on appended draft)
- draft → void (clinician cancels review)
- appended_draft → void (clinician cancels review)
- completed → closed (after 90 days or manual closure)
- completed_appended → closed (after 90 days or manual closure)
- ready_for_review → void (supervisor voids review without starting)
- (any state) → closed (admin can force-close)

Invalid transitions should be rejected with error message.

Implementation:
1. Trigger: on write to procedures/{procedureId}, before commit
2. Read currentStatus from existing document
3. Read newStatus from write request
4. Check if transition in ALLOWED_TRANSITIONS map
5. If invalid: throw error "Cannot transition from {current} to {new}"
6. If valid: allow write, add transitionedAt: FieldValue.serverTimestamp()
7. If transition produces state change (e.g., ready_for_review → draft),
   trigger AI analysis and findings generation in Copilot Engine

Language: JavaScript with Firebase Admin SDK.
```

## Acceptance Criteria

- [ ] Procedure create persists to Firestore with PROC-NNNN ID
- [ ] Initial status set to 'capsule_return_pending'
- [ ] Check-In patient selector loads patients from Firestore
- [ ] EMR source badges display on pre-populated fields
- [ ] Identity verification gate blocks proceeding without confirmation
- [ ] Study type selection works and auto-configures downstream
- [ ] Indication templates load from Practice Settings
- [ ] Capsule scan validates expiry date and recall list
- [ ] Duplicate serial warning shows
- [ ] Pre-procedure checks enforce all 6 items checked
- [ ] Informed consent captures method and timestamp
- [ ] Contraindication review gates all 4 items, blocks if any "Suspected"/"Confirmed"
- [ ] Proceed creates procedure and navigates to Viewer
- [ ] Capsule Upload accepts file, validates quality
- [ ] Quality score < 70 shows warning but allows proceed
- [ ] Upload status transition triggers 'capsule_received' then 'ready_for_review'
- [ ] Dashboard metrics load from Firestore
- [ ] My Worklist displays assigned procedures with filters
- [ ] Status-based routing works: each status → correct destination screen
- [ ] Color-coded status badges display per 0293
- [ ] Urgency badges (routine/urgent/emergent) show
- [ ] Days pending tracking color-codes (red/amber/green)
- [ ] State machine rejects invalid transitions with error
- [ ] Audit log entries created for create, upload, status transitions
- [ ] Real-time listeners update Dashboard/Worklist without reload
- [ ] Firestore security rules prevent cross-practice procedure access
- [ ] Procedures scoped to assignedTo clinician can be viewed by that clinician

## Testing Notes

Test Check-In flow:
1. Select patient → verify patient demographics pre-populate
2. Select study type → verify indication templates change
3. Scan barcode → verify serial/lot auto-populate
4. Skip contraindication check → verify gate prevents proceed
5. Check all contraindications as "None" → verify proceed enables
6. Click Proceed → verify procedure created in Firestore, toast shows PROC-NNNN

Test Capsule Upload:
1. Upload file → verify progress bar shows
2. Skip quality validation → verify warning shows
3. Confirm capsule → verify status transitions to 'ready_for_review'
4. Click Proceed → verify navigates to Viewer

Test Dashboard:
1. Verify "Awaiting Review" count matches own assigned procedures in 'ready_for_review'
2. Click "Start Next Review" → verify navigates to oldest ready_for_review procedure

Test Worklist:
1. Filter by study type → verify table updates
2. Filter by urgency → verify only selected urgency shows
3. Sort by days pending → verify oldest first
4. Click procedure row → verify correct screen per status

Test State Machine:
1. Create procedure (status = capsule_return_pending)
2. Call uploadCapsule() → status transitions to 'capsule_received'
3. Attempt invalid transition (e.g., draft → capsule_received) → should error
4. Attempt valid transition (draft → completed) → should succeed

---
