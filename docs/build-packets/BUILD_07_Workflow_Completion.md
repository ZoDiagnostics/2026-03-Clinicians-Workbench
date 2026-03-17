# BUILD_07 — Workflow Completion Screens

**Screens:** SCR-03 Manage Procedures, SCR-04 Reports & Analytics Hub, SCR-09 Upload Capsule Study, SCR-11 Review Procedure Summary
**Depends on:** BUILD_01 (Auth), BUILD_02 (Clinical Workflow core), BUILD_03 (Viewer & Findings)
**Firebase services:** Firestore (procedures, reports, findings), Cloud Storage (capsule uploads)

---

## SCR-03: Manage Procedures (`/procedures`)

### Purpose
Central procedure listing with filtering, sorting, bulk actions, and status-based routing.

### Requirements
- ZCW-BRD-0249: Bulk status updates for procedures
- ZCW-BRD-0293: Procedure lifecycle UI (9-state status badges)

### Firestore Integration
```typescript
// Real-time procedure list for practice
const q = query(
  collection(db, 'procedures'),
  where('practiceId', '==', currentUser.practiceId),
  orderBy('updatedAt', 'desc'),
  limit(50)
);
const unsubscribe = onSnapshot(q, (snapshot) => { /* update state */ });
```

### UI Elements
1. **Data table** with columns: Patient Name, Study Type, Status (colored badge), Assigned Clinician, Date Created, Date Updated
2. **Filter bar**: Status dropdown (9 states), Study Type dropdown (4 types), Date range picker, Assigned Clinician dropdown
3. **Bulk actions toolbar** (visible when rows selected): Update Status, Reassign Clinician, Export Selected
4. **Row click** → `getRouteForProcedure(procId, status)` status-based routing (see ZOCW_REFERENCE.md §3)
5. **"New Procedure" button** → navigates to `/workflow/checkin/{newProcId}?patientId=`
6. **Pagination** with page size selector (25/50/100)

### Cloud Function: `bulkUpdateProcedureStatus`
```typescript
// Callable function for bulk status updates
// Validates each transition against state machine
// Logs audit entries for each procedure
// Returns success/failure count
```

### Acceptance Criteria
- [ ] Procedure list loads with real-time updates
- [ ] All 9 status badges render with correct colors (see enums.ts StatusColorMap)
- [ ] Bulk status update validates each transition against state machine
- [ ] Row click routes to correct workflow screen based on status
- [ ] Filters narrow results correctly (compound Firestore queries)
- [ ] Pagination works with cursor-based approach

---

## SCR-04: Reports & Analytics Hub (`/reports-hub`)

### Purpose
Central hub for viewing signed reports, delivery history, and report analytics.

### Requirements
- ZCW-BRD-0251: Analytics export (PDF/CSV/PNG)
- ZCW-BRD-0252: Scheduled delivery of analytics

### Firestore Integration
```typescript
// Signed reports for practice
const q = query(
  collection(db, 'reports'),
  where('practiceId', '==', currentUser.practiceId),
  where('status', '==', 'signed'),
  orderBy('signedAt', 'desc'),
  limit(50)
);
```

### UI Elements
1. **Signed Reports table**: Patient, Study Type, Signed By, Signed Date, Delivery Status, Actions
2. **Delivery history panel**: Shows all deliveries per report (email, print, download, portal)
3. **Quick filters**: Date range, Clinician, Study Type, Delivery Status
4. **Export button**: Export report list as CSV
5. **Report click** → Opens report in read-only view (`/workflow/report/{procId}`)
6. **Re-deliver button** → Opens delivery modal for re-sending

### Acceptance Criteria
- [ ] Only signed reports appear (enforced by query + security rules)
- [ ] Delivery history shows all delivery records per report
- [ ] Export generates valid CSV
- [ ] Role access: all authenticated roles except clinical_staff

---

## SCR-09: Upload Capsule Study (`/workflow/upload/{procId}`)

### Purpose
Upload capsule study video file after capsule is received. Validates file, calculates quality score, transitions procedure status.

### Requirements
- Related to procedure workflow (capsule_received → ready_for_review transition)

### Cloud Storage Integration
```typescript
// Upload to: capsule-studies/{practiceId}/{procedureId}/{filename}
const storageRef = ref(storage, STORAGE_PATHS.CAPSULE_STUDIES(practiceId, procedureId) + '/' + file.name);
const uploadTask = uploadBytesResumable(storageRef, file);
uploadTask.on('state_changed', (snapshot) => {
  const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
  setUploadProgress(progress);
});
```

### UI Elements
1. **6-step workflow stepper** (step 2 "Upload" active)
2. **Drop zone** for capsule study file (drag & drop or click to browse)
3. **Upload progress bar** with percentage and estimated time
4. **File validation panel**: File type check, size check, format validation
5. **Quality score display** (post-upload): Video quality metrics
6. **"Proceed to Review" button** → triggers status transition to `ready_for_review`, navigates to `/workflow/viewer/{procId}`
7. **Cancel button** → confirms, returns to dashboard

### Cloud Function: `uploadCapsuleStudy`
```typescript
// Triggered after upload completes
// Validates file format and integrity
// Calculates quality score
// Updates procedure with upload metadata
// Transitions status: capsule_received → ready_for_review
```

### Acceptance Criteria
- [ ] File upload works with progress indicator
- [ ] Only valid capsule study formats accepted
- [ ] Upload stored at correct Cloud Storage path with practiceId scoping
- [ ] Status transitions correctly after successful upload
- [ ] Stepper shows step 2 as active, step 1 as completed/clickable
- [ ] Error handling for failed uploads with retry option

---

## SCR-11: Review Procedure Summary (`/workflow/summary/{procId}`)

### Purpose
Summary view of all confirmed findings, AI analysis results, transit times, quality metrics. Read-only for closed/void procedures.

### Requirements
- ZCW-BRD-0254: Incidental findings referral generation
- ZCW-BRD-0255: Transfer review / clinician handoff
- ZCW-BRD-0266: Voice commands (ambient capture)
- ZCW-BRD-0267-0273: Various analysis and scoring requirements
- ZCW-BRD-0282: Clinical finding provenance metadata
- ZCW-BRD-0285: Secure delegation and coverage

### Firestore Integration
```typescript
// Load procedure + all findings
const procDoc = await getDoc(doc(db, 'procedures', procId));
const findingsQuery = query(
  collection(db, 'procedures', procId, 'findings'),
  where('reviewStatus', '==', 'confirmed'),
  orderBy('anatomicalRegion')
);
```

### UI Elements
1. **6-step workflow stepper** (step 4 "Summary" active)
2. **Findings summary panel**: Grouped by anatomical region, with primary/incidental split
3. **Transit times panel**: Landmark-to-landmark times with normal range indicators
4. **Quality metrics panel**: CDR, MVS, Completeness scores
5. **Risk scores panel**: Bleeding, Polyp, Lewis, Retention scores with severity indicators
6. **AI analysis confidence panel**: Per-finding confidence scores, provenance badges
7. **Referral generation section**: For incidental findings requiring follow-up
8. **Transfer review button**: Handoff to another clinician (ZCW-BRD-0255)
9. **"Proceed to Report" button** → navigates to `/workflow/report/{procId}`
10. **Read-only mode** for `closed` and `void` statuses (no action buttons)

### Acceptance Criteria
- [ ] All confirmed findings displayed grouped by region
- [ ] Transit times calculated and displayed with normal range comparison
- [ ] Quality metrics auto-calculated from findings data
- [ ] Risk scores displayed with visual severity indicators
- [ ] Provenance metadata (AI vs manual) shown per finding
- [ ] Read-only mode enforced for closed/void procedures
- [ ] Transfer review creates audit log entry
- [ ] Stepper navigation works (backward to completed steps)

---
