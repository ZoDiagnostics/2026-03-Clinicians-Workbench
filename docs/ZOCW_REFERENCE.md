# Zo Clinicians Workbench (ZoCW) — Firebase Studio Reference
**Version:** 3.2.0
**Last Updated:** 2026-03-19
**Purpose:** Quick reference for Firebase Studio sessions (keep this file open across all builds)

---

## 1. Screen Registry (Condensed)

| Screen ID | Name | Route | Parent | Roles | Key Requirements |
|-----------|------|-------|--------|-------|------------------|
| SCR-01 | View Dashboard | `/` | — | All | 0001, 0259, 0260, 0281, 0293 |
| SCR-02 | Manage Patients | `/patients` | — | auth | 0011–0025, 0250, 0278–0281 |
| SCR-03 | Manage Procedures | `/procedures` | — | auth | 0249, 0293 |
| SCR-04 | Reports & Analytics | `/reports-hub` | — | auth | 0251, 0252 |
| SCR-05 | Manage Education Library | `/education` | — | auth | 0257, 0290 |
| SCR-06 | Manage Administration | `/admin` | — | admin,clinician_admin | 0005, 0088 |
| SCR-07 | View System Activity Log | `/activity-log` | — | admin,clinician_admin | — |
| SCR-08 | Check-In & Capsule Ingestion | `/checkin/:procedureId` | Workflow | auth | 0015–0020, 0250, 0276, 0278–0279, 0283, 0288 |
| SCR-09 | Upload Capsule Study | `/capsule-upload/:procedureId` | Workflow | clinical_staff,clinician* | — |
| SCR-10 | View Procedure Study (Viewer) | `/viewer/:procedureId` | Workflow | clinician*,clinical_staff | 0244–0246, 0254–0257, 0265–0270, 0282–0283, 0285, 0289–0291 |
| SCR-11 | Review Procedure Summary | `/summary/:procedureId` | Workflow | clinician*,clinical_staff | 0254, 0255, 0266–0273, 0282, 0285 |
| SCR-12 | Generate Report | `/report/:procedureId` | Workflow | clinician*,clinical_staff | 0262–0263, 0269, 0271–0273, 0282, 0297–0300 |
| SCR-13 | Review, Sign & Deliver | `/sign-deliver/:procedureId` | Workflow | clinician_auth,clinician_admin | 0290, 0298, 0300 |
| SCR-14 | View Patient Overview | `/patient/{patientId}` | Patient | auth | 0278–0281 |
| SCR-15 | Manage Medical History | `/patient/{patientId}#medical-history` | SCR-14 Tab | auth | — |
| SCR-16 | Manage Medications | `/patient/{patientId}#medications` | SCR-14 Tab | auth | — |
| SCR-17 | Manage Allergies | `/patient/{patientId}#allergies` | SCR-14 Tab | auth | — |
| SCR-18 | View Patient Procedures | `/patient/{patientId}#procedures` | SCR-14 Tab | auth | 0238 |
| SCR-19 | View Patient Reports | `/patient/{patientId}#reports` | SCR-14 Tab | auth | 0238 |
| SCR-20 | Manage Patient Education | `/patient/{patientId}#education` | SCR-14 Tab | auth | 0263, 0290 |
| SCR-21 | View Patient Activity Log | `/patient/{patientId}#activity` | SCR-14 Tab | auth | — |
| SCR-22 | Manage Staff | `/admin/staff` | SCR-06 | admin,clinician_admin | 0005, 0088, 0281, 0285 |
| SCR-23 | Manage Practice Settings | `/admin/practice` | SCR-06 | admin,clinician_admin | 0247, 0275, 0281, 0298 |
| SCR-24 | Manage Clinics | `/admin/clinics` | SCR-06 | admin,clinician_admin | — |
| SCR-25 | Manage Subscription | `/admin/subscription` | SCR-06 | admin | — |
| SCR-26 | Manage Payers | `/admin#payers` | SCR-06 Tab | admin,clinician_admin | — |
| SCR-27 | Manage ICD Codes | `/admin/icd-codes` | SCR-06 | admin,clinician_admin | — |
| SCR-28 | Manage Reference Library | `/admin#reference` | SCR-06 Tab | admin,clinician_admin | 0257 |
| SCR-29 | View Clinic Operations Dashboard | `/operations` | — | admin,clinician_admin | 0251, 0252, 0272, 0292 |
| SCR-30 | Analytics Workbench | `/analytics` | — | admin,clinician_admin,clinician_auth | 0251–0253, 0294, 0295 |
| SCR-33 | AI Quality Assurance Dashboard | `/ai-qa` | — | admin,clinician_admin | 0256 |
| SCR-34 | View Capsule Usage Listing | `/admin#capsule-usage` | SCR-06 Tab | admin | 0277, 0292 |
| SCR-35 | View My Worklist | `/worklist` | — | clinician*,clinician_admin | 0287 |

**Legend:** `clinician*` = clinician_auth + clinician_noauth; `auth` = all authenticated roles; `clinical_staff,clinician*` = clinical staff and both clinician types

---

## 2. Requirement-Screen-Engine Traceability (ZCW-BRD-0226 through 0300)

| Req ID | Summary | Screen(s) | Engine(s) |
|--------|---------|-----------|-----------|
| 0226 | Pan-GI single capsule imaging | All | General Platform |
| 0227 | Study type selection at check-in | SCR-08 | Clinical Workflow |
| 0228 | Study type auto-configures Viewer/AI/Summary/Report | SCR-08,10,11,12 | Clinical Workflow |
| 0229 | AI full-spectrum analysis with primary/incidental split | SCR-10,11,12 | Copilot |
| 0230 | Viewer tool pre-activation by study type | SCR-10 | Viewer |
| 0231–0234 | Viewer diagnostic tools (QuickView, SBI, Dual Camera, GI Map) | SCR-10 | Viewer |
| 0235–0236 | Crohn's/Colon summary panels | SCR-11 | Clinical Workflow, Report |
| 0237 | Study-type-specific report templates | SCR-12 | Report |
| 0238 | Prior study comparison with longitudinal tools | SCR-18,19 | Clinical Workflow, Copilot |
| 0239–0240 | Capsule lot/serial capture at check-in | SCR-08 | Clinical Workflow |
| 0241 | Lot number traceability search | SCR-23 | Admin |
| 0242–0243 | Extended transit times and landmarks | SCR-11, SCR-10 | Clinical Workflow, Viewer |
| 0244 | Pre-Review Confirmation Panel (v3.1.0: integrated in SCR-10) | SCR-10 | Clinical Workflow |
| 0245 | Primary AOI vs Incidental categorization | SCR-10 | Copilot, Viewer |
| 0246 | Incidental Findings tray with batch actions (v3.1.0) | SCR-10 | Viewer |
| 0247 | Incidental findings sensitivity threshold + override | SCR-10, SCR-23 | Admin, Viewer |
| 0248 | Supplemental report sections for incidentals | SCR-12 | Report |
| 0249 | Bulk status updates for procedures | SCR-03 | Clinical Workflow |
| 0250 | New Procedure row action from patient list | SCR-02, SCR-08 | Clinical Workflow |
| 0251–0252 | Analytics export (PDF/CSV/PNG) + scheduled delivery | SCR-29, SCR-30 | Admin, Report |
| 0253 | Analytics view sharing | SCR-30 | Admin |
| 0254 | Incidental findings referral generation | SCR-10, SCR-12 | Report, Clinical Workflow |
| 0255 | Transfer Review / Clinician handoff | SCR-10, SCR-11 | Clinical Workflow |
| 0256 | AI QA Dashboard — sensitivity, specificity, drift alerting | SCR-33 | Learning, Admin |
| 0257 | Learning Engine expansion — AI feedback, Case Library, finding-linked education | SCR-05, SCR-10, SCR-33 | Learning |
| 0258 | EHR/PACS interoperability (FHIR R4, DICOM SR, HL7 v2.x) | SCR-12, SCR-13, SCR-23 | Platform Services |
| 0259–0260 | Notification infrastructure (in-app, email, push) + preferences | SCR-01, SCR-23 | Platform Services |
| 0261 | UI localization — 6 locales, date/number formatting | All, SCR-23 | Platform Services |
| 0262 | Multi-lingual AI Copilot and report generation | SCR-10,11,12 | Copilot, Report |
| 0263 | Patient-facing translation | SCR-12, SCR-20 | Report, Learning |
| 0264 | Medical speech recognition engine (MedASR) | All (voice-enabled) | Platform Services, Copilot |
| 0265–0266 | Voice-to-structured-annotation + voice commands (v3.1.0: ambient capture) | SCR-10,11 | Viewer, Copilot |
| 0267 | AI-calibrated size measurement | SCR-10 | Viewer, Copilot |
| 0268 | Virtual chromoendoscopy (NBI, BLI, LCI, FICE filters) | SCR-10 | Viewer |
| 0269 | 3D anatomical annotation overlay | SCR-10 | Viewer |
| 0270 | Frame stitching panoramic views | SCR-10 | Viewer, Copilot |
| 0271 | Guideline-based surveillance recommendations | SCR-11, SCR-12 | Copilot, Report |
| 0272 | Quality metric auto-calculation (CDR, MVS, Completeness) | SCR-11, SCR-29, SCR-33 | Copilot, Admin |
| 0273 | Risk scoring models (Bleeding, Polyp, Lewis, Retention) | SCR-11, SCR-12 | Copilot |
| 0274 | Machine-learned physician favorites | SCR-10 | Viewer, Copilot |
| 0275 | Study-type-specific annotation templates | SCR-10, SCR-23 | Viewer, Admin |
| 0276 | Capsule package scan at check-in (v3.1.0: scan-first UX) | SCR-08 | Clinical Workflow |
| 0277 | Capsule Usage Listing screen | SCR-34 | Admin |
| 0278 | EMR-sourced field visual tagging ("EMR" badges) | SCR-08, SCR-14 | Platform Services, Clinical Workflow |
| 0279 | EMR-sourced demographics editability rules (core identity read-only) | SCR-08, SCR-14, SCR-23 | Platform Services, Clinical Workflow, Admin |
| 0280 | Demographic sync conflict resolution | SCR-14, SCR-23 | Platform Services |
| 0281 | Field-level PHI access masking by role | SCR-01, SCR-02, SCR-14, SCR-22 | Admin, Clinical Workflow |
| 0282 | Clinical finding provenance metadata | SCR-10, SCR-11, SCR-12 | Copilot, Viewer, Report |
| 0283 | Patient identity context verification | SCR-08, SCR-10 | Clinical Workflow |
| 0284 | Notification PHI minimization | SCR-23 | Admin, Platform Services |
| 0285 | Secure delegation and coverage management | SCR-10, SCR-11, SCR-22 | Clinical Workflow, Admin |
| 0286 | Error handling and safety controls | All | All Engines |
| 0287 | Physician Work Queue (My Worklist) | SCR-35, SCR-01 | Clinical Workflow |
| 0288 | Structured Indication Templates | SCR-08, SCR-23 | Clinical Workflow |
| 0289 | Annotation Lifecycle Management | SCR-10, SCR-11 | Viewer |
| 0290 | Education Delivery Triggers | SCR-08, SCR-13, SCR-05 | Learning |
| 0291 | Review Transfer UX | SCR-10, SCR-11 | Clinical Workflow |
| 0292 | Capsule Recall SOP | SCR-34, SCR-29 | Operations & Analytics |
| 0293 | Procedure Lifecycle UI (9-state badges) | SCR-03, SCR-01, SCR-35 | Clinical Workflow |
| 0294 | Analytics Role-Access Matrix | SCR-30, SCR-33, SCR-01 | Operations & Analytics |
| 0295 | Longitudinal Disease Tracking | SCR-30 | Operations & Analytics |
| 0296 | Drawing & Markup Tools | SCR-10 | Viewer |
| 0297 | Copilot auto-draft Clinical Impression + Recommendations | SCR-12 | Copilot, Report |
| 0298 | Sign & Deliver pre-populated delivery defaults | SCR-13, SCR-23 | Clinical Workflow, Admin |
| 0299 | Copilot auto-suggest ICD-10/CPT codes | SCR-12 | Copilot, Report |
| 0300 | Mobile report review and signing via PWA | SCR-12, SCR-13 | Platform Services, Report |

---

## 3. Status-Based Routing Table

**Updated Mar 19:** Routes use flat paths (not `/workflow/` prefix) per `routeByStatus.ts` and `router.tsx`.

| Procedure Status | Destination Screen | Route | Workflow Step |
|---|---|---|---|
| `capsule_return_pending` | SCR-08 Check-In | `/checkin/:procedureId` | Awaiting capsule return from patient |
| `capsule_received` | SCR-09 Capsule Upload | `/capsule-upload/:procedureId` | Data upload + validation |
| `ready_for_review` | SCR-10 Viewer | `/viewer/:procedureId` | Diagnostic review (primary AOI) |
| `draft` | SCR-10 Viewer | `/viewer/:procedureId` | Ongoing review, findings being marked |
| `appended_draft` | SCR-10 Viewer | `/viewer/:procedureId` | Appended findings after initial review |
| `completed` | SCR-12 Report (read-only) | `/report/:procedureId` | Report signed, view only |
| `completed_appended` | SCR-12 Report (read-only) | `/report/:procedureId` | Report signed with appended findings |
| `closed` | SCR-11 Summary (read-only) | `/summary/:procedureId` | Archived, view only |
| `void` | SCR-11 Summary (read-only) | `/summary/:procedureId` | Voided/cancelled, view only |

---

## 4. Role Permission Matrix

### Custom Claims (Authoritative Source for RBAC)

All role and practice membership data used by Firestore security rules lives in **Firebase Auth custom claims**, not in Firestore document fields. The three claims are:

| Claim | Type | Set By | Purpose |
|-------|------|--------|---------|
| `role` | `string` | `setInitialUserClaims` / `updateUserRole` | One of 5 RBAC roles (see below). Evaluated by `request.auth.token.role` in security rules. |
| `practiceId` | `string` | `setInitialUserClaims` | Practice tenant isolation. Evaluated by `request.auth.token.practiceId` in security rules to scope all Pattern A collection queries. |
| `clinicIds` | `string[]` | `setInitialUserClaims` | Clinic-level access within a practice. Empty array = all clinics. |

Claims are provisioned via the `setInitialUserClaims` callable Cloud Function (admin/clinician_admin only, same-practice scoping enforced). Subsequent role changes use `updateUserRole`. The client must call `getIdTokenResult(true)` after provisioning to force-refresh the ID token and pick up new claims.

### Screen Access by Role

| Screen | clinician_auth | clinician_noauth | clinician_admin | admin | clinical_staff |
|--------|---|---|---|---|---|
| SCR-01 Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| SCR-02 Patients | ✓ | ✓ | ✓ | ✓ | ✓ |
| SCR-03 Procedures | ✓ | ✓ | ✓ | ✓ | ✓ |
| SCR-04 Reports & Analytics | ✓ | ✓ | ✓ | ✓ | ✗ |
| SCR-05 Education | ✓ | ✓ | ✓ | ✓ | ✓ |
| SCR-06 Administration | ✗ | ✗ | ✓ | ✓ | ✗ |
| SCR-07 Activity Log | ✗ | ✗ | ✓ | ✓ | ✗ |
| SCR-08 Check-In | ✓ | ✓ | ✓ | ✓ | ✓ |
| SCR-09 Upload | ✓ | ✓ | ✓ | ✓ | ✓ |
| SCR-10 Viewer | ✓ | ✓ | ✓ | ✓ | ✓ |
| SCR-11 Summary | ✓ | ✓ | ✓ | ✓ | ✓ |
| SCR-12 Report | ✓ | ✓ | ✓ | ✓ | ✓ |
| SCR-13 Sign & Deliver | ✓ | ✗ | ✓ | ✓ | ✗ |
| SCR-14–21 Patient Context | ✓ | ✓ | ✓ | ✓ | ✓ |
| SCR-22–28, 34 Admin Sub | ✗ | ✗ | ✓ | ✓ | ✗ |
| SCR-29 Operations Dashboard | ✗ | ✗ | ✓ | ✓ | ✗ |
| SCR-30 Analytics | ✓* | ✗ | ✓ | ✓ | ✗ |
| SCR-33 AI QA | ✗ | ✗ | ✓ | ✓ | ✗ |
| SCR-35 My Worklist | ✓ | ✓ | ✓ | ✗ | ✗ |

*SCR-30: clinician_auth sees own data only; clinician_admin/admin see all

---

## 5. Procedure State Transition Diagram (ASCII)

```
                    ┌─────────────────────────────────┐
                    │  capsule_return_pending         │
                    │  (initial state on check-in)    │
                    └────────────┬────────────────────┘
                                 │
                                 │ (capsule received + upload)
                                 ▼
                    ┌──────────────────────────────────┐
                    │  capsule_received                │
                    │  (upload validation passed)      │
                    └────────────┬─────────────────────┘
                                 │
                                 │ (auto-transition after upload)
                                 ▼
                    ┌──────────────────────────────────┐
                    │  ready_for_review                │
                    │  (queued for clinician review)   │
                    └────────────┬─────────────────────┘
                                 │
                                 │ (clinician starts review)
                                 ▼
                    ┌──────────────────────────────────┐
       ┌────────────│  draft                           │◄─────────┐
       │            │  (findings being confirmed)      │           │
       │            └────────────┬─────────────────────┘           │
       │                         │                                  │
       │                         │ (clinician adds more findings)   │
       │                         ▼                                  │
       │            ┌──────────────────────────────────┐            │
       │            │  appended_draft                  │────────────┘
       │            │  (additional findings after review)
       │            └────────────┬─────────────────────┘
       │                         │
       │                         │ (ready to sign)
       │                         ▼
       │            ┌──────────────────────────────────┐
       │            │  completed (from draft)          │
       │            │ OR                               │
       │            │  completed_appended (from appended) ──┐
       │            └─────────────────────────────────┘    │
       │                                                   │
       │ (void: cancel review)     ┌──────────────────────┘
       │                           │
       │            ┌──────────────▼──────────────────┐
       └──────────→ │  void                           │
                    │  (review cancelled)             │
                    └─────────────────────────────────┘


Optional final state (after 90 days or manual closure):
    completed ──────→ closed
    completed_appended ──→ closed
    void ────────────→ closed
```

---

## 6. Firestore Collection → Screen Mapping

### Data Architecture Patterns

The ZoCW system uses two complementary data patterns for multi-tenancy:

- **Pattern A (Root + Field):** Top-level collections (`patients`, `procedures`, `reports`, `auditLog`, `notifications`, `educationMaterials`) store a `practiceId` field on each document. Multi-tenancy is enforced by Firestore security rules checking `resource.data.practiceId` against `request.auth.token.practiceId`.
- **Pattern B (Practice Subcollection):** Collections inherently scoped to a practice (`clinics`, `capsuleInventory`, `settings`) live under `practices/{practiceId}/...`. Path-based scoping.

### Collection Registry

| Collection | Path | Reads | Writes | Key Screens |
|---|---|---|---|---|
| **Practices** | `practices/{practiceId}` | Admin config load | Settings updates | SCR-23 |
| **Patients** | `patients/{patientId}` | Patient list, overview | CRUD operations | SCR-02, SCR-14 |
| **Procedures** | `procedures/{procId}` | Workflow screens, dashboards | Status transitions, create | SCR-03, SCR-08–13, SCR-35 |
| **Findings** | `procedures/{procId}/findings/{findingId}` | Viewer, Summary, Report | Confirm/reject/modify | SCR-10, SCR-11, SCR-12 |
| **Annotations** | `procedures/{procId}/annotations/{annotationId}` | Viewer, Report | Drawing, markup | SCR-10, SCR-12 |
| **Reports** | `reports/{reportId}` | Report view, delivery | Create, edit, sign | SCR-12, SCR-13 |
| **Users** | `users/{uid}` | Role provisioning, profile | CRUD, role updates | SCR-22 |
| **Clinics** | `practices/{practiceId}/clinics/{clinicId}` | Clinic selectors | CRUD | SCR-24 |
| **AuditLog** | `auditLog/{auditId}` | Activity log, compliance | Event logging (admin SDK only) | SCR-07 |
| **Notifications** | `users/{uid}/notifications/{notificationId}` | Drawer, badge count | Event triggers | SCR-01, Header |
| **EducationMaterials** | `educationMaterials/{materialId}` | Material listing, suggestions | CRUD, assignments | SCR-05, SCR-20 |
| **Preferences** | `users/{uid}/preferences` | Notification config | Settings updates | SCR-23, Admin |

### Notes

- **Pattern A Collections** (`patients`, `procedures`, `reports`, `auditLog`, `notifications`, `educationMaterials`, `users`): All store `practiceId` field on each document; queries and writes filtered by security rules checking `resource.data.practiceId == request.auth.token.practiceId`.
- **Pattern B Collections** (`practices/{practiceId}/clinics`, `practices/{practiceId}/capsuleInventory`, `practices/{practiceId}/settings`): Inherently scoped to practice by document path.
- **Procedure Subcollections** (`procedures/{procId}/findings`, `procedures/{procId}/annotations`): Study-specific data with no explicit practiceId field; access controlled by parent procedure document permissions.
- **User Subcollections** (`users/{uid}/notifications`, `users/{uid}/preferences`): User-owned preferences and real-time notifications, scoped by UID.
- **Future Collections** (not yet implemented): `patients/{patientId}/educationAssignments`, `practices/{practiceId}/icdFavorites`, `practices/{practiceId}/subscription` — planned for future phases.
- **External Collection (Pipeline Project):** `capsule_images` lives in `podium-capsule-ingest` Firestore (NOT in cw-e7c19). Contains frame metadata + AI analysis results. Accessed via `getCapsuleFrames` proxy Cloud Function. Linked to ZoCW procedures via `capsule_serial` field = `procedure.capsuleSerialNumber`. See `docs/IMAGE_PIPELINE_INTEGRATION.md` for full architecture.

---

## 7. Firebase Services → Engine Mapping

| Engine | Firestore | Cloud Functions | Cloud Storage | Auth | Vertex AI (Future) |
|---|---|---|---|---|---|
| **Clinical Workflow** | Procedures, findings, annotations | State machine, triggers | Procedure videos | Custom claims | — |
| **Viewer** | Findings, annotations | — | Capsule studies | Auth | — |
| **Copilot** | Reports, findings, patient data | Auto-draft, code suggestion | — | — | NL inference |
| **Report** | Reports, findings, delivery | PDF generation, email delivery | PDFs | Auth | — |
| **Admin** | Practice, staff, clinics, settings | User provisioning, role updates | — | Admin SDK | — |
| **Learning** | Education, audit, findings | Education delivery triggers | Education media | — | Feedback analysis |
| **Operations & Analytics** | Procedures, reports, audit | Metrics aggregation, drift detection | Analytics exports | Auth | Model performance analysis |

---

## 8. Key Cloud Functions (Quick Reference)

| Function | Trigger | Output |
|---|---|---|
| `onUserCreate` | Auth user creation | Custom claims set, user document created, audit log |
| `updateUserRole` | Admin role change | Auth custom claims updated, staff document updated, audit log |
| `createProcedure` | Check-In proceed | Procedure document created with ID, initial status set |
| `transitionProcedureStatus` | Procedure status update | State machine validation, new status committed, triggers cascade |
| `enforceStateMachine` | Procedure write | Rejects invalid transitions with error message |
| `generateReport` | Report generation request | AI findings → Clinical Impression + Recommendations, auto-draft created |
| `signReport` | Report sign action | Digital signature, status = 'signed', procedure state transition, PDF export |
| `deliverReport` | Delivery method selected | Email/print/portal delivery, delivery records created, notifications sent |
| `routeNotification` | Procedure/report/system events | Notifications created per user preferences, channels selected, sent |
| `exportDashboard` | Export button click | PDF/CSV/PNG aggregated data file generated, available for download |
| `scheduleAnalyticsReport` | Schedule report modal submit | Scheduled_reports document created, recurring job registered |
| `assignEducationMaterial` | Assign to patient button | Education assignment created, delivery queued, notifications sent |
| `initiateCapsuleRecall` | Recall initiation | Recall document created, affected procedures marked, staff notified |
| `suggestEducationMaterials` | Check-in / post-sign trigger | Query education library, rank by relevance, return top N suggestions |
| `uploadCapsuleStudy` | Capsule upload completion | File validation, quality score calculation, status transition triggered |
| `getCapsuleFrames` | Viewer screen mount (BUILD_09) | Reads from pipeline project Firestore, returns frame URLs + AI analysis. Not yet implemented. |

---

## 9. Critical Implementation Checklist

### Pre-Build
- [ ] Firebase project initialized with Firestore, Auth, Cloud Functions, Cloud Storage
- [ ] Firestore security rules written and deployed (`scaffold/firestore.rules`)
- [ ] TypeScript types defined for all collections (`types/*.ts`)
- [ ] Hooks library initialized (`lib/hooks.ts`)
- [ ] Role definitions codified (`types/enums.ts`)

### Per Build Packet
- [ ] All required files listed and opened in Firebase Studio
- [ ] Gemini prompts copy-pasted exactly into Firebase Studio Gemini
- [ ] Acceptance criteria defined and testable
- [ ] Firestore collections created with correct schema
- [ ] Cloud Functions deployed (use Firebase CLI: `firebase deploy --only functions`)
- [ ] Security rules updated (use Firebase CLI: `firebase deploy --only firestore:rules`)
- [ ] Real-time listeners integrated with React `useEffect` hooks
- [ ] Error handling implemented (catch blocks, user-facing toasts)
- [ ] Audit log entry created for every major operation

### Testing
- [ ] Load test: Firestore aggregation doesn't timeout (< 5s per page)
- [ ] Concurrent test: Multiple clinicians reviewing same procedure
- [ ] Role test: Each role accesses only assigned screens
- [ ] Cross-practice test: Verify Firestore queries scoped to practiceId
- [ ] State machine test: Invalid transitions rejected
- [ ] Real-time test: Changes appear in all open tabs without reload
- [ ] Mobile test: Responsive layout works on mobile PWA
- [ ] Accessibility test: Keyboard navigation, ARIA labels, color contrast

---

## 10. Troubleshooting Quick Links

**Problem:** Firestore query timeout
**Solution:** Check composite index creation in Firebase Console > Indexes. Verify query filter order matches index.

**Problem:** Cloud Function deployment fails
**Solution:** Check Cloud Functions quota (limit: 1000 per 100 seconds). Verify environment variables set in `.env.local`.

**Problem:** Real-time listener not updating
**Solution:** Verify `onSnapshot` is called (not just `get()`). Check security rules allow read access.

**Problem:** Custom claims not visible in ID token
**Solution:** Call `user.getIdTokenResult(true)` to force refresh after `setCustomUserClaims()`.

**Problem:** Firestore security rule denying access
**Solution:** Check `request.auth.token.role` matches rule. Verify practiceId in token matches document practiceId.

**Problem:** PDF export blank
**Solution:** Verify Cloud Function can read report document. Check Cloud Storage bucket permissions.

---
