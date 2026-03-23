# ZoCW Master Runbook — Step-by-Step Build Guide
**For:** Cameron (non-developer, guided by Claude)
**Last Updated:** March 23, 2026
**Rule:** Before every step, Claude re-reads this file to maintain context.

---

## WHERE WE ARE RIGHT NOW

**Current Step:** Phases 1-8 COMPLETE ✅ — Phase 9 (Image Pipeline Integration) planned, implementation pending
**Status:** 5 functional testing sessions complete. 52 bugs found, 27 fixed, 6 UX refinements applied. 3 Auth users created (staff@, noauth@, admin@). Billing upgraded to Blaze plan. Gemini model updated to `gemini-2.0-flash`. Stale docs updated. Git push to GitHub pending.
**Blockers:** Pipeline field rename (`procedure_id` → `capsule_serial`) and cross-project IAM setup must complete before BUILD_09 implementation. Git push still requires `gh auth login` or PAT setup.

### March 20–22, 2026 Session Summary
- **Testing Sessions 1–5 completed:** 825 scenarios defined. 339 tested (clinician_auth), 51 PASS, 266 FAIL, 22 BLOCKED, 54 pre-blocked. 432 untested (other roles).
- **52 bugs found** (BUG-01 through BUG-52) across security, data integrity, AI errors, notifications, stepper, Worklist, Viewer, Sign/Deliver, and seed data.
- **27 bugs fixed** — committed as `6cb7f6b` (128 files, +2975/-866). Key fixes: role gates on admin screens and ActivityLog, WorkflowStepper added to 4 workflow screens (Viewer/Summary/Report/SignDeliver), Worklist rewritten as table layout with sort/filter/persistence, notification routing, two-step finding delete, copilot error handling, bowel prep quality score.
- **6 UX refinements applied** — confidence tooltip, no-anomalies copy, scroll gate on Sign, sign confirmation modal, user + date filters on ActivityLog.
- **3 Auth users created** via Firebase Console: staff@zocw.com (Sandra Martinez, clinical_staff), noauth@zocw.com (Priya Nair, clinician_noauth), admin@zocw.com (Marcus Thompson, admin). All 3 Firestore user docs created.
- **Billing upgraded to Blaze** — Cameron linked payment info. $20/month budget set on cw-e7c19.
- **Gemini model fix** — `gemini-2.0-flash-lite` deprecated by Google (404 error). Updated to `gemini-2.0-flash` in `src/lib/gemini.ts`.

### Key References
- **GitHub Repo:** https://github.com/ZoDiagnostics/2026-03-Clinicians-Workbench
- **Firebase Studio Workspace:** 2026-03-CW
- **GitHub Account:** ZoDiagnostics
- **Firebase Project ID:** cw-e7c19
- **Firebase Project Display Name:** 2026-03-CW

---

## THE FULL ROADMAP (10 Steps)

| # | Step | Where | Time Est. | Status |
|---|------|-------|-----------|--------|
| 1 | Push repo to GitHub | Your Mac (Terminal) | 5 min | ✅ DONE |
| 2 | Import repo into Firebase Studio | firebase.studio (browser) | 3 min | ✅ DONE |
| 3 | Verify workspace boots | Firebase Studio terminal | 5 min | ✅ DONE |
| 4 | Firebase Console setup (project, auth, Firestore) | console.firebase.google.com | 15 min | ✅ DONE |
| 5 | Create .env with real credentials | Firebase Studio terminal | 5 min | ✅ DONE |
| 6 | Phase 0 — Verify app boots | Firebase Studio AI | 10 min | ✅ DONE |
| 7 | Phase 1 — Auth & Patients | Firebase Studio AI | 30-60 min | ✅ DONE |
| 8 | Phase 2 — Clinical Workflow | Firebase Studio AI | 30-60 min | ✅ DONE |
| 9 | Phase 3 — Viewer & Findings | Firebase Studio AI | 30-60 min | ✅ DONE |
| 10 | Phases 4-8 — Remaining features | Firebase Studio AI | 2-4 hrs | ✅ DONE |
| 11 | Phase 9 — Image Pipeline Integration | Claude Cowork | TBD | PLANNING ✅ / IMPLEMENTATION PENDING |

---

## STEP 1: Push Repo to GitHub

### What you need
- Your Mac with Terminal (or GitHub Desktop)
- A GitHub account (you likely have one — cameron.plummer@gmail.com)

### What we're doing
Taking the `zocw-firebase-repo` folder from your Claude Demo folder and putting it on GitHub as a private repository. This gives Firebase Studio a clean URL to import from.

### Detailed instructions
(Claude will walk you through this live)

---

## STEP 2: Import Repo into Firebase Studio

### What you need
- The GitHub repo URL from Step 1
- Browser logged into your Google account

### What we're doing
Going to firebase.studio, clicking "Import a project", pasting the repo URL. Firebase Studio clones the code and sets up the workspace using our .idx/dev.nix config.

### Detailed instructions
(Claude will walk you through this live)

---

## STEP 3: Verify Workspace Boots

### What you need
- Firebase Studio workspace open from Step 2

### What we're doing
Confirming that npm install ran, the file structure is correct, and `npm run dev` shows a Vite server running. NOT expecting the app to work yet (no Firebase credentials).

### Success criteria
- Terminal shows Vite dev server URL
- File explorer shows src/, functions/, docs/ folders
- No npm install errors

---

## STEP 4: Firebase Console Setup

### What you need
- Browser tab at console.firebase.google.com
- SETUP_CHECKLIST.md open for reference

### What we're doing
Creating (or verifying) the Firebase project, registering the web app, enabling Email/Password auth, provisioning Firestore, and copying the real API credentials. This is the step that consumed 80 turns last time because it was skipped.

### Success criteria
- Firebase project `cw-e7c19` (display name: 2026-03-CW) exists
- Web app `zocw-web` registered with real API key (starts with AIzaSy)
- Email/Password and Google auth enabled
- Firestore database provisioned in test mode (us-west2)
- All 6 credential values copied and ready

---

## STEP 5: Create .env with Real Credentials

### What you need
- The 6 credential values from Step 4
- Firebase Studio terminal

### What we're doing
Creating the .env file in the workspace with the real Firebase credentials. Then restarting the dev server so Vite picks them up.

### Success criteria
- .env file exists at project root
- `cat .env | grep API_KEY` shows a real key starting with AIzaSy
- Dev server restarts without auth errors

---

## STEP 6: Phase 0 — Verify App Boots

### What you need
- Firebase Studio AI sidebar open
- PHASE_PROMPTS.md Phase 0 prompt ready to paste

### What we're doing
Pasting the Phase 0 prompt into Gemini to verify the app boots. The entry points (index.html, main.tsx) already exist — this is a verification step, not a build step.

### Success criteria
- `npm run dev` runs without errors
- Browser preview shows something (login screen or dashboard)
- No "module not found" errors in console

---

## STEP 7: Phase 1 — Auth & Patients

### What you need
- Phase 0 verified and passing
- PHASE_PROMPTS.md Phase 1 prompt ready to paste

### What we're doing
Wiring up real Firebase Auth (login/logout), protected routes, patient data from Firestore, and a seed script for test data.

### Phase 1 Sub-steps (Gemini)
| # | Sub-step | Status |
|---|----------|--------|
| 1 | Firebase Auth listener in hooks.tsx | ✅ DONE |
| 2 | Login screen (Login.tsx) | ✅ DONE |
| 3 | ProtectedRoute in router.tsx | ✅ DONE |
| 4 | Patients screen (Patients.tsx) | ✅ DONE |
| 5 | PatientOverview screen | ✅ DONE |
| 6 | Seed script (seed.ts) | NEEDS FIX — use `npx tsx` instead of `ts-node` |
| 7 | Google sign-in on Login | PENDING |

### Success criteria
- Can log in with email/password or Google
- Dashboard shows real patient data from Firestore
- `grep -r "useCurrentUser" src/` returns 0 results

---

## STEPS 8-10: Phases 2-7

Each follows the same pattern: paste prompt from PHASE_PROMPTS.md → Gemini executes → report back to Claude → verify → next phase.

---

## EMERGENCY PROCEDURES

### If Gemini renames a hook
STOP. Do not accept. Say: "The naming contract requires useAuth, not useCurrentUser. Please revert."

### If the same error appears 3 times
STOP. Come back to Claude with the exact error message. Do not let Gemini try the same fix a 4th time.

### If Gemini suggests "clear cache" or "hard refresh" for a compilation error
STOP. Ask Gemini: "What does the actual error message say? Read the error before suggesting cache fixes."

### If the workspace gets corrupted
Re-import from GitHub (Step 2). Your repo is the clean source of truth.

### If you lose your Firebase Studio session
Re-open firebase.studio. Your workspace should persist. If not, re-import from GitHub.

---

## DECISION LOG

(Claude updates this as we make decisions during the build)

| Date | Decision | Reason |
|------|----------|--------|
| Mar 16 | Use useAuth not useCurrentUser | Prevent 55-turn naming loop from prior session |
| Mar 16 | Use useStore not useAppContext | Prevent naming ambiguity with React.useContext |
| Mar 16 | Use StoreProvider not AppProvider | Match useStore naming |
| Mar 16 | Get real Firebase creds BEFORE coding | Prevent 80-turn fake credentials loop |
| Mar 16 | Use GitHub import not zip upload | Preserves file structure, provides reset point |
| Mar 16 | Source code in src/ not root | Matches tsconfig/vite/tailwind expectations |
| Mar 16 | Rename i18n.ts → i18n.tsx | Contains JSX, prevents build error |
| Mar 17 | GitHub repo: ZoDiagnostics/2026-03-Clinicians-Workbench | Organization repo, pushed 101 files |
| Mar 17 | Firebase Studio workspace: 2026-03-CW | Imported via "Import Repo" flow |
| Mar 17 | gh CLI auth via browser flow | ZoDiagnostics account, HTTPS protocol |
| Mar 17 | Firebase project ID: cw-e7c19 | Firebase added suffix to "2026-03-CW" |
| Mar 17 | Web app registered: zocw-web | Real API key obtained |
| Mar 17 | Firestore location: us-west2 | Match image pipeline location |
| Mar 17 | Use tsx instead of ts-node for seed | ts-node has ESM/CommonJS conflicts with Vite config |
| Mar 17 | User prefers Google sign-in | Add GoogleAuthProvider + signInWithPopup to Login |
| Mar 19 | Folder naming = capsule serial number | Linkage key between physical capsule, pipeline, and patient record |
| Mar 19 | Data access via proxy Cloud Function | `capsule_images` in separate project; `getCapsuleFrames` callable proxies reads |
| Mar 19 | Rename `procedure_id` → `capsule_serial` | Field in pipeline Firestore actually stores capsule serial, not ZoCW procedure ID |
| Mar 19 | Static data at Viewer load time | No real-time listeners for capsule frames; single bulk fetch on mount |
| Mar 19 | CEST enums as string literals | AI output dictionary may expand; existing AnatomicalRegion enum stays for clinician UI |
| Mar 19 | Data model version bumped to 3.2.0 | Added `capsule-image.ts` types, exported from `index.ts` |

---

*This file is the single source of truth for where we are. Claude reads it at the start of every step.*
