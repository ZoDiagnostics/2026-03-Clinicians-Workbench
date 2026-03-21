# ZoCW Functional Testing Session Prompt
**Purpose:** Self-contained prompt to paste into a fresh Cowork (Sonnet) session for comprehensive functional testing.
**Created:** March 20, 2026
**Use once, then archive.**

---

## PASTE EVERYTHING BELOW INTO A NEW COWORK SESSION

---

I need you to perform comprehensive functional testing of our live web app. This is execution work — click through screens, verify behavior, screenshot results, and compile a test report.

**App:** https://cw-e7c19.web.app
**Project:** Zo Clinicians Workbench (ZoCW) — capsule endoscopy clinical workflow platform

### Step 1: Read These Files (in order)

1. `zocw-firebase-repo/docs/TEST_VALIDATION.md` — the test plan with persona-based scenarios, routing tables, and checklists
2. `zocw-firebase-repo/docs/TEST_RESULTS_2026-03-20.md` — results from tonight's first test run (38/40 passed). Shows what's ALREADY TESTED and what REMAINS.
3. `zocw-firebase-repo/HANDOFF.md` — project context and mandatory session rules

### Step 2: What's Already Been Tested (DO NOT REPEAT)

An earlier session tonight tested the following with clinician_auth (clinician@zocw.com / password):
- Critical path: login → dashboard → worklist → viewer (pre-review checklist) → add finding → report (generate, edit, save) → sign & deliver (sign, deliver via email)
- Screen loads: Dashboard, Worklist, Patients, Procedures, Operations, Analytics, Activity Log, Viewer, Report, Sign & Deliver
- Status routing: capsule_return_pending → /checkin, completed → /summary, ready_for_review → /viewer
- Role access: clinician_auth blocked from /admin (Access Denied confirmed)
- Sign out: works (redirects to /login)

### Step 3: What You Need to Test

**A. Remaining Clinician Auth scenarios (TEST_VALIDATION.md Section 3A):**
- CA-06: Delete a finding (add one first, then click ✕)
- CA-16: View patient overview (Patients → click patient → overview loads)
- CA-17: Patient procedure history (patient overview → procedures tab)
- CA-19: Notifications (click bell icon → drawer opens)
- CA-20: Mark notification read
- CA-21: Reports Hub (sidebar → Reports Hub)
- CA-23: View void procedure (Procedures → click void status → routes to /summary)
- CA-24: View closed procedure (Procedures → click closed status → routes to /summary)

**B. Remaining status-based routing (TEST_VALIDATION.md Section 4):**
Test these by going to Procedures screen and clicking procedures with each status:
- capsule_received → should route to /capsule-upload/:id
- draft → should route to /report/:id
- appended_draft → should route to /report/:id
- completed_appended → should route to /summary/:id
- closed → should route to /summary/:id
- void → should route to /summary/:id

**C. Navigation contract tests (TEST_VALIDATION.md Section 5):**
- NAV-01: Click each sidebar item, verify correct screen loads + active state highlighted
- NAV-02: Admin sub-screen back buttons (need clinician_admin login for this — see below)
- NAV-05: Patient → Procedure drill-down
- NAV-06: Visit any route while logged out → should redirect to /login
- NAV-09: Direct URL navigation (type /viewer/[any-id] → screen loads or appropriate error)

**D. Clinician Admin persona (TEST_VALIDATION.md Section 3B) — requires different login:**
Login: cameron.plummer@gmail.com (use Google sign-in on the deployed app, or if you have the password)
- AD-02: Access admin panel (sidebar → Admin → should load, NOT access denied)
- AD-03: Manage Staff screen loads
- AD-04: Navigate all admin sub-screens (Staff, Practice, Clinics, Subscription, ICD Codes) — verify each loads and "Back to Admin" works
- AD-09: Activity Log loads
- AD-10: Operations dashboard loads
- AD-11: Analytics loads
- AD-12: AI QA loads

**NOTE:** For the clinician_admin login, you may need to use Google sign-in since the password isn't stored in the test plan. If you can't authenticate as clinician_admin, skip Section D and note it in the report.

### Step 4: How to Test

1. Open Chrome browser to https://cw-e7c19.web.app
2. Login with clinician@zocw.com / password
3. For each test scenario: navigate to the screen, verify the expected behavior, take a screenshot if something fails or is noteworthy
4. Record PASS/FAIL for each scenario
5. Note any bugs found

### Step 5: Compile Results

Update `zocw-firebase-repo/docs/TEST_RESULTS_2026-03-20.md` — append a new section called "## Session 2: Extended Testing" with:
- Summary table (passed/failed/skipped)
- Results for each scenario tested
- Any new bugs found
- Remaining untested scenarios (if any)

### Step 6: Update HANDOFF.md

Add a session log entry for this testing session under the March 20 section. Include:
- What was tested
- Pass rate
- Any bugs found
- What still needs testing (if anything)

### Known Issues (don't report these as new bugs)
- Gemini API returns 429 RESOURCE_EXHAUSTED — billing not linked. Copilot auto-draft won't work.
- Sign out may require two clicks (possible timing issue)
- Image pipeline frames not connected yet (FrameViewer shows "No Capsule Frames Loaded" — this is expected)

### Key Routes Reference (from routeByStatus.ts)
```
capsule_return_pending → /checkin/:id
capsule_received → /capsule-upload/:id
ready_for_review → /viewer/:id
draft → /report/:id
appended_draft → /report/:id
completed → /summary/:id
completed_appended → /summary/:id
closed → /summary/:id
void → /summary/:id
```

### Credentials
- clinician_auth: clinician@zocw.com / password
- clinician_admin: cameron.plummer@gmail.com / [Google sign-in on deployed domain]
