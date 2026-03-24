# Sonnet Phase 3 Test Prompt — Comprehensive Pre-Pipeline Verification
**Use this prompt to initiate a Sonnet Cowork session AFTER all build phases (0–6) in PRE_PIPELINE_BUILD_PLAN.md are complete.**

---

You are a **Sonnet test execution session** for ZoCW (Zo Clinicians Workbench). Your job is to run a **comprehensive spreadsheet-driven test pass** across all screens affected by the Phase 2–6 feature builds, covering **413+ scenarios across 5 roles**. You will also run the unit test suite and Cloud Function smoke tests.

**Target: 400+ scenario verifications in this session.**

## STEP 0: PRE-FLIGHT + CONTEXT

```bash
bash preflight.sh
```

Then read these files (in order):
1. `HANDOFF.md` — current state
2. `docs/PRE_PIPELINE_BUILD_PLAN.md` — what was built and why (12 bugs across 6 phases)
3. `docs/BROWSER_AUTH_AUTOMATION.md` — login automation (CRITICAL for React controlled forms)
4. `docs/VERIFICATION_RESULTS_2026-03-24.md` — previous test baseline (258 PASS cumulative)

Then open the test spreadsheet for reference:
5. `../Zo_Workbench_Functional_Test_Scenarios_v2_4.xlsx` — master scenario matrix (825 scenarios)

Read the **Scenario Matrix** sheet. You will use this as your primary test plan. Each row has: Id, Flow, Area, Scr (screen code), Role, Type, Title, Precond, Steps, Expected.

## STEP 1: UNIT TESTS

Run the vitest suite first. This catches regressions before browser testing.

```bash
npx vitest run --reporter=verbose 2>&1 | tee /tmp/vitest-results.txt
```

Record: total tests, pass count, fail count, and any failure details.

If critical unit tests fail (clinical calculations, RBAC logic), **document but continue** — browser testing may reveal whether the failures are unit-test-only or affect the live app.

## STEP 2: CLOUD FUNCTION SMOKE TEST

Verify Cloud Functions are deployed and responding:

1. Log in as `clinician@zocw.com` (password: `password`)
2. Navigate to a `ready_for_review` procedure and open it (triggers `onProcedureWrite`)
3. Switch to `admin@zocw.com`, check Activity Log (`/activity`) — should show a new audit entry
4. Switch back to `clinician@zocw.com`, check notification bell — should have a new notification

Record result: PASS/FAIL/BLOCKED. If BLOCKED, note which functions are unavailable and mark dependent scenarios accordingly.

## STEP 3: SPREADSHEET-DRIVEN TESTING — TARGET SCREENS

This is the core of the session. Test **all scenarios** from the Scenario Matrix for the screens listed below. Use the spreadsheet's Id, Steps, and Expected columns as your test plan.

### Testing Protocol

For each screen:
1. Filter the Scenario Matrix to the screen code (Scr column)
2. Group scenarios by Role
3. Log in as the appropriate test user for each role group
4. Execute each scenario following its Steps column
5. Compare actual behavior against its Expected column
6. Record: scenario Id, Role, PASS/FAIL/BLOCKED, and notes for any failure

**Role → Test User Mapping:**

| Spreadsheet Role | Test User | Password |
|-----------------|-----------|----------|
| Authorized Clinician | clinician@zocw.com | password |
| Administrator | admin@zocw.com | password |
| Clinician Not Auth to Sign | noauth@zocw.com | password |
| Clinician Administrator | clinadmin@zocw.com | password |
| User (generic) | clinician@zocw.com | password |
| Clinical Staff | staff@zocw.com | password |

### 3A: Dashboard — SCR-01 (143 scenarios)

**Previous Session 4 results:** 20 PASS / 17 FAIL / 4 BLOCKED out of 41 reachable
**Why re-test:** BUG-16 (urgent KPI widget) and BUG-17 (quick-action shortcuts) add new Dashboard features. Also, Session 4 only tested 41 of 143 scenarios because admin/noauth/clinadmin roles weren't available. Now all 5 roles are available.

**Test all 143 scenarios** across all roles. Pay special attention to:
- KPI widgets: urgent case count (BUG-16), click navigation to filtered worklist
- Quick-action shortcuts (BUG-17): presence, navigation targets, filter params
- Notification panel interactions (BUG-03/06/07/08 — regression check)
- Role-specific dashboard views (admin sees 0 procedures, clinician sees seed data)

### 3B: Procedures — SCR-03 (100 scenarios)

**Previous:** 12 PASS / 14 FAIL / 3 BLOCKED out of 29 reachable
**Why re-test:** BUG-22 (inline metadata edit) and BUG-23 (creation validation/prefill) add new procedure management features. Multi-role testing now possible.

**Test all 100 scenarios.** Focus on:
- Inline edit: edit icon on draft/ready_for_review, disabled on completed/closed/void (BUG-22)
- Save persistence: edit field, save, verify value persists (BUG-22)
- Creation validation: required fields, duplicate detection (BUG-23)
- Smart prefill from patient history (BUG-23)
- Status filter, urgency filter, sorting (BUG-04/05/18/34 — regression)

### 3C: Reports Hub — SCR-04 (4 scenarios)

**Previous:** 1 PASS / 1 FAIL / 1 BLOCKED out of 3 reachable
**Why re-test:** BUG-51 completely redesigns this screen from flat list to tile-based navigation.

**Test all 4 scenarios.** Verify:
- Tile layout renders (not flat list)
- Card counts match Firestore data
- Each tile navigates to correctly filtered view
- Role-appropriate access

### 3D: Activity Log — SCR-07 (9 scenarios)

**Previous:** 0 PASS / 1 FAIL / 0 BLOCKED out of 1 reachable
**Why re-test:** Cloud Functions now deployed (triggers populate audit entries), re-seed provides data, all roles available.

**Test all 9 scenarios.** Verify:
- Admin and clinician_admin can access (RBAC — BUG-09 regression)
- Other roles see Access Denied
- UX-09 user filter dropdown populated with users
- UX-10 date range filter functional
- Audit entries present with timestamps and user attribution

### 3E: Summary — SCR-11 (43 scenarios)

**Previous:** 5 PASS / 37 FAIL / 0 BLOCKED out of 42 reachable
**Why re-test:** BUG-35 (Lewis Score, transit times, study panels), BUG-36 (quality metrics auto-calc), BUG-39 (risk scoring + surveillance) — major feature additions.

**Test all 43 scenarios.** This is a high-value screen. Focus on:
- Lewis Score: numeric value, interpretation text, segment breakdown (BUG-35)
- Transit times: gastric/small bowel/colonic with normal ranges (BUG-35)
- Study-specific panels: different content for capsule vs colonoscopy (BUG-35)
- Quality metrics: bowel prep, completion rate, auto-calculated values (BUG-36)
- Read-only state for closed/void procedures (BUG-12 — regression)
- Risk score + surveillance recommendation (BUG-39)
- Workflow stepper present (BUG-31 — regression)

### 3F: Report Editor — SCR-12 (60 scenarios)

**Previous:** 8 PASS / 29 FAIL / 8 BLOCKED out of 45 reachable
**Why re-test:** BUG-38 (templates, versioning) and BUG-41 (practice favorites in code suggestions) — major feature additions.

**Test all 60 scenarios.** Focus on:
- Template auto-selection based on study type (BUG-38)
- Study-type-specific section headings (BUG-38)
- Version history: visible, tracks amendments (BUG-38)
- ICD/CPT suggestions: practice favorites ranked first, confidence scores shown (BUG-41)
- Report locking: signed reports read-only (BUG-13 — regression)
- Copilot error handling (BUG-14 — regression)
- Save Draft and Sign & Deliver flows

### 3G: Patient Demographics — SCR-14 (9 scenarios)

**Previous:** 0 PASS / 1 FAIL / 1 BLOCKED
**Why re-test:** BUG-44 (demographics editable form) — new feature.

**Test all 9 scenarios.** Verify:
- Edit mode: form fields editable, Save button functional (BUG-44)
- Role gate: edit disabled for noauth/clinical_staff (BUG-44)
- Data persistence: edit, save, reload, verify

### 3H: Medical History — SCR-15 (7 scenarios)

**Previous:** 0 PASS / 3 FAIL / 1 BLOCKED
**Why re-test:** BUG-45 — entirely new tab.

**Test all 7 scenarios.** Verify:
- Tab renders with seeded data or empty state
- Add/edit/delete entries
- Role-appropriate access

### 3I: Medications — SCR-16 (7 scenarios)

**Previous:** 0 PASS / 2 FAIL / 1 BLOCKED
**Why re-test:** BUG-45 — entirely new tab.

**Test all 7 scenarios.** Verify:
- Tab renders, add new medication, edit existing, delete
- Dosage and frequency fields present

### 3J: Allergies — SCR-17 (7 scenarios)

**Previous:** 0 PASS / 3 FAIL / 1 BLOCKED
**Why re-test:** BUG-45 — entirely new tab.

**Test all 7 scenarios.** Verify:
- Tab renders, severity indicators present
- Add/edit/delete allergies

### 3K: Patient Procedures Tab — SCR-18 (7 scenarios)

**Previous:** 1 PASS / 2 FAIL / 1 BLOCKED
**Test all 7.** Verify procedure history list, filters, status display.

### 3L: Signed Reports — SCR-19 (4 scenarios)

**Previous:** 1 PASS / 0 FAIL / 0 BLOCKED
**Why re-test:** BUG-47 — signed reports section in Patient Overview.

**Test all 4 scenarios.** Verify signed report cards with dates and clinician names.

### 3M: Patient Activity Log — SCR-21 (8 scenarios)

**Previous:** 0 PASS / 4 FAIL / 1 BLOCKED
**Why re-test:** BUG-48 — patient-specific activity log tab.

**Test all 8 scenarios.** Verify events are filtered to the specific patient.

### 3N: Education Copilot — SCR-20 (5 scenarios)

**Previous:** 0 PASS / 0 FAIL / 1 BLOCKED
**Test all 5 if accessible.** May be BLOCKED if Gemini API not configured. Record status.

## STEP 4: CROSS-SCREEN REGRESSION

After completing screen-by-screen testing, verify these critical cross-cutting concerns:

| # | Test | Role | Screen | Expected |
|---|------|------|--------|----------|
| R-01 | Dashboard loads with stats | clinician | SCR-01 | KPI counts visible, sidebar correct |
| R-02 | /admin blocked for non-admin | noauth | Admin | Access Denied screen |
| R-03 | Admin panel loads | admin | Admin | All 5 admin cards visible |
| R-04 | /admin/practice no crash (BUG-52) | admin | Admin | Form renders, no React Error #310 |
| R-05 | Activity Log sidebar hidden (BUG-53) | clinician | Sidebar | Activity Log link absent |
| R-06 | Worklist filters functional | clinician | SCR-02 | Status, urgency, sort all work |
| R-07 | Notification badge count (BUG-15) | clinician | Header | Badge shows number, not dot |
| R-08 | Sign & Deliver role gate | admin | SCR-13 | "does not have signing authority" |
| R-09 | clinician_admin hybrid access | clinadmin | Admin + Sign | Can access admin AND can sign |
| R-10 | clinical_staff basic access | staff | Dashboard | Dashboard loads, no admin section |
| R-11 | Workflow stepper visible (BUG-31) | clinician | Viewer/Summary/Report | Stepper shows correct step |
| R-12 | Finding delete confirmation (BUG-11) | clinician | Viewer | Modal confirmation dialog |

## STEP 5: WRITE RESULTS

Create `docs/TEST_RESULTS_PHASE3_2026-XX-XX.md` (use actual date) with these sections:

### Section 1: Session Summary
- Date, tester, app version, build commit
- Total scenarios tested vs total in scope
- Overall PASS/FAIL/BLOCKED counts

### Section 2: Unit Test Results
- vitest output summary (pass/fail/skip counts)
- Any failure details

### Section 3: Cloud Function Status
- Deployed: yes/no
- Each function tested and result
- Triggers firing: yes/no

### Section 4: Screen-by-Screen Results

For EACH screen (3A through 3N), create a summary table:

```
### SCR-XX: [Screen Name] (Y scenarios)
Previous: A PASS / B FAIL / C BLOCKED
Current:  D PASS / E FAIL / F BLOCKED
Delta:    +G PASS / -H FAIL / -I BLOCKED

| Scenario Id | Role | Result | Notes |
|------------|------|--------|-------|
| XX-001     | auth | PASS   |       |
| XX-002     | auth | FAIL   | Missing widget |
```

**IMPORTANT:** Log EVERY scenario with its spreadsheet Id. Do not summarize as "all passed" — record each one individually. This is critical for tracking cumulative progress.

### Section 5: Regression Results
Table of R-01 through R-12 results.

### Section 6: New Bugs Found
| Bug ID | Severity | Screen | Description |
Assign IDs starting from BUG-54.

### Section 7: Heuristic Flow Re-Scores
If any feature changes affect heuristic scoring, re-score the affected flows using the 7-heuristic model (Clarity, Cognitive Load, Speed, Trust, Error Prevention, Traceability, State Clarity). All 4 flows must maintain ≥38.

### Section 8: Cumulative Totals
Update running totals from VERIFICATION_RESULTS_2026-03-24.md:
- Previous: 258 PASS / 496 FAIL / 109 BLOCKED
- This session: X PASS / Y FAIL / Z BLOCKED
- **Cumulative: (258+X) PASS / ... / ...**

### Section 9: Bug Fix Progress
- Total unique bugs: 52 (54 originally - 2 duplicates closed)
- Previously fixed: 31 (29 + BUG-01 dup + BUG-49 dup)
- Fixed this build cycle: 12 (BUG-16/17/22/23/35/36/38/39/41/44/45/47 + BUG-48/51)
- Verified this session: (count)
- Remaining (deferred to pipeline): 11
- Remaining (other): (count)

### Section 10: Release Readiness Update
| Metric | Threshold | Previous | Current | Status |
|--------|-----------|---------|---------|--------|
| Critical Friction Items (Sev 4) | 0 | 0 | ? | ? |
| Critical Flow Confidence | ≥ 95% | 100% | ? | ? |
| Phase 3 Feature Coverage | 100% | N/A | ? | ? |
| clinical_staff role tested | yes | no | ? | ? |
| Unit test pass rate | 100% | N/A | ? | ? |

## STEP 6: WRAP-UP

1. Run `bash preflight.sh`
2. Update `HANDOFF.md` with session log entry including scenario counts
3. Stage and commit (DO NOT PUSH):
```bash
git add docs/TEST_RESULTS_PHASE3_*.md HANDOFF.md
git commit -m "test: Phase 3 comprehensive verification — XXX scenarios across 14 screens

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
4. Tell Cameron the results and remind: `git push origin main`

---

## Test User Reference

| Email | Password | Role | Has Seed Data |
|-------|----------|------|---------------|
| clinician@zocw.com | password | clinician_auth | Yes (10 patients, 16 procedures, notifications) |
| admin@zocw.com | password | admin | No procedures (admin-only role) |
| staff@zocw.com | password | clinical_staff | No |
| noauth@zocw.com | password | clinician_noauth | No |
| clinadmin@zocw.com | password | clinician_admin | No (has admin + sign access) |

## Login Automation (CRITICAL)

React controlled inputs require the native value setter technique. See `docs/BROWSER_AUTH_AUTOMATION.md` for the exact JavaScript snippets. **Do NOT use regular `.value` assignment** — it won't trigger React state updates and the login will silently fail.

**Role switching procedure:** Clear IndexedDB → navigate to `/login` → enter credentials using native setter → click Sign In. See BROWSER_AUTH_AUTOMATION.md for the full code block.

---

## Scenario Count Target

| Screen | Code | Scenarios | Notes |
|--------|------|-----------|-------|
| Dashboard | SCR-01 | 143 | All roles now testable |
| Procedures | SCR-03 | 100 | All roles |
| Reports Hub | SCR-04 | 4 | Redesigned |
| Activity Log | SCR-07 | 9 | Now has data |
| Summary | SCR-11 | 43 | Major feature additions |
| Report Editor | SCR-12 | 60 | Templates + suggestions |
| Patient Demographics | SCR-14 | 9 | New edit form |
| Medical History | SCR-15 | 7 | New tab |
| Medications | SCR-16 | 7 | New tab |
| Allergies | SCR-17 | 7 | New tab |
| Patient Procedures | SCR-18 | 7 | Existing |
| Signed Reports | SCR-19 | 4 | New section |
| Education Copilot | SCR-20 | 5 | May be blocked |
| Patient Activity Log | SCR-21 | 8 | New tab |
| **Regression** | Cross | **12** | Cross-screen checks |
| **TOTAL** | | **~425** | |

**Minimum acceptable coverage: 400 scenarios tested with individual results logged.**

---

*Generated by Claude Opus 4.6 — March 24, 2026*
