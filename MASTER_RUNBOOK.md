# ZoCW Master Runbook — Step-by-Step Build Guide
**For:** Cameron (non-developer, guided by Claude)
**Last Updated:** March 16, 2026
**Rule:** Before every step, Claude re-reads this file to maintain context.

---

## WHERE WE ARE RIGHT NOW

**Current Step:** STEP 1 — Push repo to GitHub
**Status:** Not started
**Blockers:** None

---

## THE FULL ROADMAP (10 Steps)

| # | Step | Where | Time Est. | Status |
|---|------|-------|-----------|--------|
| 1 | Push repo to GitHub | Your Mac (Terminal) | 5 min | NOT STARTED |
| 2 | Import repo into Firebase Studio | firebase.studio (browser) | 3 min | NOT STARTED |
| 3 | Verify workspace boots | Firebase Studio terminal | 5 min | NOT STARTED |
| 4 | Firebase Console setup (project, auth, Firestore) | console.firebase.google.com | 15 min | NOT STARTED |
| 5 | Create .env with real credentials | Firebase Studio terminal | 5 min | NOT STARTED |
| 6 | Phase 0 — Verify app boots | Firebase Studio AI | 10 min | NOT STARTED |
| 7 | Phase 1 — Auth & Patients | Firebase Studio AI | 30-60 min | NOT STARTED |
| 8 | Phase 2 — Clinical Workflow | Firebase Studio AI | 30-60 min | NOT STARTED |
| 9 | Phase 3 — Viewer & Findings | Firebase Studio AI | 30-60 min | NOT STARTED |
| 10 | Phases 4-7 — Remaining features | Firebase Studio AI | 2-4 hrs | NOT STARTED |

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
- Firebase project `clinicians-workbench` exists
- Web app registered with real API key (starts with AIzaSy)
- Email/Password auth enabled
- Firestore database provisioned in test mode
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

### Success criteria
- Can log in with email/password
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

---

*This file is the single source of truth for where we are. Claude reads it at the start of every step.*
