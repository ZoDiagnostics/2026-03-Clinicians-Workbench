# Opus Continuation Prompt — ZoCW Session Handoff

**Context:** This prompt catches up a new Opus Cowork session to take over from the previous one that hit context limits. Use this if you're starting a fresh Opus session and need full project awareness.

---

## Initialization Instructions

You are the **Opus orchestration session** for ZoCW (Zo Clinicians Workbench) — a React + TypeScript + Vite + Firebase clinical workflow app for capsule endoscopy. Your job is judgment, architecture, cross-artifact auditing, and orchestrating Sonnet sessions for bounded execution.

### Step 1: Read These Files (in order)

1. `HANDOFF.md` (repo root) — full project state, session log, work queue
2. `docs/ZoCW_Model_Selection_Guide.md` — mandatory model routing rules
3. `docs/BROWSER_AUTH_AUTOMATION.md` — how to automate login for all 4 test roles
4. `docs/TEST_RESULTS_2026-03-23.md` — latest test results including Phase 1 regression (22 PASS) and Phase 2 status

### Step 2: Understand Current State

**What's done:**
- 27 of 52 bugs fixed and verified via regression testing (Session 6)
- 6 UX fixes implemented, 4 verified live (UX-03, UX-06, UX-07 confirmed; UX-04 bundle-verified)
- BUG-51 fixed (notification click navigation — seed data fix in `seed-demo.ts`)
- UX-04 test data added (0-findings `ready_for_review` procedure at index 16)
- **Firebase Auth custom claims fixed** — all 4 test users now have `{ role, practiceId }` claims. Root cause was missing claims, NOT network blocking.
- Browser automation login works for all roles: admin@zocw.com, staff@zocw.com, noauth@zocw.com, clinician@zocw.com (all use password `password`)
- Heuristic re-scores: Flow 2 → 39.5 PASS, Flow 3 → 40.5 PASS, Flow 6 → 34.5 FAIL (pending UX-09/10 verification)

**What's in progress / next:**
- **Phase 2 role testing** — ~375+ scenarios across Administrator (166), Clinician Not Auth to Sign (135), Clinician Administrator (74, BLOCKED — no test user with `clinician_admin` role), and User (56). A Sonnet prompt (`SONNET_PHASE2_TEST_PROMPT.md`) was prepared for this.
- **UX-09/UX-10 live verification** — Activity Log user and date filters, admin-gated. Now testable with admin@ login working.
- **Flow 6 heuristic re-scoring** — depends on UX-09/10 verification results
- **UX-04 live trigger** — 0-findings procedure seeded; needs deploy + live verification
- **Remaining work queue** — see HANDOFF.md WORK QUEUE section for BUILD_09 (Image Pipeline), Cloud Functions deploy, Google sign-in

**Key architectural decisions:**
- Two GCP projects: `cw-e7c19` (app) and `podium-capsule-ingest` (image pipeline)
- Git workflow: Claude edits locally → Cameron pushes from Mac Terminal → pulls in Firebase Studio → builds → deploys
- Firebase Auth custom claims are the single source of truth for RBAC (not Firestore docs)
- `useAuth()` hook in `src/lib/hooks.tsx` requires `claims.role` AND `claims.practiceId` in the ID token

**Known gaps:**
- No `clinician_admin` test user exists in Firebase Auth (needed for 74 scenarios)
- `cameron.plummer@gmail.com` only works with Google sign-in on deployed domain
- Seed data shows 0 counts for non-clinician roles on dashboard (Firestore queries scoped to practiceId)

### Step 3: Resume Work

Check with Cameron what he wants to focus on. Typical priorities:
1. Review Sonnet Phase 2 test results (if session has been run)
2. Fix any failures found in Phase 2
3. Continue BUILD_09 (Image Pipeline) implementation
4. Deploy and verify UX-04 live trigger

### Environment Notes

- **App URL:** https://cw-e7c19.web.app
- **Firebase Console:** https://console.firebase.google.com/project/cw-e7c19
- **Test spreadsheet:** `Zo_Workbench_Functional_Test_Scenarios_v2_4.xlsx` in Claude Demo root (825 scenarios, 5 roles)
- **Deployed version:** v3.1.0
- **Cameron's git push workflow:** Run commands in Mac Terminal (VM has no GitHub credentials)
- **Firebase Studio deploy:** `git pull origin main && npm run build && firebase deploy --only hosting`
