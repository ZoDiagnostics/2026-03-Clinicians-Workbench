# Sonnet Verification & Regression Prompt — Post-BUG-52/53 Fixes
**Session type:** TEST-ONLY (no code changes)
**Model:** Sonnet 4.6 (Cowork browser automation)
**App URL:** https://cw-e7c19.web.app
**Estimated time:** 15–20 minutes

---

## YOUR MISSION

You are executing a **targeted verification session** for ZoCW after two bug fixes (BUG-52, BUG-53) and a re-seed. This is NOT a full test pass — it's focused on verifying the fixes and checking that nothing regressed.

---

## STEP 0A: PRE-FLIGHT CHECK (MANDATORY)

The repo lives in a OneDrive-synced folder. Before ANY git operations, run:

```bash
bash preflight.sh
```

This checks for stale git lock files, sets `core.fileMode false` (prevents OneDrive permission-flip noise), verifies GitHub CLI auth, and checks file accessibility. If it reports `✅ READY`, proceed. If issues remain, follow the on-screen instructions.

**If `preflight.sh` doesn't exist** (older checkout), run manually:
```bash
git config core.fileMode false
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/main.lock
```

## STEP 0B: READ REQUIRED DOCS

Before doing ANYTHING else, read these files:

1. `docs/BROWSER_AUTH_AUTOMATION.md` — Login automation snippets (CRITICAL for React forms)
2. `docs/TEST_RESULTS_PHASE2_2026-03-23.md` — Phase 2 results showing the bugs you're verifying

---

## STEP 1: LOGIN AUTOMATION

Use the native input setter technique from BROWSER_AUTH_AUTOMATION.md. The `form_input` tool does NOT work with this app's React forms.

### Test Credentials

| Email | Role | Password |
|-------|------|----------|
| admin@zocw.com | admin | password |
| noauth@zocw.com | clinician_noauth | password |
| clinadmin@zocw.com | clinician_admin | password |
| clinician@zocw.com | clinician_auth | password |
| staff@zocw.com | clinical_staff | password |

### Role Switch (sign out):
```javascript
(async () => {
  const dbs = await indexedDB.databases();
  for (const db of dbs) {
    if (db.name && db.name.includes('firebase')) indexedDB.deleteDatabase(db.name);
  }
  window.location.href = '/login';
})();
```

---

## STEP 2: BUG-52 VERIFICATION (admin role)

**Bug:** `/admin/practice` crashed with React Error #310 (hook called outside component)
**Fix:** Moved useState/useEffect hooks above the role gate conditional return

**Login as:** admin@zocw.com

1. Navigate to `/admin`
2. Click "Practice Settings" card (or navigate directly to `/admin/practice`)
3. **Expected:** Page loads showing "Manage Practice" with form fields (Practice Name, Default From Email, Logo URL, Allow Unscheduled Procedures checkbox, Save button)
4. **Fail condition:** Full-page React error, blank screen, or crash
5. Screenshot the result

---

## STEP 3: BUG-53 VERIFICATION (non-admin roles)

**Bug:** Activity Log link visible in sidebar for roles that don't have access
**Fix:** Added `roles: [admin, clinician_admin]` filter to Activity Log nav item

### Test 3A: clinician_auth (should NOT see Activity Log)

**Login as:** clinician@zocw.com

1. Look at sidebar → Operations section
2. **Expected:** Activity Log link is NOT visible
3. **Fail condition:** Activity Log link appears in sidebar
4. Also verify: Operations, Analytics, AI QA links ARE still visible
5. Screenshot sidebar

### Test 3B: noauth (should NOT see Activity Log)

**Login as:** noauth@zocw.com

1. Look at sidebar → Operations section
2. **Expected:** Activity Log link is NOT visible
3. Screenshot sidebar

### Test 3C: clinical_staff (should NOT see Activity Log)

**Login as:** staff@zocw.com

1. Look at sidebar → Operations section
2. **Expected:** Activity Log link is NOT visible
3. Screenshot sidebar

### Test 3D: clinician_admin (SHOULD see Activity Log)

**Login as:** clinadmin@zocw.com

1. Look at sidebar → Operations section
2. **Expected:** Activity Log link IS visible (clinician_admin has admin privileges)
3. Navigate to `/activity`
4. **Expected:** Activity Log loads (no Access Denied)
5. Screenshot sidebar + Activity Log page

---

## STEP 4: UX-09/10 FILTER BEHAVIOR (if audit log data exists)

**Login as:** admin@zocw.com

1. Navigate to `/activity`
2. Check if audit log entries are present (they should be if re-seed was run)
3. If entries exist:
   - Test UX-09: Select a specific user from the dropdown, verify table filters
   - Test UX-10: Set a date range, verify table filters to that range
   - Test "Clear Filters" button
   - Note "Showing X of Y entries" count
4. If 0 entries: Note that filter behavior cannot be verified yet

---

## STEP 5: QUICK REGRESSION CHECKS

While logged in as various roles, spot-check these (all passed in Phase 1/Phase 2):

| Check | Role | Expected |
|-------|------|----------|
| Dashboard loads | clinician_auth | Stats visible (3/2/3 or similar) |
| Worklist loads | clinician_auth | Procedures listed with status badges |
| /admin blocked for non-admin | clinician_auth | "Access Denied" shield screen |
| Sign blocked for noauth | noauth | "does not have signing authority" message |
| Admin & Settings visible | admin | ADMINISTRATION section in sidebar |
| Admin & Settings visible | clinadmin | ADMINISTRATION section in sidebar |
| Admin & Settings hidden | clinician_auth | No ADMINISTRATION section |

---

## STEP 6: RESULTS

Create `docs/VERIFICATION_RESULTS_2026-03-24.md` (adjust date as needed) with:

### Summary

| Test | Result | Notes |
|------|--------|-------|
| BUG-52: /admin/practice loads | PASS/FAIL | |
| BUG-53: Activity Log hidden for clinician_auth | PASS/FAIL | |
| BUG-53: Activity Log hidden for noauth | PASS/FAIL | |
| BUG-53: Activity Log hidden for staff | PASS/FAIL | |
| BUG-53: Activity Log visible for clinadmin | PASS/FAIL | |
| BUG-53: Activity Log visible for admin | PASS/FAIL | |
| UX-09: User filter behavior | PASS/FAIL/NO DATA | |
| UX-10: Date filter behavior | PASS/FAIL/NO DATA | |
| Regression: Dashboard | PASS/FAIL | |
| Regression: Worklist | PASS/FAIL | |
| Regression: RBAC boundaries | PASS/FAIL | |

### New Issues (if any)

| Bug ID | Severity | Description |
|--------|----------|-------------|

---

## STEP 7: WRAP-UP

1. Run `bash preflight.sh` to ensure clean git state before committing
2. Update `HANDOFF.md` with session log entry
3. Stage and commit (DO NOT PUSH):
   ```
   git add docs/VERIFICATION_RESULTS_2026-03-24.md HANDOFF.md
   git commit -m "test: BUG-52/53 verification + regression checks

   Verified ManagePractice no longer crashes (BUG-52).
   Verified Activity Log sidebar link hidden for non-admin roles (BUG-53).
   Quick regression pass on RBAC boundaries.

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
   ```
4. Tell Cameron the results and remind: `git push origin main`

---

## TESTING PRINCIPLES

- **Screenshot everything.** Each verification needs visual evidence.
- **Don't fix bugs.** Document them. This is a test-only session.
- **If the app seems broken** (blank screens, infinite loading), check top-right corner for role name. If missing, re-run login snippet.
- **This is a quick session.** Don't expand scope beyond the verification + regression checks listed above.
