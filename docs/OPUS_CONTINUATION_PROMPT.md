# Opus Continuation Prompt — ZoCW Session Handoff
**Last Updated:** March 23, 2026 (post-Phase 2 testing + BUG-52/53 fixes)

**Context:** This prompt catches up a new Opus Cowork session to take over from the previous one. Use this if you're starting a fresh Opus session and need full project awareness.

---

## Initialization Instructions

You are the **Opus orchestration session** for ZoCW (Zo Clinicians Workbench) — a React + TypeScript + Vite + Firebase clinical workflow app for capsule endoscopy. Your job is judgment, architecture, cross-artifact auditing, and orchestrating Sonnet sessions for bounded execution.

### Step 0: Pre-Flight Check (MANDATORY — run before ANY git operations)

The repo lives in a OneDrive-synced folder. OneDrive causes three recurring issues: stale `.git/` lock files, file permission flips (644→755), and file sync locks. A pre-flight script handles all of them.

**Run this immediately:**
```bash
bash preflight.sh
```

If the script reports `✅ READY`, proceed. If it reports manual issues:
- **GitHub CLI not authenticated:** Tell Cameron to run `gh auth login` on this machine
- **Files locked by OneDrive sync:** Wait 30 seconds and re-run the script
- **Permission-only changes persist:** Run `git checkout -- .` to reset them

### Step 1: Read These Files (in order)

1. `HANDOFF.md` (repo root) — full project state, session log, work queue
2. `docs/ZoCW_Model_Selection_Guide.md` — mandatory model routing rules
3. `docs/BROWSER_AUTH_AUTOMATION.md` — how to automate login for all 5 test roles
4. `docs/TEST_RESULTS_PHASE2_2026-03-23.md` — Phase 2 role-based test results (35 PASS, 1 FAIL, 2 new bugs)
5. `docs/TEST_RESULTS_2026-03-23.md` — Phase 1 regression results (22 PASS, 1 partial fail)
6. `docs/VERIFICATION_RESULTS_2026-03-24.md` — BUG-52/53 verification (8/8 PASS)

### Step 2: Understand Current State

**What's done (as of March 24):**
- 29 of 54 bugs fixed and verified (27 original + BUG-52 + BUG-53)
- 6 UX fixes implemented and deployed; UX-03/04/06/07 verified live; **UX-09/10 now verified** (Activity Log filters present and rendered)
- **Phase 2 role testing COMPLETE** — 35 PASS, 1 FAIL across 431 scenarios (admin 166, noauth 135, clinadmin 74, user 56)
- All 5 test users working: clinician@, admin@, staff@, noauth@, clinadmin@zocw.com (all password: `password`)
- Firebase Auth custom claims fixed for all users
- **All 4 heuristic flows now PASS** (≥38 threshold): Flow 1: 41.0, Flow 2: 39.5, Flow 3: 40.5, Flow 6: 41.0
- **BUG-52 FIXED & VERIFIED** — ManagePractice.tsx React hooks violation. Deployed and verified live (8/8 PASS).
- **BUG-53 FIXED & VERIFIED** — Activity Log sidebar link role-gated. Verified across admin, clinician_auth, clinician_admin roles.
- **Cumulative test totals:** 258 PASS / 496 FAIL / 109 BLOCKED across all sessions
- **OneDrive/Git handoff solution deployed** — `preflight.sh` script + HANDOFF mandatory rules updated

**What's next (prioritized):**
1. **Re-seed Firestore** — `npx tsx seed-demo.ts` in Firebase Studio. Needed to populate audit log entries so UX-09/10 filter *behavior* can be verified (UI controls are confirmed present but 0 entries in collection).
2. **Verify BUG-52/53 fixes live** — /admin/practice should load for admin; Activity Log link should be hidden for non-admin roles.
3. **Regression re-test Phase 2 failures** — BUG-52 was the only FAIL; re-verify after fix.
4. **BUILD_09 Image Pipeline (frontend)** — 4 implementation items:
   - Implement `getCapsuleFrames` callable Cloud Function
   - Implement `useCapsuleFrames` hook
   - Wire Viewer.tsx to real frame data + AI findings
   - Wire CapsuleUpload.tsx to real upload
5. **BUILD_09 Image Pipeline (backend)** — In pipeline project (`podium-capsule-ingest`):
   - Rename `procedure_id` → `capsule_serial` in Cloud Functions
   - CORS configuration on storage bucket
   - Cross-project service account IAM
6. **Deploy Cloud Functions** — `cw-e7c19` project (requires Blaze plan, which is now active)
7. **clinical_staff testing** — staff@zocw.com was not included in Phase 2 test plan; needs separate coverage

**Key architectural decisions (binding):**
- Two GCP projects: `cw-e7c19` (app) and `podium-capsule-ingest` (image pipeline)
- Git workflow: Claude edits locally → Cameron pushes from Mac Terminal → pulls in Firebase Studio → builds → deploys
- Firebase Auth custom claims are the single source of truth for RBAC (not Firestore docs)
- Capsule serial number is the linkage key between physical capsule, image pipeline, and patient record
- Image pipeline data accessed via proxy Cloud Function, NOT a second Firebase app in frontend
- Viewer does single bulk fetch at mount time — no real-time listeners for capsule_images

**Known gaps:**
- `cameron.plummer@gmail.com` only works with Google sign-in on deployed domain
- Seed data shows 0 counts for non-clinician roles on dashboard (Firestore queries scoped to practiceId + assigned clinician)
- Activity Log collection currently empty — needs re-seed to populate audit entries

### Step 3: Resume Work

Check with Cameron what he wants to focus on. Typical priorities:
1. Push + deploy BUG-52/53 fixes, re-seed, and verify
2. Continue BUILD_09 (Image Pipeline) implementation
3. Prepare for demo (polish, data enrichment)
4. Address remaining test debt (clinical_staff coverage, UX-09/10 filter behavior verification)

### Environment Notes

- **App URL:** https://cw-e7c19.web.app
- **Firebase Console:** https://console.firebase.google.com/project/cw-e7c19
- **Test spreadsheet:** `Zo_Workbench_Functional_Test_Scenarios_v2_4.xlsx` in Claude Demo root (825 scenarios, 5 roles)
- **Deployed version:** v3.1.0
- **Cameron's git push workflow:** Run commands in Mac Terminal (VM has no GitHub credentials)
- **Firebase Studio deploy:** `git pull origin main && npm run build && firebase deploy --only hosting`
- **Re-seed command:** `npx tsx seed-demo.ts` in Firebase Studio terminal
- **Pre-flight script:** `bash preflight.sh` — run before any git operations (handles OneDrive lock files, permission flips, sync locks)
- **OneDrive repo warning:** Repo is in OneDrive-synced folder. See Lessons 6, 8, 9 in `docs/LESSONS_LEARNED.md` for known issues and mitigations.
