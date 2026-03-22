# Test Validation Packet — Zo Clinicians Workbench (ZoCW) v3.2.0

**Purpose:** Acceptance criteria and testable scenarios for functional user testing. Organized by persona (role) with realistic user journeys.
**Last Updated:** 2026-03-20
**Live App:** https://cw-e7c19.web.app
**Test Data:** Run `npx tsx seed-demo.ts` in Firebase Studio to populate 10 patients, 15 procedures (all 9 statuses), reports, findings, notifications, audit log, staff, clinics, practice settings.

---

## Section 1: Test Credentials & Roles

| Persona | Login | Role | What They Do |
|---|---|---|---|
| Dr. Sarah Chen | clinician@zocw.com / password | `clinician_auth` | Reviews studies, confirms findings, signs reports |
| Cameron Plummer | cameron.plummer@gmail.com / [password] | `clinician_admin` | All clinical work + admin, staff management, practice settings |
| Google Sign-In | Any Google account | Varies (set via claims) | Only works on cw-e7c19.web.app (not localhost) |

**Note:** Additional test users (clinician_noauth, admin, clinical_staff) require Firebase Console → Authentication → Add User, then `setInitialUserClaims` to provision role claims.

---

## Section 2: Critical Path Test — Full Clinical Workflow

**Objective:** Walk through the complete capsule endoscopy workflow from check-in to report delivery.

### Step 1: Login
- Navigate to https://cw-e7c19.web.app
- Login with clinician_auth credentials
- **Expected:** Dashboard loads with sidebar, header shows user name and role
- **Verify:** Sidebar shows clinical sections (Dashboard, Worklist, Patients, Procedures, Reports Hub)

### Step 2: Navigate to a Procedure via Worklist
- Click "Worklist" in sidebar
- **Expected:** List of procedures assigned to current clinician
- Click a procedure with status `ready_for_review`
- **Expected:** Navigate to `/viewer/:procedureId`

### Step 3: Viewer — Pre-Review Checklist
- **Expected:** Pre-Review checklist banner shown at top
- **Expected:** Findings panel is LOCKED (grayed out, "Locked" badge visible)
- **Expected:** Frame controls are disabled (no frames loaded — "No Capsule Frames Loaded" state)
- **Expected:** Yellow guidance banner: "Complete the Pre-Review Checklist above to unlock..."
- Complete all checklist items and click confirm
- **Expected:** Procedure status transitions to `draft`, findings panel unlocks, "Go to Report" button appears

### Step 4: Viewer — Add Findings
- Select anatomical region from dropdown
- Type a finding classification (e.g., "polyp")
- Click "+ Add"
- **Expected:** Finding appears in findings list with "Manual" provenance badge, "pending" review status
- **Expected:** Finding shows "@ Frame 0" (no real frames loaded yet)
- Add 2-3 more findings

### Step 5: Navigate to Report
- Click "Go to Report →" in patient info bar
- **Expected:** Navigate to `/report/:procedureId`
- **Expected:** Report screen shows findings list, editable sections (Findings, Impression, Recommendations)
- **Expected:** Copilot "Generate Clinical Impression" button visible

### Step 6: Copilot Auto-Draft (requires Gemini API billing enabled)
- Click "Generate Clinical Impression"
- **Expected:** Loading indicator, then AI-generated text appears
- Click "Accept" to push AI text into the impression field
- Click "Generate Recommendations"
- **Expected:** AI-generated recommendations appear
- Click "Accept"
- Click "Save" to persist changes
- **Expected:** Report saved to Firestore

### Step 7: Sign & Deliver
- Click "Proceed to Sign & Deliver"
- **Expected:** Navigate to `/sign-deliver/:procedureId`
- **Expected:** Report summary shown, patient name displayed
- Click "Sign Report"
- **Expected:** Report status → `signed`, "Report Signed" confirmation shown
- **Expected:** Delivery options appear (PDF Download, Print, Email to Patient, etc.)
- Select a delivery method, click "Send"
- **Expected:** Delivery confirmation, procedure status → `completed`
- **Expected:** Navigation option back to Dashboard

### Step 8: Verify Final State
- Navigate to Dashboard
- **Expected:** The procedure now shows "Completed" status badge
- Navigate to Procedures screen
- **Expected:** The procedure row shows green "Completed" badge
- Click the completed procedure
- **Expected:** Routes to `/summary/:procedureId` (read-only view)

---

## Section 3: Persona-Based Test Scenarios

### 3A: Authorized Clinician (clinician_auth)

**Day-in-the-life:** Dr. Chen arrives, checks her worklist, reviews assigned capsule studies, generates reports, signs and delivers.

| # | Scenario | Steps | Expected | Screen |
|---|---|---|---|---|
| CA-01 | Login and view dashboard | Login → Dashboard loads | Patient count, procedure stats, status badges visible | SCR-01 |
| CA-02 | Check worklist | Sidebar → Worklist | Only procedures assigned to current clinician shown | SCR-35 |
| CA-03 | Open a ready_for_review procedure | Click procedure in worklist | Routes to Viewer, pre-review checklist shown | SCR-10 |
| CA-04 | Complete pre-review checklist | Check all items → Confirm | Status → draft, findings panel unlocks | SCR-10 |
| CA-05 | Add manual finding | Select region, type finding, click Add | Finding appears with Manual badge | SCR-10 |
| CA-06 | Delete a finding | Click ✕ on finding | Finding removed from list | SCR-10 |
| CA-07 | Navigate to Report | Click "Go to Report" | Report screen loads with findings | SCR-12 |
| CA-08 | Edit report sections | Type in findings/impression/recommendations | Text persists, Save button works | SCR-12 |
| CA-09 | Use Copilot auto-draft | Click "Generate Clinical Impression" | AI text generated (or error if no API key) | SCR-12 |
| CA-10 | Accept AI text | Click "Accept" on auto-draft | AI text populates impression field | SCR-12 |
| CA-11 | Navigate to Sign & Deliver | Click "Proceed to Sign" | Sign screen loads with report summary | SCR-13 |
| CA-12 | Sign report | Click "Sign Report" | Report status → signed, confirmation shown | SCR-13 |
| CA-13 | Select delivery method | Check "Email to Patient" → Send | Delivery confirmation shown | SCR-13 |
| CA-14 | View completed procedure | Navigate to Procedures → click completed row | Routes to summary (read-only) | SCR-11 |
| CA-15 | View patient list | Sidebar → Patients | Patient list with names, MRN, DOB | SCR-02 |
| CA-16 | View patient overview | Click patient name | Patient overview with demographics | SCR-14 |
| CA-17 | View patient procedure history | Patient overview → Procedures tab | List of patient's procedures with status | SCR-18 |
| CA-18 | Verify blocked screens | Navigate to /admin via URL | Should redirect or show access denied | SCR-06 |
| CA-19 | View notifications | Click bell icon in header | Notification drawer opens, shows notifications | Header |
| CA-20 | Mark notification read | Click a notification | Notification marked as read, count decreases | Header |
| CA-21 | View reports hub | Sidebar → Reports Hub | List of signed reports | SCR-04 |
| CA-22 | Sign out | Click sign out in header | Redirect to login screen | Header |
| CA-23 | View void procedure | Click a voided procedure | Routes to Summary (read-only) | SCR-11 |
| CA-24 | View closed procedure | Click a closed procedure | Routes to Summary (read-only) | SCR-11 |

### 3B: Clinician Administrator (clinician_admin)

**Day-in-the-life:** Cameron does clinical work AND manages practice settings, staff, and clinics.

| # | Scenario | Steps | Expected | Screen |
|---|---|---|---|---|
| AD-01 | All clinician_auth scenarios | Run CA-01 through CA-24 | All should pass (clinician_admin has superset of permissions) | Various |
| AD-02 | Access admin panel | Sidebar → Admin | Admin screen loads with sub-navigation | SCR-06 |
| AD-03 | Manage staff | Admin → Staff | Staff list with roles, can see role badges | SCR-22 |
| AD-04 | Navigate admin sub-screens | Click Staff/Practice/Clinics/Subscription/ICD Codes | Each sub-screen loads, "Back to Admin" button works | SCR-22-27 |
| AD-05 | View practice settings | Admin → Practice | Practice settings form loads | SCR-23 |
| AD-06 | Manage clinics | Admin → Clinics | Clinic list with addresses | SCR-24 |
| AD-07 | View subscription | Admin → Subscription | Subscription plan info displayed | SCR-25 |
| AD-08 | Manage ICD codes | Admin → ICD Codes | ICD code list / favorites | SCR-27 |
| AD-09 | View activity log | Sidebar → Activity Log | Audit entries with timestamps, users, event types | SCR-07 |
| AD-10 | View operations dashboard | Sidebar → Operations | KPI cards, procedure funnel, status breakdown | SCR-29 |
| AD-11 | View analytics | Sidebar → Analytics | Charts for study type, status, urgency, demographics | SCR-30 |
| AD-12 | View AI QA | Sidebar → AI QA | AI quality metrics dashboard | SCR-33 |
| AD-13 | Create new procedure | Procedures → New Procedure (if modal exists) | Procedure creation form | SCR-03 |
| AD-14 | Register new patient | Patients → Register Patient (if modal exists) | Patient registration form | SCR-02 |

### 3C: Clinical Staff (clinical_staff) — If Configured

**Day-in-the-life:** Front desk staff manages patient check-in and capsule upload.

| # | Scenario | Steps | Expected | Screen |
|---|---|---|---|---|
| CS-01 | Login as clinical_staff | Login with staff credentials | Dashboard loads, limited sidebar | SCR-01 |
| CS-02 | View patients | Sidebar → Patients | Patient list visible | SCR-02 |
| CS-03 | Navigate to check-in | Click pending procedure | CheckIn screen loads | SCR-08 |
| CS-04 | Complete check-in consent | Check consent box → Submit | Status → capsule_received, navigates to upload | SCR-08 |
| CS-05 | Capsule upload confirmation | Confirm upload → Submit | Status → ready_for_review | SCR-09 |
| CS-06 | Verify no admin access | Navigate to /admin via URL | Redirect or access denied | SCR-06 |
| CS-07 | Verify no sign access | Navigate to /sign-deliver/:id via URL | Access denied (cannot sign) | SCR-13 |
| CS-08 | View education | Sidebar → Education | Education library visible | SCR-05 |

### 3D: Non-Authorized Clinician (clinician_noauth) — If Configured

**Day-in-the-life:** A clinician who can review but NOT sign reports.

| # | Scenario | Steps | Expected | Screen |
|---|---|---|---|---|
| CN-01 | Full review workflow | Complete CA-01 through CA-10 | All should pass up to report editing | Various |
| CN-02 | Cannot sign report | Navigate to Sign & Deliver | Should show "You do not have signing authority" or similar | SCR-13 |
| CN-03 | No admin access | Navigate to /admin | Redirect or access denied | SCR-06 |

---

## Section 4: Status-Based Routing Verification

**Objective:** Verify every procedure status routes to the correct screen when clicked.

| Procedure Status | Expected Route | Expected Screen | Behavior |
|---|---|---|---|
| `capsule_return_pending` | `/checkin/:procedureId` | CheckIn | Consent form, patient info |
| `capsule_received` | `/capsule-upload/:procedureId` | CapsuleUpload | Upload confirmation |
| `ready_for_review` | `/viewer/:procedureId` | Viewer | Pre-Review checklist shown, findings locked |
| `draft` | `/report/:procedureId` | Report | Findings confirmed, report editing |
| `appended_draft` | `/report/:procedureId` | Report | Appended findings, report editing |
| `completed` | `/summary/:procedureId` | Summary (read-only) | Report signed, view summary |
| `completed_appended` | `/summary/:procedureId` | Summary (read-only) | Signed report with amendments |
| `closed` | `/summary/:procedureId` | Summary (read-only) | Archived view |
| `void` | `/summary/:procedureId` | Summary (read-only) | Voided view |

**Test method:** The seed-demo.ts creates procedures in all 9 statuses. Navigate to Procedures screen, click each one, verify routing.

---

## Section 5: Navigation Contract Tests

**Objective:** Verify sidebar navigation, screen transitions, and back buttons.

| # | Test | Steps | Expected |
|---|---|---|---|
| NAV-01 | Sidebar links work | Click each sidebar item | Correct screen loads, active state highlighted |
| NAV-02 | Admin sub-screen back buttons | Admin → Staff → "Back to Admin" | Returns to Admin hub |
| NAV-03 | Viewer → Report flow | Viewer → "Go to Report" button | Report screen loads for same procedure |
| NAV-04 | Report → Sign flow | Report → "Proceed to Sign" | Sign screen loads for same procedure |
| NAV-05 | Patient → Procedure drill-down | Patients → Patient → Procedures tab → Click procedure | Correct Viewer/Report screen |
| NAV-06 | Login redirect | Visit any route while logged out | Redirect to /login |
| NAV-07 | Post-login redirect | Login after redirect | Returns to originally requested page (or dashboard) |
| NAV-08 | Sign out | Click sign out | Redirect to login, session cleared |
| NAV-09 | Direct URL navigation | Type /viewer/[id] directly | Screen loads (or redirect if unauthorized) |
| NAV-10 | Notification navigation | Click a notification | Routes to relevant screen |

---

## Section 6: Build Phase Verification Checklists

### After BUILD_01–06 (All Complete ✅)

These checklists have been verified during the original build. They remain here for regression reference.

- [x] Firebase Auth working (email/password + Google sign-in on deployed domain)
- [x] Custom claims provisioned (role, practiceId, clinicIds)
- [x] Patient CRUD persists to Firestore
- [x] Procedure lifecycle (9-state machine) enforced
- [x] Check-In consent flow functional
- [x] Capsule Upload placeholder functional
- [x] Viewer with Pre-Review checklist gating
- [x] FrameViewer component built (awaiting real frames)
- [x] Findings CRUD (add, delete, list with provenance badges)
- [x] Report editing with save functionality
- [x] Sign & Deliver with signing flow and delivery options
- [x] Sidebar navigation with role-based visibility
- [x] Header with user info, notifications, sign out
- [x] All 28 screens have Sidebar + Header layout
- [x] Admin sub-screens with back buttons
- [x] Operations dashboard with real-time stats
- [x] Analytics with KPI cards and charts
- [x] Activity Log with Firestore listener
- [x] Notification system (bell, drawer, mark read)
- [x] Enriched seed data (10 patients, 15 procedures, reports, findings)
- [x] Production build passes (`npm run build`)
- [x] Firebase Hosting deployed (cw-e7c19.web.app)

### After BUILD_07–08 (Complete ✅)

- [x] Procedures screen shows all procedures with status badges
- [x] Reports Hub shows signed reports
- [x] Summary screen shows procedure summary (read-only for completed/closed/void)
- [x] Manage Clinics CRUD functional
- [x] Manage Subscription displays plan info
- [x] Manage ICD Codes with favorites

### After BUILD_09: Image Pipeline Integration (PENDING)

**Prerequisites:** Pipeline field rename + CORS + cross-project IAM (see HANDOFF.md Priority 1B)

- [ ] `getCapsuleFrames` callable Cloud Function deployed
- [ ] `useCapsuleFrames` hook implemented in hooks.tsx
- [ ] Viewer loads real capsule frames from pipeline
- [ ] FrameViewer playback works with real frame URLs
- [ ] AI analysis results appear in findings panel with `AI_DETECTED` badge
- [ ] Anatomical locations mapped via `cestToAnatomicalRegion()`
- [ ] CapsuleUpload shows capsule serial number for verification
- [ ] CapsuleUpload transitions to `ready_for_review` on confirmation
- [ ] Performance: `getCapsuleFrames` returns within 10s for 50K-frame capsule
- [ ] Performance: First frame renders within 2s of response
- [ ] Error handling: Viewer shows message if no frames found

### Copilot / Gemini API Integration

**Prerequisites:** Billing account linked to cw-e7c19 (see HANDOFF.md)

- [ ] `gemini.ts` calls Gemini API successfully
- [ ] "Generate Clinical Impression" produces appropriate medical text
- [ ] "Generate Recommendations" produces appropriate recommendations
- [ ] "Accept" button pushes AI text into report fields
- [ ] Error handling: graceful message when API key missing or quota exceeded
- [ ] Clinical question answering works (if exposed in UI)

---

## Section 7: Firestore Security & Data Integrity

### Cross-Practice Isolation
- [ ] User in Practice A cannot read Practice B procedures
- [ ] User in Practice A cannot read Practice B patients
- [ ] Firestore queries are scoped by `practiceId` from auth claims

### Audit Trail
- [ ] Procedure status changes create audit log entries
- [ ] Finding operations create audit log entries
- [ ] Report signing creates audit log entry
- [ ] Activity Log screen shows audit entries with color-coded event badges

### State Machine Enforcement
- [ ] Valid transitions succeed (e.g., `ready_for_review` → `draft`)
- [ ] Invalid transitions are rejected (e.g., `capsule_return_pending` → `completed`)
- [ ] Void procedures cannot be reopened

### Notification Ownership
- [ ] User can only read their own notifications
- [ ] Notification count badge updates in real-time

---

## Section 8: Critical Bug Checklist

**If any of these occur, stop and debug:**

- [ ] Cross-practice data leakage (user sees another practice's data)
- [ ] State machine allows invalid transition
- [ ] Clinician can sign for another user
- [ ] Voided procedure can be reopened
- [ ] Admin role not reflected in sidebar/access
- [ ] Finding provenance metadata missing
- [ ] Firestore query timeout (> 5s)
- [ ] Console errors on any screen load
- [ ] Real-time listener not updating (stale data)
- [ ] Login loop (can't stay authenticated)

---

## Section 9: UAT Sign-Off Checklist

**Before declaring build complete:**

- [ ] All 9 build packets implemented (BUILD_01 through BUILD_09)
- [ ] All persona test scenarios passing (Section 3)
- [ ] All status-based routing correct (Section 4)
- [ ] All navigation contracts verified (Section 5)
- [ ] No critical bugs (Section 8)
- [ ] Firestore security verified (Section 7)
- [ ] Production build passes
- [ ] Firebase Hosting deployed and accessible
- [ ] Tested on Chrome (primary)
- [ ] Tested on mobile viewport (responsive)
- [ ] All audit trail entries verified
- [ ] Copilot integration functional (if billing enabled)
- [ ] Image pipeline integration functional (if BUILD_09 complete)

---

## Appendix: Test Data Fixtures

```javascript
// Test patient (from seed-demo.ts)
{
  firstName: "Jane",
  lastName: "Doe",
  mrn: "MRN-001",
  dateOfBirth: Timestamp,
  practiceId: "practice-demo-001",
}

// Test procedure (from seed-demo.ts)
{
  patientId: "[patient doc ID]",
  practiceId: "practice-demo-001",
  assignedClinicianId: "[clinician UID]",
  studyType: "upper_gi",
  status: "ready_for_review",
  capsuleSerialNumber: "SN-48291-A",  // Links to image pipeline folder
  capsuleLotNumber: "LOT-2026-001",
  urgency: "routine",
}

// Test finding (from seed-demo.ts)
{
  procedureId: "[procedure doc ID]",
  classification: "polyp",
  provenance: "clinician_marked",
  reviewStatus: "confirmed",
  anatomicalRegion: "colon",
  primaryFrameNumber: 1500,
}

// Capsule image (from pipeline Firestore — podium-capsule-ingest)
{
  capsule_serial: "SN-48291-A",  // Matches procedure.capsuleSerialNumber
  filename: "frame_00001.jpg",
  bucket: "podium-capsule-raw-images-test",
  url: "gs://podium-capsule-raw-images-test/SN-48291-A/frame_00001.jpg",
  status: "processed",
  analysis: {
    anomaly_detected: true,
    primary_finding: "Polyp",
    anatomical_location: "Haustra (Colon)",
    confidence_score: 0.92,
    mucosal_view_quality: "good",
    secondary_findings: [],
    bounding_box_suggestion: "",
    clinical_notes: "Small sessile polyp identified in descending colon."
  }
}
```

---
