# ZoCW Pre-Pipeline Build Plan
**Date:** March 24, 2026
**Author:** Claude Opus 4.6 (Cowork orchestration session)
**Scope:** Address all non-image-pipeline bugs before BUILD_09

---

## Reclassification of Remaining 25 Bugs

The original classifications from the Session 1 bug fix report are misleading. Several bugs labeled "Requires Cloud Functions" or "Requires admin test credentials" are actually straightforward frontend feature builds that can be tackled now. Here's the corrected picture:

### Close Immediately (2 bugs — already resolved)

| Bug | Original Label | Actual Status |
|-----|---------------|---------------|
| BUG-01 | "Requires Firebase Functions for notification fan-out" | **DUPLICATE of BUG-03** (notification "Clear All" — already fixed in Session 1) |
| BUG-49 | "Require admin test credentials" | **DUPLICATE of BUG-09** (Activity Log role gate — already fixed in Session 1). Description matches exactly: restrict `/activity` to admin/clinician_admin. We now have all test users anyway. |

### Defer to Image Pipeline Phase (11 bugs)

These depend on capsule frame data, the image viewer, or cross-project pipeline integration. They belong in BUILD_09.

| Bug | Description | Why Deferred |
|-----|-------------|-------------|
| BUG-19 | Capsule image upload flow | Core pipeline feature |
| BUG-20 | Capsule frame display in Viewer | Needs frame data from pipeline |
| BUG-21 | AI findings overlay on frames | Needs pipeline + Gemini |
| BUG-24 | AI Impression panels in Viewer/Summary | Needs Gemini API + frame data |
| BUG-25 | Incidental finding tray in Viewer | Viewer feature, needs frame context |
| BUG-26 | Viewer toolbar (measurement, voice, stepper) | Measurement tools need frame data |
| BUG-27 | Incidental findings across Viewer→Summary→Report | Starts in Viewer; wire end-to-end with pipeline |
| BUG-28 | Annotation panel edit/delete/timeline | Viewer annotations need frame anchors |
| BUG-29 | GI Map component | Needs anatomical location data from findings |
| BUG-30 | Video playback timeline | Needs capsule frame sequence |
| BUG-37 | Findings thumbnails on Summary | Needs frame image URLs |

### Build Now: Frontend Feature Builds (12 bugs)

These are pure frontend work with no external blockers. Grouped by screen for efficient Sonnet batching.

**Dashboard (2 bugs):**
| Bug | Description | Complexity | Files |
|-----|-------------|-----------|-------|
| BUG-16 | Urgent case count KPI widget | Low | Dashboard.tsx |
| BUG-17 | Quick-action shortcuts (Start Procedure, Review Pending, etc.) | Medium | Dashboard.tsx |

**Procedures (2 bugs):**
| Bug | Description | Complexity | Files |
|-----|-------------|-----------|-------|
| BUG-22 | Inline metadata editing on procedure list | Medium | Procedures.tsx |
| BUG-23 | New procedure creation validation + smart prefill | Medium | Procedures.tsx, CheckIn.tsx |

**Summary Screen (3 bugs):**
| Bug | Description | Complexity | Files |
|-----|-------------|-----------|-------|
| BUG-35 | Lewis Score, transit times, study-specific panels | High | Summary.tsx (wires to `calculateTransitTimes` CF) |
| BUG-36 | Quality metric auto-calculation (prep adequacy, duration, detection rate) | Medium | Summary.tsx |
| BUG-39 | Risk scoring models + surveillance/follow-up recommendations | High | Summary.tsx |

**Report Editor (2 bugs):**
| Bug | Description | Complexity | Files |
|-----|-------------|-----------|-------|
| BUG-38 | Report template system, study-type sections, versioning/amendments | High | Report.tsx |
| BUG-41 | Practice favorites in ICD/CPT suggestions + confidence scores | Medium | Report.tsx (wires to `suggestCodes` CF) |

**Patient Overview (3 bugs):**
| Bug | Description | Complexity | Files |
|-----|-------------|-----------|-------|
| BUG-44 | Patient demographics editable form | Medium | PatientOverview.tsx |
| BUG-45 | Medical History, Medications, Allergies tabs | High | PatientOverview.tsx (new tab components) |
| BUG-47 | Signed reports section/tab | Medium | PatientOverview.tsx |

### Reclassified Out (2 bugs)

| Bug | Original Label | Reclassification |
|-----|---------------|-----------------|
| BUG-48 | "Require admin test credentials" | Actually a FEATURE-BUILD (patient-specific activity log). However, this is better implemented AFTER the global Activity Log has real data (post-reseed). **Move to Phase 3 below.** |
| BUG-51 | "Require deployment pipeline" | Actually a FEATURE-BUILD (Reports Hub tile layout redesign). No blockers. **Move to Phase 4 below.** |

---

## Build Phases

### Phase 0: Housekeeping (Opus — this session)
**Estimated effort:** 15 minutes
**Automation:** Fully scripted

1. Close BUG-01 and BUG-49 as duplicates — update BUG_FIX_SESSION_REPORT and HANDOFF
2. Reclassify BUG-36 (not a duplicate of BUG-11 — the Session 1 report got this wrong; BUG-36 is quality metric auto-calc, BUG-11 is finding delete confirmation)
3. Re-seed Firestore: `npx tsx seed-demo.ts` in Firebase Studio
4. Verify Activity Log populates with audit entries after re-seed
5. Update bug counts in all tracking docs (54 total → 52 unique, 31 fixed including duplicates)

### Phase 1: Deploy Cloud Functions (Cameron in Firebase Studio)
**Estimated effort:** 30 minutes
**Automation:** Single deploy command + smoke test

The `functions/` directory contains 14 production-ready Cloud Functions that have never been deployed. The Blaze plan is now active. Deploying these unblocks several Phase 3 features.

**Steps:**
```bash
# In Firebase Studio terminal
cd functions
npm install
npm run build        # tsc compile — watch for @types path alias issues
firebase deploy --only functions
```

**What this enables:**
- `onProcedureWrite` trigger → automatic audit log entries + notification fan-out on procedure changes
- `onReportSign` trigger → post-sign workflow (delivery tracking, audit)
- `generateReportPdf` → PDF export (wires to BUG-38)
- `suggestCodes` → ICD/CPT suggestions with practice favorites (wires to BUG-41)
- `calculateTransitTimes` → GI transit time computation (wires to BUG-35)
- `generateAutoDraft` → AI auto-draft via Gemini (wires to Copilot panel)
- `bulkUpdateProcedureStatus` → batch workflow transitions
- `transferReview` → clinician handoff

**Smoke test (automated via browser):**
After deploy, trigger a procedure status change via the app. Check:
- Activity Log shows a new audit entry (trigger fired)
- Notification appears for the assigned clinician (fan-out worked)

**Risk:** The functions import from `@types/...` path aliases. If `tsconfig.json` in `functions/` doesn't resolve these, the build will fail. Fix: add path mappings or switch to relative imports. This is a Sonnet-scoped fix if needed.

### Phase 2: Dashboard + Reports Hub (Sonnet batch)
**Bugs:** BUG-16, BUG-17, BUG-51
**Estimated effort:** 1–2 hours
**Files:** Dashboard.tsx, ReportsHub.tsx

These are the simplest feature builds — bounded UI additions with no cross-screen dependencies.

**BUG-16 — Urgent KPI widget:**
Add a KPI card to Dashboard showing count of procedures where `urgency === 'stat'` or `urgency === 'urgent'`. Wire to existing Firestore query. Click navigates to `/worklist?urgency=urgent`.

**BUG-17 — Quick-action shortcuts:**
Add a row of shortcut buttons below KPIs: "New Procedure" → `/procedures/new`, "Review Pending" → `/worklist?status=ready_for_review`, "Recent Reports" → `/reports-hub`. Use existing navigation patterns.

**BUG-51 — Reports Hub tile layout:**
Redesign ReportsHub.tsx from flat list to tile-based card navigation: "Pending Reports", "Signed Reports", "Overdue Reports", "All Reports". Each card shows count + navigates to filtered view.

**Automation opportunity:** These are all testable via browser automation — card renders, click targets, filter params in URL.

### Phase 3: Patient Overview Expansion (Sonnet batch)
**Bugs:** BUG-44, BUG-45, BUG-47, BUG-48
**Estimated effort:** 3–4 hours
**Files:** PatientOverview.tsx (+ new tab components)

All four bugs are additions to the Patient Overview screen. Build them as tabs in a single batch.

**BUG-44 — Demographics edit:**
Convert existing read-only demographics display to an editable form with Save button. Fields: name, DOB, contact info, insurance. Role-gate: only clinician_auth and clinician_admin can edit.

**BUG-45 — Medical History / Medications / Allergies:**
Three new tabs with add/edit/delete functionality. Data model: subcollections under `patients/{patientId}` — `medicalHistory`, `medications`, `allergies`. Each with standard CRUD. Seed data should include sample entries.

**BUG-47 — Signed reports section:**
New tab showing all signed/finalized reports for this patient. Query: `reports` where `patientId === currentPatient.id && status === 'signed'`. Display as cards with date, procedure type, clinician name, and link to full report.

**BUG-48 — Patient activity log:**
New tab showing patient-specific audit events. Query: `activityLog` filtered by `patientId`. Reuse Activity Log UI components but scoped to single patient.

**Automation opportunity:** All tab navigation + CRUD operations are browser-automatable. Seed data additions make verification deterministic.

### Phase 4: Procedures Management (Sonnet batch)
**Bugs:** BUG-22, BUG-23
**Estimated effort:** 2–3 hours
**Files:** Procedures.tsx, CheckIn.tsx

**BUG-22 — Inline metadata edit:**
Add edit icon/button to each procedure row in the list. Click opens inline form (or modal) to edit study type, urgency, assigned clinician, and notes. Save calls `updateDoc`. Only editable when status is `draft` or `ready_for_review`.

**BUG-23 — Creation validation + prefill:**
Add form validation to new procedure flow: required fields (patient, study type, urgency), duplicate check (same patient + study type within 30 days), and smart prefill from patient's most recent procedure (same study type, same clinic).

**Automation opportunity:** Validate that inline edit saves correctly, that validation blocks invalid submissions, and that prefill populates expected values.

### Phase 5: Summary Enhancements (Sonnet batch — wires to Cloud Functions)
**Bugs:** BUG-35, BUG-36, BUG-39
**Estimated effort:** 4–5 hours
**Files:** Summary.tsx (+ new calculation utility modules)
**Prerequisite:** Phase 1 (Cloud Functions deployed) for transit time calculation

**BUG-35 — Lewis Score + transit times + study panels:**
- Lewis Score: implement calculation based on findings (villous edema, ulcer, stenosis scores per GI segment). Display as score card with interpretation (normal < 135, mild 135–790, moderate-severe > 790).
- Transit times: call `calculateTransitTimes` Cloud Function. Display table: gastric, small bowel, colonic transit times with normal ranges.
- Study-specific panels: conditionally render based on `studyType` (e.g., capsule endoscopy shows CEST classification, colonoscopy shows polyp characteristics).

**BUG-36 — Quality metric auto-calculation:**
Add auto-calculated metrics section: bowel prep adequacy (already partially built in BUG-40 fix), procedure duration, completion rate (capsule reached cecum?), polyp detection rate. Read from procedure and findings data.

**BUG-39 — Risk scoring + surveillance:**
Implement risk scoring based on findings (e.g., adenoma characteristics → surveillance interval per USMSTF guidelines). Display as recommendation card: "Recommended follow-up: Repeat colonoscopy in 3 years" with supporting criteria.

**Automation opportunity:** Lewis Score and risk scoring are purely computational — ideal for unit testing with known inputs → expected outputs. Create `src/utils/clinicalCalculations.ts` and write vitest tests.

### Phase 6: Report Enhancements (Sonnet batch — wires to Cloud Functions)
**Bugs:** BUG-38, BUG-41
**Estimated effort:** 4–5 hours
**Files:** Report.tsx, ICDCodeSuggestions component
**Prerequisite:** Phase 1 (Cloud Functions deployed) for suggestCodes

**BUG-38 — Report templates + versioning:**
- Template selection: auto-select template based on `studyType`. Store templates in Firestore `reportTemplates` collection.
- Study-type sections: template defines section headings (e.g., capsule template has "Transit Times", "Mucosal Assessment", "Pathology Correlation").
- Versioning: track report amendments. Each save creates a version entry. Display version history with diff highlights.

**BUG-41 — Practice favorites in code suggestions:**
- Wire `suggestCodes` callable function from frontend.
- Pass `practiceId` so the function can query `practices/{practiceId}/icdFavorites`.
- Display suggestions ranked by: (1) practice favorites first, (2) AI-suggested codes, (3) general codes.
- Show confidence score badge on each suggestion.

**Automation opportunity:** Code suggestion ranking is testable — seed known favorites, verify they appear first. Template selection based on study type is deterministic.

---

## Automated Testing Strategy

### Unit Tests (NEW — set up vitest)

The project currently has zero unit tests. Setting up vitest is high-value, low-effort.

**Setup (Sonnet task — 30 minutes):**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Priority test targets:**
| Module | What to Test | Why |
|--------|-------------|-----|
| `src/utils/clinicalCalculations.ts` (new) | Lewis Score, risk scoring, transit time interpretation | Pure functions, clinically critical, deterministic |
| `src/lib/hooks.tsx` | `useAuth` role parsing, `usePractice` data shape | Foundation for all RBAC logic |
| `src/components/Sidebar.tsx` | Role-based nav item filtering | Regression-prone (BUG-53 was exactly this) |
| `seed-demo.ts` | Seed data integrity (status/report consistency) | Prevents BUG-SEED-4/5 class issues |

**Estimated coverage gain:** 40–60 unit tests covering clinical calculations and RBAC logic.

### Cloud Function Integration Tests (Firebase Emulator)

The `firebase.json` already has emulator configs. The functions `package.json` has jest configured.

**Setup (Sonnet task — 1 hour):**
```bash
cd functions
npm install
npm test  # jest already in devDependencies
```

**Priority test targets:**
| Function | Test |
|----------|------|
| `onProcedureWrite` | Status transition validation, audit log entry creation, notification dispatch |
| `onReportSign` | Post-sign workflow triggers correctly |
| `suggestCodes` | Returns practice favorites first, validates input schema |
| `calculateTransitTimes` | Known input → expected output |
| `setInitialUserClaims` | Correct custom claims set |

### Browser Automation Tests (Structured Suite)

Currently ad hoc. Formalize into a repeatable suite:

**Create `docs/BROWSER_TEST_SUITE.md`** with numbered test cases, each specifying:
- Pre-condition (role, seed state)
- Steps (navigate, click, verify)
- Expected result
- Pass/fail criteria

This becomes the input for Sonnet test sessions — no more ad hoc test plans.

---

## Execution Order & Model Routing

| Phase | Work | Model | Dependency | Est. Time |
|-------|------|-------|-----------|-----------|
| 0 | Housekeeping (close dupes, re-seed) | Opus (this session) | None | 15 min |
| 1 | Deploy Cloud Functions | Cameron (Firebase Studio) | Phase 0 | 30 min |
| — | Set up vitest | Sonnet | None (parallel with Phase 1) | 30 min |
| 2 | Dashboard + Reports Hub | Sonnet | Phase 0 | 1–2 hrs |
| 3 | Patient Overview expansion | Sonnet | Phase 0 | 3–4 hrs |
| 4 | Procedures management | Sonnet | Phase 0 | 2–3 hrs |
| 5 | Summary enhancements | Sonnet | Phase 1 (CFs for transit times) | 4–5 hrs |
| 6 | Report enhancements | Sonnet | Phase 1 (CFs for suggestCodes) | 4–5 hrs |
| — | Unit tests for Phase 5/6 | Sonnet | Phase 5 + 6 | 1–2 hrs |
| **TEST** | **Full Sonnet verification session** | **Sonnet** | **All phases** | **2–3 hrs** |

**Total estimated build time: ~18–25 hours of Sonnet execution**
**Total bugs addressed: 14 built + 2 closed + 11 deferred = 27 of 27 remaining accounted for**

---

## Sonnet Test Session Prompt

After all build phases are complete, use the prompt in `docs/SONNET_PHASE3_TEST_PROMPT.md` to initiate a comprehensive verification session covering all new features. That prompt will be created alongside this plan.

---

*Generated by Claude Opus 4.6 — March 24, 2026*
