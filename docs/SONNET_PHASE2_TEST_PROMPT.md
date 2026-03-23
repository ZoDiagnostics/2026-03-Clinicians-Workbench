# Sonnet Phase 2 Testing Prompt — Role-Based Scenarios + UX Verification

**Session type:** TEST-ONLY (no code changes)
**Model:** Sonnet 4.6 (Cowork browser automation)
**App URL:** https://cw-e7c19.web.app
**Estimated scenarios:** ~357 testable + 74 blocked (no clinician_admin user)

---

## YOUR MISSION

You are executing **Phase 2 role-based functional testing** for ZoCW (Zo Clinicians Workbench). Phase 1 tested 393 scenarios as `clinician_auth` (Authorized Clinician). This session tests the remaining roles: **Administrator**, **Clinician Not Authorized to Sign**, and **generic User** scenarios. You will also verify two admin-gated UX fixes (UX-09, UX-10) and re-score heuristics for Flow 6.

---

## STEP 0: READ REQUIRED DOCS

Before doing ANYTHING, read these files (use the Read tool):

1. `docs/BROWSER_AUTH_AUTOMATION.md` — **CRITICAL**: Contains the exact JavaScript snippets you MUST use to log in as each role. The `form_input` tool does NOT work with this app's React forms.
2. `docs/TEST_RESULTS_2026-03-23.md` — Previous session results. Understand what's already tested.
3. `UX Test Inputs/ZOCW_UX_REMEDIATION_PLAN.md` — UX-09 and UX-10 specs for Activity Log filters.
4. `UX Test Inputs/ZOCW_HEURISTIC_SCORES_BASELINE.md` — Flow 6 baseline score (34.5 FAIL, threshold 38).

---

## STEP 1: LOGIN AUTOMATION (CRITICAL — READ CAREFULLY)

### How to log in as any role:

1. Navigate to `https://cw-e7c19.web.app/login`
2. Wait 2 seconds
3. Execute this JavaScript via `javascript_tool` (replace EMAIL with desired user):

```javascript
const EMAIL = 'admin@zocw.com';  // CHANGE THIS PER ROLE
const PASSWORD = 'password';

const nativeSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype, 'value'
).set;
const emailInput = document.querySelector('input[type="email"]');
const passwordInput = document.querySelector('input[type="password"]');

nativeSetter.call(emailInput, EMAIL);
emailInput.dispatchEvent(new Event('input', { bubbles: true }));
emailInput.dispatchEvent(new Event('change', { bubbles: true }));

nativeSetter.call(passwordInput, PASSWORD);
passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
passwordInput.dispatchEvent(new Event('change', { bubbles: true }));

setTimeout(() => {
  const btn = document.querySelector('button[type="submit"]') ||
    Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent.includes('Sign in'));
  if (btn) btn.click();
}, 200);
```

4. Wait 5 seconds
5. Screenshot to verify — top-right corner shows the role name

### How to switch roles (sign out):

```javascript
(async () => {
  const dbs = await indexedDB.databases();
  for (const db of dbs) {
    if (db.name && db.name.includes('firebase')) indexedDB.deleteDatabase(db.name);
  }
  window.location.href = '/login';
})();
```

Wait 2 seconds, then use the login snippet with the new email.

### Test Credentials

| Email | Role | Sidebar should show |
|-------|------|-------------------|
| admin@zocw.com | admin | Full sidebar + "Admin & Settings" |
| staff@zocw.com | clinical_staff | Full sidebar, NO "Admin & Settings" |
| noauth@zocw.com | clinician_noauth | Full sidebar, NO "Admin & Settings" |
| clinician@zocw.com | clinician_auth | Full sidebar, NO "Admin & Settings" |

**Password for ALL users:** `password`

---

## STEP 2: ROLE TEST EXECUTION

### Test Reference

The functional test scenarios are defined in `Zo_Workbench_Functional_Test_Scenarios_v2_4.xlsx` in the Claude Demo root folder. The **Scenario Matrix** sheet contains 825 scenarios with a `Role` column. Filter by role to get the specific scenarios for each.

### Phase 2A: Administrator (admin@zocw.com) — 166 scenarios

**Login as:** admin@zocw.com
**Role claim:** `admin`
**Persona:** Marcus Thompson — Practice Administrator

**Key areas to test:**
- Dashboard: stats, recent activity (may show 0 if no procedures assigned to admin)
- Admin & Settings: Manage Staff, Manage Practice, Manage Clinics, Manage Subscription, Manage ICD Codes
- Activity Log: FULL ACCESS (admin-only screen) — verify it loads, shows entries
- Analytics, Operations, AI QA screens — verify access
- Reports Hub — verify admin can view reports
- **Negative tests:** Admin should NOT be able to sign reports (not a clinician)
- **RBAC boundary tests:** Verify admin-only screens return "Access Denied" for non-admin roles

**Checkpoint:** After testing admin scenarios, take a summary screenshot showing the Admin & Settings page and Activity Log page.

### Phase 2B: Clinician Not Auth to Sign (noauth@zocw.com) — 135 scenarios

**Login as:** noauth@zocw.com
**Role claim:** `clinician_noauth`
**Persona:** Dr. Priya Nair — Reviews studies, cannot sign reports

**Key areas to test:**
- Dashboard, Worklist, Patients, Procedures — standard access
- Viewer — can review findings, pre-review checklist
- Summary — can view procedure summary
- Report — can view reports but CANNOT sign
- **Critical negative test:** Sign & Deliver should be blocked. The "Sign Report" button must be disabled or absent. If noauth tries to access `/sign-deliver/:id`, they should see an access-denied or redirect.
- **Admin screens:** Should get "Access Denied" if navigating to /admin, /activity, etc.

**Checkpoint:** After testing, take a screenshot showing the Sign & Deliver block and any access-denied screens.

### Phase 2C: Clinician Administrator — 74 scenarios — SKIP (BLOCKED)

**No test user exists** for the `clinician_admin` role. Log this as BLOCKED in results. Do NOT attempt to test these.

### Phase 2D: Generic "User" scenarios — 56 scenarios

These are cross-role scenarios that apply to any authenticated user. Test with whichever role you're currently logged in as. Focus on:
- Authentication flows (login, logout, session persistence)
- Navigation (sidebar links, breadcrumbs, direct URL access)
- Error states (invalid URLs, missing procedures)
- Common UI elements (header, notifications bell, user menu)

---

## STEP 3: UX-09 and UX-10 VERIFICATION (Admin-gated)

**Login as:** admin@zocw.com (these require admin role)

### UX-09: Activity Log User Filter

1. Navigate to `/activity`
2. Verify the Activity Log loads with entries
3. Look for a **user filter dropdown or input** — should allow filtering log entries by user
4. If present: select a specific user, verify the table filters correctly
5. If NOT present: mark as NOT IMPLEMENTED

### UX-10: Activity Log Date Range Filter

1. On the same `/activity` page
2. Look for **date range inputs** (start date, end date)
3. If present: set a date range, verify entries filter to that range
4. If NOT present: mark as NOT IMPLEMENTED

**Important:** These UX fixes were in the remediation plan but may or may not have been implemented. Report what you actually see.

---

## STEP 4: FLOW 6 HEURISTIC RE-SCORING

After UX-09/10 verification, re-score Flow 6 (Activity Log Audit) using this rubric:

| Heuristic | Weight | Scoring Guide |
|-----------|--------|---------------|
| Clarity | × 1.5 | 1=confusing labels, 3=clear badges, 5=self-documenting |
| Cognitive Load | × 1.5 | 1=overwhelmed, 2=50 entries no filters, 3=basic filter, 4=user+date filter, 5=saved views |
| Speed | × 1.0 | 1=slow, 2=no filtering, 3=1 filter, 4=multi-filter, 5=instant filtered results |
| Trust | × 2.0 | 1=no attribution, 3=timestamped, 5=signed audit trail |
| Error Prevention | × 2.0 | 1=destructive actions, 3=role gate, 5=read-only + role gate |
| Traceability | × 1.5 | 1=no links, 3=logged but limited, 5=full chain of custody |
| State Clarity | × 1.5 | 1=unknown state, 3=clear but no totals, 5=counts + pagination |

**Baseline scores:** Clarity 3, CogLoad 2, Speed 2, Trust 4, ErrorPrev 4, Trace 3, State 3 = **34.5 FAIL**
**Pass threshold:** 38.0

If UX-09/10 are implemented: CogLoad should move to 3-4, Speed to 3-4, pushing total toward 38+.

---

## STEP 5: RESULTS DOCUMENTATION

Create `docs/TEST_RESULTS_PHASE2_2026-03-23.md` with:

### Section 1: Summary Table

| Phase | Role | Scenarios | PASS | FAIL | BLOCKED | Notes |
|-------|------|-----------|------|------|---------|-------|

### Section 2: Role-by-Role Details

For each role tested, list:
- Screens visited and access verified
- RBAC violations found (e.g., admin-only screen accessible by non-admin)
- Negative tests (expected blocks that worked/didn't work)
- Any new bugs discovered (assign BUG-52+ IDs)

### Section 3: UX-09/UX-10 Verification

| UX ID | Status | Notes |
|-------|--------|-------|
| UX-09 | PASS / FAIL / NOT IMPLEMENTED | Details |
| UX-10 | PASS / FAIL / NOT IMPLEMENTED | Details |

### Section 4: Flow 6 Heuristic Re-Score

Updated scoring table with new totals. State whether PASS (≥38) or FAIL (<38).

### Section 5: New Bugs

| Bug ID | Severity | Role | Screen | Description |
|--------|----------|------|--------|-------------|

### Section 6: Test Debt / Blocked Items

List anything that couldn't be tested and why.

---

## STEP 6: WRAP-UP

1. Update `HANDOFF.md`:
   - Add new session log entry for this Phase 2 testing session
   - Update work queue items related to Phase 2 testing
   - Mark UX-09/10 verification status
   - Update Flow 6 heuristic score if re-scored

2. Stage and commit (DO NOT PUSH — Cameron will push from Mac Terminal):
   ```
   git add docs/TEST_RESULTS_PHASE2_2026-03-23.md HANDOFF.md
   git commit -m "test: Phase 2 role-based testing results (admin, noauth, user)

   Phase 2 of functional testing covering Administrator (166 scenarios),
   Clinician Not Auth to Sign (135), and generic User (56). Clinician
   Administrator (74) blocked — no test user. UX-09/10 Activity Log
   filters verified. Flow 6 heuristic re-scored.

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
   ```

3. Tell Cameron:
   - Summary of PASS/FAIL/BLOCKED counts
   - Any new bugs found
   - UX-09/10 status
   - Flow 6 score update
   - Remind: "Push from Mac Terminal: `git push origin main`"
   - Remind: "Deploy from Firebase Studio: `git pull origin main && npm run build && firebase deploy --only hosting`" (only if code changes were needed)

---

## TESTING PRINCIPLES

- **Be thorough but efficient.** You don't need to test all 166 admin scenarios individually if patterns emerge. Test representative scenarios from each screen/flow, then spot-check outliers.
- **Screenshot evidence.** Take screenshots at each role login, each major screen access, and any failures.
- **RBAC is the priority.** The most important thing to verify is that role boundaries are enforced — admin-only screens blocked for non-admins, sign capability blocked for noauth, etc.
- **Don't fix bugs.** Document them. This is a test-only session.
- **If the app seems broken** (blank screens, infinite loading), check if you're logged in by looking at the top-right corner for the role name. If missing, the session expired — re-run the login snippet.
