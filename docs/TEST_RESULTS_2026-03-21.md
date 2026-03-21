# ZoCW Functional Testing — Session 4 Results
**Date:** 2026-03-20/21
**Tester:** Claude (Sonnet 4.6, autonomous overnight)
**App:** ZoCW Demo v3.1.0 — https://cw-e7c19.web.app
**Credentials:** clinician@zocw.com / password (role: clinician_auth — Authorized Clinician)

---

## Coverage Summary

| Metric | Count |
|---|---|
| Total scenarios in spreadsheet | 825 |
| Unique reachable scenario IDs (with current credentials/data) | 381 |
| Scenarios logged this session | 381 (100% of reachable) |
| **PASS** | **85** |
| **FAIL** | **227** |
| **BLOCKED** | **69** |

**Overall pass rate (reachable):** 85/381 = 22.3%
**Overall pass rate (all 825):** 85/825 = 10.3%

The low pass rate reflects the app being an early-stage build: core routing and navigation work well, but most advanced clinical workflow features (Viewer tools, AI/Copilot, report automation, annotation, incidental findings management, mobile, etc.) are not yet implemented.

---

## Screen-by-Screen Breakdown

| Screen | Description | Unique IDs | PASS | FAIL | BLOCKED |
|---|---|---|---|---|---|
| SCR-35 | Worklist | 13 | 10 | 3 | 0 |
| SCR-01 | Dashboard / Notifications | 41 | 20 | 17 | 4 |
| SCR-02 | Patient Management | 4 | 1 | 3 | 0 |
| SCR-03 | Procedures List | 29 | 12 | 14 | 3 |
| SCR-04 | Analytics Hub | 3 | 1 | 1 | 1 |
| SCR-05 | Education Library | 6 | 1 | 4 | 1 |
| SCR-06 | Administration Access | 3 | 2 | 0 | 1 |
| SCR-07 | Activity Log Access | 1 | 0 | 1 | 0 |
| SCR-10 | Viewer | 132 | 13 | 84 | 35 |
| SCR-11 | Procedure Summary | 42 | 5 | 37 | 0 |
| SCR-12 | Generate Report | 45 | 8 | 29 | 8 |
| SCR-13 | Sign & Deliver | 22 | 7 | 12 | 3 |
| SCR-14 | Patient Demographics | 2 | 0 | 1 | 1 |
| SCR-15 | Medical History | 4 | 0 | 3 | 1 |
| SCR-16 | Medications | 3 | 0 | 2 | 1 |
| SCR-17 | Allergies | 4 | 0 | 3 | 1 |
| SCR-18 | Patient Procedures Tab | 4 | 1 | 2 | 1 |
| SCR-19 | Signed Reports | 1 | 1 | 0 | 0 |
| SCR-20 | Education Copilot | 1 | 0 | 0 | 1 |
| SCR-21 | Patient Activity Log | 5 | 0 | 4 | 1 |
| SCR-24 | Manage Clinics | 1 | 0 | 0 | 1 |
| SCR-25 | Manage Subscription | 1 | 0 | 0 | 1 |
| SCR-27 | ICD Code Management | 7 | 0 | 6 | 1 |
| SCR-29 | Clinic Operations Dashboard | 3 | 2 | 0 | 1 |
| SCR-30 | Analytics Workbench | 4 | 1 | 1 | 2 |
| **TOTAL** | | **381** | **85** | **227** | **69** |

---

## Bugs Found (Session 4)

*(Continuing from prior session bugs #1–#9)*

**Bug #10 — Admin Sub-Route Access Control Bypass**
`/admin` correctly shows "Access Denied" for clinician_auth. However, direct navigation to sub-routes bypasses this check: `/admin/icd-codes`, `/admin/clinics`, `/admin/subscription`, `/admin/staff`, and `/admin/practice` are all accessible to clinician_auth. The clinics page shows full clinic management (3 clinics with Edit buttons). This is a security/authorization gap.
*Affects:* SCR-24, SCR-25, SCR-27

**Bug #11 — Finding Dismiss Has No Confirmation**
Clicking the ✕ (X) button on a finding in the Viewer immediately removes it with no confirmation dialog, no undo, and no distinction between "dismiss" (mark as irrelevant) and "delete" (permanently remove). The spec calls for distinct Confirm / Modify / Dismiss actions.
*Affects:* RV-002, RV-004, BR-514

**Bug #12 — No Read-Only Banner for Closed Procedure Summary**
The Procedure Summary screen for a "closed" procedure shows identical UI to a "completed" procedure, with no read-only indicator or banner. Spec expects a read-only banner for closed procedures.
*Affects:* NAV-030

**Bug #13 — Signed Report Not Locked**
After a report is signed and the procedure moves to "completed" status, returning to `/report/:id` via "View Report" still shows all edit controls active: the Clinical Impression and Recommendations textareas remain editable, "Save Draft" is clickable, and "Proceed to Sign & Deliver" is still shown. No read-only banner is displayed.
*Affects:* NAV-032, RP-029

**Bug #14 — Raw Gemini API Error Exposed in UI**
When the Copilot "Generate Clinical Impression" button is clicked, the full raw Gemini API JSON error response (HTTP 429, RESOURCE_EXHAUSTED, quota violation details, retry delay, JSON structure) is displayed directly in the Copilot Auto-Draft panel in red text. Users should see a friendly error like "AI generation temporarily unavailable."
*Affects:* BR-550

---

## Bugs from Prior Sessions (Summary)

| # | Description | Screen |
|---|---|---|
| 1 | Notification panel "Clear All" button missing | SCR-01 |
| 2 | Avatar/profile menu does nothing (clinician_auth button non-functional) | SCR-01 |
| 3 | Clear All button absent from notifications | SCR-01 |
| 4 | Worklist has no urgency or date range filters | SCR-35 |
| 5 | No sort controls on worklist columns | SCR-35 |
| 6 | Notification click-through does not navigate to source record | SCR-01 |
| 7 | Unread notification badge does not update after clicking an item | SCR-01 |
| 8 | Notification settings button non-functional | SCR-01 |
| 9 | Activity Log (/activity) fully accessible to clinician_auth — no restriction | SCR-07 |
| 10 | Admin sub-routes bypass /admin access control for clinician_auth | SCR-24/25/27 |
| 11 | Finding X button silently deletes with no confirm / no undo / no dismiss distinction | SCR-10 |
| 12 | No read-only banner on Closed procedure Summary | SCR-11 |
| 13 | Signed report remains fully editable — no lock on completion | SCR-12 |
| 14 | Raw Gemini API JSON error displayed in Copilot panel | SCR-12 |

---

## Active Blockers

| # | Blocker | Impact |
|---|---|---|
| 1 | Void procedure — no seed data with void status | ~3 scenarios |
| 2 | Admin OAuth popup — admin role login requires popup auth | ~15 scenarios (admin screens) |
| 3 | clinical_staff / User role — no credentials available | ~65 scenarios |
| 4 | clinician_noauth — no credentials available | ~8 scenarios |
| 5 | Gemini billing — API quota exhausted, Copilot features non-functional | ~35 scenarios |
| 6 | No capsule frames uploaded — Viewer video area empty, all playback blocked | ~45 scenarios |
| 7 | Mobile testing — mobile PWA/responsive testing not performed | ~8 scenarios |

---

## Key Findings by Feature Area

### What Works Well ✓
- **Core navigation:** All 8 procedure status → route mappings work correctly across Dashboard, Worklist, and Procedures screens (routeByStatus.ts consistent throughout)
- **Login/auth:** Firebase Authentication working (valid creds → dashboard, invalid → blocked)
- **Patient registration:** Modal with all required fields functional
- **Patient search:** Filters correctly
- **Procedure lifecycle routing:** All 8 status states route correctly
- **Report editor:** Manual text entry, Save Draft, ICD code selection, Sign & Deliver flow all working
- **Sign & Deliver:** Full report preview, e-signature, delivery option selection (PDF/email/HL7/print), delivery recording all functional
- **Clinic Operations Dashboard:** Procedure funnel, KPI tiles, status breakdown all correct
- **Analytics Workbench:** 4 KPI tiles with correct counts, study type and status breakdowns visible
- **Admin access control:** /admin correctly denied for clinician_auth (though sub-routes are bypassed — Bug #10)

### Major Missing Features ✗
- **Viewer tools:** No annotation/markup tools, no landmark setting, no brightness/contrast/color, no QuickView/SBI/Dual Camera/GI Map, no pin tools — virtually no clinical tool palette implemented
- **Copilot/AI:** All AI features blocked by Gemini quota (bug #14 raw error exposed)
- **Incidental findings management:** No separate incidental tray, no batch confirm/dismiss, no sensitivity adjustment post-review
- **Workflow stepper (NUX):** 6-step progress stepper entirely absent from all screens
- **Procedure Summary:** Only shows basic metadata — no AI Impression, Lewis Score, transit times, quality metrics, ICD codes, surveillance recs, or study-type-specific panels
- **Patient record tabs:** Medical History, Medications, Allergies, Patient Activity Log tabs not implemented
- **Report templates:** No study-type-specific templates — single generic 3-section layout for all study types
- **ICD Code Management:** Stub page only ("coming soon")
- **Report locking:** Signed reports remain fully editable
- **Notification system:** Click-through navigation broken; no toast delivery notifications

---

## Scenario Results — Selected FAILs & BLOCKEDs by Screen

### SCR-10 Viewer (132 scenarios — 13P / 84F / 35B)
PASS: RV-001, RV-001-PRC, RV-002-PRC, RV-004 (dismiss), RV-009 (manual add), RV-019 (patient bar), RV-028-031 (speeds), RV-103, RV-106, BR-519, BR-520
FAIL highlights: No confirm/modify finding flow, no tools (annotation/markup/landmark/zoom/brightness), no 8x speed, no stepper, no Crohn's mode, no delegation badge, no transfer panel, no leave-warning, no incidental tray
BLOCKED: All playback (no frames), all Copilot features (Gemini)

### SCR-11 Procedure Summary (42 scenarios — 5P / 37F / 0B)
PASS: BR-528, RV-078, RV-088, RV-099
FAIL highlights: No AI Impression, Lewis Score, transit times, quality metrics, ICD codes, surveillance recs, study-type panels, bowel prep, annotation editing, or read-only banner for Closed

### SCR-12 Generate Report (45 scenarios — 8P / 29F / 8B)
PASS: BR-539, BR-541, BR-547, RP-002, RP-008, RP-019, RV-084, BR-548, BR-549
FAIL highlights: No study-type-specific templates, no report variants, no thumbnail options, no DICOM export, no report locking, no versioning/amendments, no supplemental sections
BLOCKED: Copilot generation (Gemini), mobile tests

### SCR-13 Sign & Deliver (22 scenarios — 7P / 12F / 3B)
PASS: RP-022, RP-026, RP-028, RP-020, RP-032, RP-033, SD-002-DD
FAIL highlights: No delivery toasts (inline message instead), no delivery defaults pre-populated, no signed report download, no stepper

---

## Detailed Results File
All 381 scenario results are recorded in `/sessions/practical-nice-euler/test_results.py` with individual PASS/FAIL/BLOCKED codes and notes.
