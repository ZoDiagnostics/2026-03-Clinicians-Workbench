# Opus Continuation Prompt — ZoCW Session Handoff
**Last Updated:** March 24, 2026 (post-Cloud Functions deploy + package upgrades)

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

**What's done (as of March 24, end of Opus session 2):**
- 31 of 54 bugs resolved (29 fixed + 2 duplicates closed: BUG-01, BUG-49)
- 14 bugs reclassified as pre-pipeline feature builds (see `docs/PRE_PIPELINE_BUILD_PLAN.md`)
- 11 bugs deferred to image pipeline build
- BUG-36 reclassified from duplicate to FEATURE-BUILD (quality metric auto-calc)
- **Cloud Functions: 14 functions DEPLOYED to cw-e7c19** (Phase 1 of build plan COMPLETE)
  - TypeScript build fixed: replaced broken @types/* path alias with relative imports
  - Added backend-adapted type source files to functions/src/
  - Added 3 missing AuditAction values, replaced string literals with enum constants
  - firebase.json updated with functions deployment target
- **Package upgrades applied:**
  - firebase-functions ^4.9 → ^7.2 (Gen 1 imports moved to `firebase-functions/v1`)
  - firebase-admin ^12 → ^13.7
  - @types/node ^20 → ^22
- **OneDrive/Git handoff solution deployed** — `preflight.sh` script + HANDOFF rules
- **Sonnet Phase 3 test prompt written** — 425 scenarios across 14 screens, all 5 roles
- **Cumulative test totals:** 258 PASS / 496 FAIL / 109 BLOCKED across all sessions

**BLOCKER — Firebase deploy "extensions" error:**
The deploy succeeded ONCE (first deploy with firebase-functions ^4.9). After upgrading to firebase-functions v7, deploys fail with:
```
Error: Failed to parse build specification:
- FirebaseError Unexpected key extensions. You may need to install a newer version of the Firebase CLI.
```
This happens even after upgrading Firebase CLI to 15.11.0 in Firebase Studio. The issue is that Firebase Studio's bundled `firebase` binary overrides the global npm install. Root cause per [firebase-tools#9328](https://github.com/firebase/firebase-tools/issues/9328): CLI version incompatibility with firebase-functions v7 build metadata.

**Attempted fixes that did NOT work:**
- `npm install -g firebase-tools@latest` → installed 13.10.0 (npm registry lag)
- `npm install -g firebase-tools@15.11.0` → installed but Studio's PATH still uses bundled 13.10.0
- Downgrading to firebase-functions v6 → same error (v6 also emits `extensions` key)
- `npx firebase-tools@15.11.0 deploy --only functions` → NOT YET TRIED (last suggestion before session ended)

**What the next Opus session needs to do FIRST:**
1. **Resolve the firebase deploy extensions error.** Try in Firebase Studio:
   ```bash
   cd ~/2026-03-Clinicians-Workbench
   npx firebase-tools@latest deploy --only functions
   ```
   If that fails, the nuclear option: downgrade firebase-functions back to ^4.9.0, revert imports from `firebase-functions/v1` back to `firebase-functions`, and redeploy. The initial deploy with v4.9 worked. The upgrade can wait until Firebase Studio's CLI catches up.
2. **Re-seed Firestore** — `npx tsx seed-demo.ts` in Firebase Studio
3. **Continue Phases 2–6** of `docs/PRE_PIPELINE_BUILD_PLAN.md` (Dashboard, Patient Overview, Procedures, Summary, Report feature builds — 14 bugs)
4. **Run Phase 3 Sonnet test session** — `docs/SONNET_PHASE3_TEST_PROMPT.md` (425 scenarios)

**What's next (prioritized after deploy fix):**
1. **Re-seed Firestore** — `npx tsx seed-demo.ts` in Firebase Studio
2. **Phases 2–6 Sonnet build sessions** — 14 feature builds per `docs/PRE_PIPELINE_BUILD_PLAN.md`
3. **Phase 3 Sonnet test session** — 425-scenario verification
4. **BUILD_09 Image Pipeline** — deferred to after pre-pipeline builds
5. **clinical_staff testing** — staff@zocw.com needs separate coverage

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
- **Firebase Studio deploy (hosting):** `git pull origin main && npm run build && firebase deploy --only hosting`
- **Firebase Studio deploy (functions):** `cd functions && npm run build && firebase deploy --only functions` — BUT see BLOCKER above re: extensions error
- **Re-seed command:** `npx tsx seed-demo.ts` in Firebase Studio terminal
- **Pre-flight script:** `bash preflight.sh` — run before any git operations (handles OneDrive lock files, permission flips, sync locks)
- **OneDrive repo warning:** Repo is in OneDrive-synced folder. See Lessons 6, 8, 9 in `docs/LESSONS_LEARNED.md` for known issues and mitigations.
- **Cowork VM limitation:** Cannot delete files from mounted OneDrive folder. Workaround: overwrite with empty content, or ask Cameron to delete manually.
- **Firebase Studio limitation:** Bundled `firebase` binary overrides global npm installs. Use `npx firebase-tools@<version>` to force a specific version.
- **Git lock files:** Cowork VM leaves stale `.git/HEAD.lock` and `.git/index.lock` after commits. Cameron must run `rm -f .git/HEAD.lock .git/index.lock` before pushing.

### Lessons Learned This Session (March 24, Opus Session 2)

1. **Test the full deploy path before upgrading packages.** The firebase-functions v7 upgrade passed `tsc` locally but failed at deploy time due to CLI incompatibility. Should have tested `firebase deploy` before committing the upgrade.
2. **Firebase Studio has its own toolchain.** Global npm installs don't override Studio's bundled binaries. Always verify with `which firebase && firebase --version` or use `npx`.
3. **Node.js 22 not yet supported by Firebase Cloud Functions deploy.** Despite the deprecation warning for Node 20, setting engine to 22 causes a hard failure. Keep at 20 until Google/Firebase adds support.
4. **Cowork VM file deletion is blocked.** The sandbox prevents `rm` on mounted folder files. Plan for this — use overwrite-to-empty as workaround, or ask the user to delete.
5. **The Sonnet agent's .d.ts file strategy was wrong.** It created compiled declaration files instead of TypeScript source files for the functions/types/ directory. The fix was to use the .ts source files already in functions/src/ and change the path alias to resolve there.
6. **Always verify `npm install -g` actually updated the binary in PATH.** Check `which <tool>` and `<tool> --version` after installing.
