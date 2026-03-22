# ZoCW Firebase Studio Phase Prompts v1.0
**Purpose:** Pre-written, self-contained prompts to paste into Firebase Studio AI for each build phase.
**Last Updated:** March 16, 2026

---

## How to Use

1. Complete SETUP_CHECKLIST.md fully before using any prompt below.
2. For each phase, copy the prompt text between the `---START PROMPT---` and `---END PROMPT---` markers.
3. Paste it into Firebase Studio AI as a single message.
4. After Gemini executes, return to Claude with the results for verification before proceeding to the next phase.
5. If Gemini asks a clarifying question, answer it — but if it tries to rename any hooks or providers, STOP and refer to NAMING_CONTRACT.md.

---

## PHASE 0: Project Scaffold & Entry Point

### When to run: After completing SETUP_CHECKLIST.md Steps 1-10

---START PROMPT---

**CONTEXT:** I am building Zo Clinicians Workbench (ZoCW), a clinical workflow app. My project files are already in the workspace. I need you to wire up the entry point so the app boots correctly.

**CRITICAL NAMING RULES — READ FIRST:**
- The store provider is called `StoreProvider` (exported from `src/lib/store.tsx`) — do NOT rename it to AppProvider or anything else.
- The auth hook is called `useAuth` (exported from `src/lib/hooks.tsx`) — do NOT rename it to useCurrentUser or anything else.
- The store hook is called `useStore` (exported from `src/lib/store.tsx`) — do NOT rename it to useAppContext or anything else.
- If you need to rename ANYTHING, stop and ask me first. Do not rename silently.

**IMPORTANT: File structure**
- All source code is in `src/` (screens, components, lib, types)
- `index.html` is at project root (already created, points to `/src/main.tsx`)
- `src/main.tsx` is the React entry point (already created, imports StoreProvider + Router)
- `src/index.css` has Tailwind directives (already created)
- `postcss.config.js` is at project root (already created)
- `src/lib/firebase.ts` uses `import.meta.env.VITE_*` variables
- Do NOT move files out of `src/` to the project root

**TASK:** Verify the app boots correctly. These files already exist — you should only need to confirm they work:

1. **Verify** `index.html` (project root) has `<div id="root"></div>` and `<script type="module" src="/src/main.tsx"></script>`

2. **Verify** `src/main.tsx` imports `StoreProvider` from `./lib/store` and `Router` from `./lib/router`

3. **Verify** `src/lib/firebase.ts` uses `import.meta.env.VITE_*` variables (NOT `process.env.REACT_APP_*`)

4. **Verify** `src/lib/hooks.tsx` has `.tsx` extension (NOT `.ts`)

5. **Run** `npm install` then `npm run dev` — fix any compilation errors that appear

6. If there are TypeScript errors in the stub screens (unused variables, etc.), fix them minimally — do NOT rewrite the stubs

**ACCEPTANCE CRITERIA:**
- `npm run dev` starts without errors
- Browser shows the Login screen OR the Dashboard (depending on auth state)
- Browser console has no import errors or "module not found" errors
- The terminal shows zero TypeScript compilation errors

**AFTER COMPLETING:** Show me the terminal output from `npm run dev` and any errors you fixed.

---END PROMPT---

---

## PHASE 1: Authentication & Patient Foundation

### When to run: After Phase 0 passes acceptance criteria
### Prerequisite: Real Firebase credentials in .env (SETUP_CHECKLIST Step 5)

---START PROMPT---

**CONTEXT:** ZoCW app boots successfully. Now I need Firebase Auth integration and patient data wired to Firestore.

**CRITICAL NAMING RULES — READ FIRST:**
- The auth hook is `useAuth` in `src/lib/hooks.tsx` — do NOT rename to useCurrentUser
- The store hook is `useStore` in `src/lib/store.tsx` — do NOT rename to useAppContext
- The store provider is `StoreProvider` in `src/lib/store.tsx` — do NOT rename to AppProvider
- If you rename ANY hook, provider, or export, you must show me a grep proving the old name has zero remaining references across ALL files in src/screens/, src/components/, and src/lib/

**REFERENCE FILES TO READ:**
- `docs/build-packets/BUILD_01_Auth_and_Patients.md` — full requirements
- `src/types/user.ts` — User Firestore model
- `src/types/patient.ts` — Patient Firestore model
- `src/types/enums.ts` — Role and status enums
- `src/types/firestore-paths.ts` — Firestore collection paths (SOURCE OF TRUTH)
- `NAMING_CONTRACT.md` — canonical names for all hooks and providers

**TASK — IMPLEMENT IN THIS ORDER:**

**Step 1: Firebase Auth listener in src/lib/hooks.tsx**
- Replace the current stub `useAuth()` with a real Firebase Auth listener
- Use `onAuthStateChanged` from `firebase/auth` (import `auth` from `./firebase`)
- Return `{ user, role, practiceId, loading, error }`
- When claims are absent (new user), show loading state and retry `getIdTokenResult(true)` up to 5 times at 3-second intervals
- Export as `useAuth` (NOT useCurrentUser)

**Step 2: Login screen (src/screens/Login.tsx)**
- Replace stub with real email/password login form
- Use `signInWithEmailAndPassword` from `firebase/auth`
- On success, redirect to `/dashboard`
- Show error messages for invalid credentials
- Import `useAuth` from `../lib/hooks` and `auth` from `../lib/firebase`

**Step 3: Protected Route wrapper**
- In `src/lib/router.tsx`, add a `ProtectedRoute` component that:
  - Uses `useAuth()` to check if user is logged in
  - Redirects to `/login` if not authenticated
  - Shows loading spinner while auth state resolves
- Wrap all routes except `/login` with `<ProtectedRoute>`

**Step 4: Patient list (src/screens/Patients.tsx)**
- Replace stub with real Firestore query
- Query: `collection(db, 'practices', practiceId, 'patients')`
- Display patient list with name, MRN, DOB
- Add search by name/MRN
- Import `db` from `../lib/firebase`

**Step 5: Patient overview (src/screens/PatientOverview.tsx)**
- Replace stub with real Firestore document read
- Route: `/patient/:id`
- Display patient demographics, recent procedures

**Step 6: Seed script (seed.ts in project root)**
- Create `seed.ts` that writes test data to Firestore
- Must use the SAME project as the app (read from .env or firebase config)
- Include: 3 patients, 5 procedures, 1 practice
- Use collection paths from `types/firestore-paths.ts`
- Add verification: after writing, read back and confirm document count

**AFTER EACH STEP:** Show me the exact code you wrote. Do not say "I updated the file" without showing the code.

**ACCEPTANCE CRITERIA:**
- Login screen renders with email/password fields
- Can log in with the test user created in Firebase Console
- After login, redirected to Dashboard
- Patients screen shows seeded patient data (not mock data)
- `grep -r "useCurrentUser" src/` returns zero results
- `grep -r "useAppContext" src/` returns zero results
- Zero TypeScript compilation errors

---END PROMPT---

---

## PHASE 2: Clinical Workflow Foundation

### When to run: After Phase 1 passes acceptance criteria

---START PROMPT---

**CONTEXT:** ZoCW has working auth and patient data. Now I need the clinical workflow: procedure lifecycle, status-based routing, and Cloud Functions triggers.

**NAMING RULES:** Same as Phase 1. Do not rename useAuth, useStore, or StoreProvider.

**REFERENCE FILES TO READ:**
- `docs/build-packets/BUILD_02_Clinical_Workflow.md` — full requirements
- `src/types/procedure.ts` — Procedure Firestore model
- `src/types/firestore-paths.ts` — collection paths
- `functions/src/stateMachine.ts` — state transition rules
- `functions/src/triggers/onProcedureWrite.ts` — Firestore trigger
- `functions/src/callable/validateCapsule.ts` — capsule validation
- `src/lib/router.tsx` — current routes (add workflow routes)
- `NAMING_CONTRACT.md` — canonical names

**TASK — IMPLEMENT IN THIS ORDER:**

**Step 1: Procedure hooks in src/lib/hooks.tsx**
- Replace `useProcedures()` stub with real Firestore query scoped to practiceId
- Add `useActiveProcedure(procId)` that fetches a single procedure document
- Both must use real-time listeners (`onSnapshot`)

**Step 2: Dashboard (src/screens/Dashboard.tsx)**
- Show: procedure count by status, recent activity, quick stats
- Wire to real Firestore data via hooks

**Step 3: Worklist (src/screens/Worklist.tsx)**
- Filtered procedure list by status, assigned clinician
- Click to navigate to correct workflow screen based on procedure status

**Step 4: Status-based routing**
- Implement `src/lib/routeByStatus.ts` per the procedure lifecycle:
  - capsule_return_pending → CheckIn
  - capsule_received → CapsuleUpload (already uploaded, show status)
  - ready_for_review → Viewer
  - draft → Report
  - appended_draft → Report
  - completed → Summary (read-only)
- Wire into Worklist click handlers

**Step 5: CheckIn screen (src/screens/CheckIn.tsx)**
- Patient check-in form, consent capture
- On submit: update procedure status in Firestore

**Step 6: CapsuleUpload screen (src/screens/CapsuleUpload.tsx)**
- Image upload interface (placeholder for actual capsule images)
- On upload: update procedure status, trigger validateCapsule function

**Step 7: Deploy Cloud Functions**
- Deploy `onProcedureWrite` and `validateCapsule`
- Verify they trigger correctly on Firestore writes

**AFTER EACH STEP:** Show the exact code. Run `npm run dev` and confirm no errors.

**ACCEPTANCE CRITERIA:**
- Dashboard shows real procedure data from Firestore
- Worklist displays procedures filtered by status
- Clicking a procedure navigates to the correct workflow screen
- CheckIn updates procedure status in Firestore
- Cloud Functions fire on Firestore writes
- Zero compilation errors

---END PROMPT---

---

## PHASE 3: Viewer & Findings

### When to run: After Phase 2 passes acceptance criteria

---START PROMPT---

**CONTEXT:** ZoCW has working auth, patients, and procedure workflow. Now I need the image viewer and findings markup.

**NAMING RULES:** Same as prior phases. Do not rename useAuth, useStore, or StoreProvider.

**REFERENCE FILES TO READ:**
- `docs/build-packets/BUILD_03_Viewer_and_Findings.md` — full requirements
- `src/types/finding.ts` — Finding Firestore model
- `src/types/firestore-paths.ts` — collection paths
- `src/components/PreReviewBanner.tsx` — pre-review alert component
- `NAMING_CONTRACT.md` — canonical names

**TASK:** Implement Viewer screen with finding creation, Pre-Review banner, and Incidental Findings tray per BUILD_03 requirements. Mark all AI-assisted finding detection with `// TODO: External Infrastructure — AI model integration`. Show code for each file changed.

**ACCEPTANCE CRITERIA:**
- Viewer screen displays placeholder image area
- Can create/edit/delete findings manually
- Findings persist to Firestore under procedure subcollection
- Pre-Review banner shows when findings exist but report not started
- Zero compilation errors

---END PROMPT---

---

## PHASE 4: Report, Coding, Sign & Deliver

### When to run: After Phase 3 passes acceptance criteria

---START PROMPT---

**CONTEXT:** ZoCW has viewer and findings. Now I need report generation, code suggestions, signing, and delivery.

**NAMING RULES:** Same as prior phases.

**REFERENCE FILES TO READ:**
- `docs/build-packets/BUILD_04_Report_and_Sign.md` — full requirements
- `src/types/report.ts` — Report Firestore model
- `functions/src/callable/generateAutoDraft.ts` — AI auto-draft (placeholder)
- `functions/src/callable/suggestCodes.ts` — code suggestion (placeholder)
- `functions/src/callable/generateReportPdf.ts` — PDF generation
- `functions/src/triggers/onReportSign.ts` — post-sign trigger
- `NAMING_CONTRACT.md` — canonical names

**TASK:** Implement Report screen, CopilotAutoDraft component, CodeSuggestionSidebar, SignDeliver screen per BUILD_04 requirements. Mark AI services with `// TODO: External Infrastructure`. Show code for each file changed.

**ACCEPTANCE CRITERIA:**
- Report screen displays findings summary and editable draft sections
- Code suggestion sidebar shows placeholder recommendations
- Sign & Deliver screen allows signature and delivery method selection
- Signing updates procedure status to completed
- Zero compilation errors

---END PROMPT---

---

## PHASE 5: Admin & Settings

### When to run: After Phase 4 passes acceptance criteria

---START PROMPT---

**CONTEXT:** ZoCW clinical workflow is complete. Now I need admin screens for staff management, practice settings, and configuration.

**NAMING RULES:** Same as prior phases.

**REFERENCE FILES TO READ:**
- `docs/build-packets/BUILD_05_Admin_and_Settings.md` — full requirements
- `docs/build-packets/BUILD_08_Admin_SubScreens.md` — additional admin screens
- `src/types/user.ts`, `src/types/practice.ts` — data models
- `NAMING_CONTRACT.md` — canonical names

**TASK:** Implement all Admin sub-screens (ManageStaff, ManagePractice, ManageClinics, ManageSubscription, ManageICDCodes) per BUILD_05 and BUILD_08 requirements. Add sub-routes under `/admin/*` in src/lib/router.tsx. Enforce admin-only access. Show code for each file changed.

**ACCEPTANCE CRITERIA:**
- Admin screen shows navigation to all sub-screens
- Staff management: add/edit/remove users with role assignment
- Practice settings: edit practice name, billing, contact
- All admin screens enforce admin/clinician_admin role check
- Sub-routes registered in router.tsx
- Zero compilation errors

---END PROMPT---

---

## PHASE 6: Analytics, Notifications, Operational Polish

### When to run: After Phase 5 passes acceptance criteria

---START PROMPT---

**CONTEXT:** ZoCW has full clinical workflow and admin. Now I need analytics, notifications, and operational views.

**NAMING RULES:** Same as prior phases.

**REFERENCE FILES TO READ:**
- `docs/build-packets/BUILD_06_Analytics_Notifications_Polish.md` — full requirements
- `docs/build-packets/BUILD_07_Workflow_Completion.md` — completion paths
- `src/types/notification.ts`, `src/types/audit.ts` — data models
- `src/components/NotificationDrawer.tsx` — notification component
- `NAMING_CONTRACT.md` — canonical names

**TASK:** Implement Operations dashboard, Analytics workbench, AIQA dashboard, ActivityLog, Education library, and NotificationDrawer per BUILD_06 and BUILD_07. Wire notification hooks. Show code for each file changed.

**ACCEPTANCE CRITERIA:**
- Operations dashboard shows workflow status summaries
- Analytics displays KPI charts (placeholder data acceptable)
- Activity log shows audit entries from Firestore
- Notification drawer opens/closes, shows notifications
- Zero compilation errors

---END PROMPT---

---

## PHASE 7: Cross-Cutting Hardening

### When to run: After Phase 6 passes acceptance criteria

---START PROMPT---

**CONTEXT:** All ZoCW features are implemented. Now I need error handling, i18n, and security hardening.

**NAMING RULES:** Same as prior phases.

**REFERENCE FILES TO READ:**
- `src/components/ErrorBoundary.tsx` — error boundary component
- `src/lib/i18n.tsx` — i18n scaffold
- `firestore.rules` — security rules
- `storage.rules` — storage rules
- `docs/TEST_VALIDATION.md` — QA checklist
- `NAMING_CONTRACT.md` — canonical names

**TASK:**

1. Wrap app root in `I18nProvider` (in src/main.tsx, inside StoreProvider) — file is already `src/lib/i18n.tsx`
3. Apply `ErrorBoundary` wrapper to router or individual screens
4. Review and tighten Firestore security rules (replace test-mode `allow read, write: if true` with role-based rules from `firestore.rules`)
5. Deploy tightened security rules
6. Run through `docs/TEST_VALIDATION.md` checklist items

**ACCEPTANCE CRITERIA:**
- Error boundary catches and displays errors gracefully
- i18n provider wraps app without breaking existing functionality
- Firestore rules enforce role-based access (not open test mode)
- App builds for production: `npm run build` succeeds
- Zero compilation errors

---END PROMPT---

---

## Between-Phase Protocol

After each phase, return to Claude with:
1. **Screenshot** of the app running (or description of what you see)
2. **Terminal output** — any errors from `npm run dev`
3. **Browser console output** — any errors from DevTools
4. **Gemini's response** — what it said it did

Claude will verify and provide the next phase prompt (or corrections if needed).

---

*These prompts reference NAMING_CONTRACT.md, IMPORT_MAP.md, and SETUP_CHECKLIST.md.*
