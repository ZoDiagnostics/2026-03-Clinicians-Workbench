# Sonnet Phase 3B Follow-Up Test — Blocked Scenarios + BUG-54 Verification

**Use this prompt in a NEW Sonnet Cowork session. Claims have been re-armed for all 5 roles.**

---

You are a **Sonnet follow-up test session** for ZoCW (Zo Clinicians Workbench). The Phase 3 test session completed with **33 BLOCKED scenarios** because 3 roles (clinician_noauth, clinical_staff, clinician_admin) had expired Firebase custom claims. Claims have now been re-armed via `fix-claims.ts`. Your job is to:

1. **Test all 33 previously BLOCKED scenarios** across the 3 unblocked roles
2. **Verify BUG-54 fix** (Patient Overview → New Procedure now passes patientId to pre-fill modal)
3. **Verify BUG-55** (empty state styling — Sev 5, cosmetic)
4. **Write results** appended to the existing test results file

## STEP 0: PRE-FLIGHT + CONTEXT

Read these files (in order):
1. `HANDOFF.md` — current state
2. `docs/TEST_RESULTS_PHASE3_2026-03-24.md` — the Phase 3 results with all BLOCKED scenarios listed
3. `docs/BROWSER_AUTH_AUTOMATION.md` — login automation (CRITICAL for React controlled forms)

Then open the test spreadsheet for reference:
4. `../Zo_Workbench_Functional_Test_Scenarios_v2_4.xlsx` — master scenario matrix

**App URL:** https://cw-e7c19.web.app

## STEP 1: ROLE LOGIN VERIFICATION

Before testing scenarios, verify all 3 previously-blocked roles can log in successfully. Use the login automation from `BROWSER_AUTH_AUTOMATION.md`.

| Email | Password | Expected Role |
|-------|----------|---------------|
| noauth@zocw.com | password | clinician_noauth |
| staff@zocw.com | password | clinical_staff |
| clinadmin@zocw.com | password | clinician_admin |

For each role: log in → confirm dashboard loads → confirm correct role label/permissions in sidebar → log out. If ANY role still loops on login, STOP and document the blocker — do not proceed with that role's scenarios.

## STEP 2: BLOCKED SCENARIO TESTING

Test all 33 previously BLOCKED scenarios. These are distributed across these screens:

### SCR-01: Dashboard (3 blocked — noauth, staff, clinadmin)
- noauth: Dashboard loads, KPIs visible, "New Procedure" quick-action should be HIDDEN (BUG-17 role gate)
- staff: Dashboard loads, KPIs visible, sidebar shows Operations only (no Admin section)
- clinadmin: Dashboard loads, KPIs visible, sidebar shows Admin & Settings section

### SCR-03: Procedures (3 blocked — noauth, staff, clinadmin)
- noauth: Procedure list visible, inline edit allowed on own procedures, creation modal works
- staff: Full procedure creation access (clinical_staff is primary creator), inline edit on own
- clinadmin: Full read + update on any procedure in practice (admin-level override)

### SCR-07: Reports Hub (3 blocked — noauth, staff, clinadmin)
- noauth: Reports Hub tiles visible, filter cards functional, signed reports accessible
- staff: Reports Hub visible, read-only access to signed reports
- clinadmin: Full Reports Hub access including all filter states

### SCR-11: Summary (3 blocked — noauth, staff, clinadmin)
- Test Lewis Score panel, quality metrics, risk scoring visibility per role
- noauth should have read-only access
- clinadmin should have full access

### SCR-12: Report Editor (2 blocked — noauth, staff, clinadmin)
- noauth: Can view/draft but NOT sign reports
- staff: Read-only access to signed reports, no edit capability
- clinadmin: Full report access including sign capability

### SCR-14: Patient Demographics (4 blocked — noauth, staff, clinadmin + role gate test)
- **Critical test:** noauth should NOT see Edit button (BUG-44 role gate)
- **Critical test:** staff should NOT see Edit button (BUG-44 role gate)
- clinadmin: Should see Edit button and be able to edit demographics

### SCR-15: Medical History (2 blocked — noauth, staff)
- Test CRUD operations per role. Both should have at minimum read access.

### SCR-16: Medications (2 blocked — noauth, staff)
- Test CRUD operations per role.

### SCR-17: Allergies (2 blocked — noauth, staff)
- Test CRUD operations per role.

### SCR-18: Patient Procedures Tab (2 blocked — noauth, staff)
- Test procedure list visibility and navigation per role.

### R-09 and R-10 Regression (2 blocked — ENV)
- Re-test these two regression scenarios that were ENV-blocked.

## STEP 3: BUG-54 VERIFICATION

**BUG-54:** Patient Overview "New Procedure" button was navigating to `/procedures` list instead of opening the creation modal with the patient pre-selected.

**Fix:** Button now navigates to `/procedures?patientId={id}`, and Procedures screen reads the query param to auto-open the modal with the patient pre-selected.

Test with `clinician@zocw.com`:
1. Navigate to any patient's overview page
2. Click the "New Procedure" button/CTA at the bottom
3. **Expected:** Procedures screen opens with creation modal already showing, patient field pre-filled with the patient you were viewing
4. **Expected:** URL briefly shows `?patientId=...` then cleans up after modal opens
5. Cancel the modal, verify you're on the procedures list (not stuck)

Also test with `staff@zocw.com` (clinical_staff is the primary procedure creator).

## STEP 4: BUG-55 CHECK

**BUG-55:** Empty state styling (Sev 5 cosmetic). Check empty state messages across screens — are they styled consistently? Note any that look broken or unstyled.

## STEP 5: WRITE RESULTS

Create a new file: `docs/TEST_RESULTS_PHASE3B_FOLLOWUP_2026-03-24.md`

Structure:
1. **Session Summary** — date, roles tested, scenario count, PASS/FAIL/BLOCKED totals
2. **Role Login Results** — table showing login success/failure for each of the 3 roles
3. **Scenario Results** — table per screen with columns: Scenario Id, Role, Result, Notes
4. **BUG-54 Verification** — PASS/FAIL with details
5. **BUG-55 Assessment** — findings
6. **Cumulative Totals** — merge with Phase 3 numbers for overall project state
7. **New Bugs** — any new issues discovered

Update `HANDOFF.md` with the new cumulative totals.

Commit everything:
```bash
git add docs/TEST_RESULTS_PHASE3B_FOLLOWUP_2026-03-24.md HANDOFF.md
git commit -m "test: Phase 3B follow-up — blocked role scenarios + BUG-54 verification"
```

**Do NOT push** — Cameron will push from Mac Terminal.

---

## IMPORTANT NOTES

- **Login automation:** You MUST use the controlled-form technique from `BROWSER_AUTH_AUTOMATION.md`. Direct typing into React controlled inputs doesn't work. Use the JavaScript injection method.
- **Role switching:** Log out completely between roles. Clear IndexedDB if a role loops on login: Application tab → IndexedDB → delete all databases → retry.
- **Be thorough:** For each scenario, document what you see, not what you expect. If behavior differs from expected, mark FAIL and describe the actual behavior.
- **New bugs:** If you find new issues, assign them BUG-56+ and document severity.
