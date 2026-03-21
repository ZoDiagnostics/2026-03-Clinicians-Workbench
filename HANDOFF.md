# ZoCW Session Handoff & Work Queue
**Purpose:** Initialization context for a new Claude Cowork session + prioritized work queue.
**Last Updated:** March 20, 2026 (session wrap-up — UX fixes, Copilot AI integration, Firebase Hosting deploy)

## MANDATORY SESSION RULES
1. **At session start:** Read this file to understand current state and work queue.
2. **At session end:** When user says "wrap up" or indicates they're done, UPDATE this file with: what was accomplished, any new queue items, and update the "Last Updated" date. Then commit and push to GitHub.
3. **After every major milestone:** Update the WORK QUEUE section to reflect completed items.
4. **Model selection guidance:** Cameron needs to conserve weekly and session limits. For each task, recommend whether **Sonnet 4.6** (faster, cheaper, good for straightforward code/edits) or **Opus 4.6** (deeper reasoning, better for architecture/debugging/complex multi-file changes) is needed. Use Sonnet for: file edits, simple bug fixes, seed data changes, git operations, documentation updates. Use Opus for: architectural decisions, complex multi-file refactors, debugging tricky issues, code reviews, new feature design.

---

## SESSION LOG

### March 20, 2026 — Office Session
- **Firebase Hosting deployed** — app live at https://cw-e7c19.web.app
- **Tech debt cleanup** — eliminated all 14 `as any` casts. Added `SimpleReportSections` type, `getReportSectionText()` helper, backward-compatible Finding fields (`confidence`, `type`, `region`, `frameNumber`, `description`)
- **LESSONS_LEARNED.md** — 7 documented lessons from the build
- **Code review & drill-down data** — fixed 6 screens (CheckIn patient name, PatientOverview procedure history, Patients registration modal, Procedures creation modal, Report editing with save, SignDeliver functional signing + delivery)
- **Enriched seed-demo.ts** — 4 varied report templates, 8 detailed finding templates, 20 audit log entries
- **All screens consistent** — Sidebar/Header on every screen, admin back buttons, no more stub screens
- **#A Viewer UX fixed** — findings panel gated behind pre-review checklist, frame controls disabled when no frames, guidance banner
- **#B SignDeliver fixed** — distinguishes "just signed" vs "previously signed", clear messaging
- **#C CopilotAutoDraft wired to Gemini API** — `src/lib/gemini.ts` created, generates clinical impressions and recommendations from findings. Accept button pushes AI text into Report fields.
- **Gemini API BLOCKER** — Free tier shows `limit: 0` for all models on `cw-e7c19` project. Needs billing account linked to enable free tier quotas. Cameron chose Option B (link billing) over Option A (use Podium key).
- **Antigravity evaluation** — reviewed ChatGPT/Gemini assessment. Decision: wait for now, Antigravity not consistently reliable yet.
- **Google sign-in works** on `cw-e7c19.web.app` (the deployed domain)

### March 19, 2026 — Morning Session
- Completed Phases 0-5 (Auth, Clinical Workflow, Viewer, Report, Admin)
- Set up GitHub repo, Firebase Studio workspace, Firebase Console project

### Afternoon Session
- Completed Phases 6-7 (Analytics/Notifications, Hardening)
- Production build passes (`npm run build`)
- Fixed enum exports (ProcedureStatus, UserRole, StudyType → SCREAMING_SNAKE_CASE enums)
- Fixed JSX namespace, tsconfig, terser issues

### Evening Session (current)
- **Code review** — Found and fixed 16 issues across 4 severity levels
- **Fixed router paths** — routeByStatus.ts now matches actual routes (was /workflow/viewer → now /viewer)
- **Added usePatients hook** — Dashboard and Worklist now show patient names instead of UUIDs
- **Fixed route params** — /checkin/:procedureId and /capsule-upload/:procedureId
- **Enhanced seed data** — Procedures now have assignedClinicianId, urgency, clinicId, etc.
- **Sidebar navigation** — Fully implemented with role-based visibility, 5 sections, active state
- **Fixed all screen layouts** — Every screen now has consistent Sidebar + Header wrapper
- **Replaced all stub screens** — Procedures, ReportsHub, Summary now have real content
- **Admin back buttons** — All 5 admin sub-screens have "Back to Admin" navigation
- **Comprehensive demo seed** — seed-demo.ts creates 10 patients, 15 procedures (all 9 statuses), reports, findings, notifications, audit log, staff, clinics, practice settings
- **Wired Operations dashboard** — Real-time stats, procedure funnel chart, status breakdown
- **Wired Analytics** — KPI cards, bar charts for study type/status/urgency/demographics
- **Wired ActivityLog** — Live Firestore listener on audit log with color-coded event badges
- **Pre-Review checklist** — 8 functional checkboxes (4 clinical + 4 config), progress bar, updates Firestore on confirm
- **FrameViewer component** — Image frame viewer with play/pause, stepping, speed control, timeline scrubber, keyboard shortcuts
- **Enhanced Viewer screen** — Patient info bar, pre-review banner, findings panel with provenance badges
- **Pipeline architecture doc** — Reviewed and placed in docs/ folder
- **Documentation audit** — All 18 active docs verified current, SETUP_CHECKLIST fixed
- **HANDOFF.md** — Created with session rules, initialization prompt, work queue
- **5pm scheduled reminder** — Automated reminder to update HANDOFF.md before ending sessions
- **Sign out button** — Added to Header for easy logout

### Late Evening Session (Cowork — image pipeline planning)
- **Read entire repo** — All source files, types, hooks, screens, docs, build packets reviewed
- **Read new Gemini pipeline specs** — Two RTF files in `image pipeline from gemini/` (identical content: PODIUM Enterprise Architecture v4.0.0)
- **Read GEMINI_INGESTION_REPORT.md** — Full context on how the repo was originally built
- **Established real-world capsule workflow:**
  1. Capsule received from patient → `capsule_return_pending` → `capsule_received`
  2. Capsule docked on reader hardware
  3. Clinician initiates upload via CapsuleUpload screen (SCR-09)
  4. Engineer uploads ~50K frames to `podium-capsule-raw-images-test` bucket
  5. Pipeline processes automatically (index + AI analysis, all parallel, completes before clinician opens Viewer)
  6. Procedure → `ready_for_review`, clinician opens Viewer with complete dataset
- **KEY INSIGHT: No real-time frame loading needed** — By the time a clinician opens the Viewer, ALL frames are indexed and ALL AI analysis is complete. Single bulk read, not a live stream.
- **Architectural decisions made (see DECISION LOG section below)**
- **Planned 4 deliverables:** types, architecture doc, BUILD_09 packet, HANDOFF update
- **Identified pipeline-side work** for separate session (rename `procedure_id` → `capsule_serial`)
- **Full doc audit** — Updated MASTER_RUNBOOK.md (status, roadmap, 7 decisions), ZOCW_REFERENCE.md (version 3.2.0, fixed 6 routes, added capsule_images collection, added getCapsuleFrames), IMPORT_MAP.md (22 hook exports, FrameViewer, capsule-image.ts, mockData deprecated)
- **Fixed `CECUCM` typo** → `CECUM` in `enums.ts` and `capsule-image.ts` (pre-existing bug, 3 references)
- **Router imports investigated then reverted** — `router.tsx` imports Manage screens from `screens/admin/`. Initially appeared empty due to OneDrive on-demand sync not having files on device. After forcing retain-on-device, the `admin/` files appeared (203, 107, 135, 31, 27 lines — real implementations). Root-level `screens/Manage*.tsx` are 44-line stubs from the original scaffold. Router imports from `admin/` are CORRECT. Root-level stubs are still candidates for deletion (Priority 3).
- **Archived `Firebase_Studio_Build_Inputs/`** → moved to `Archive/Firebase_Studio_Build_Inputs/`. Folder was superseded by repo.
- **Archived old pipeline doc** — `docs/Firebase_Image_Pipeline_Architecture.docx` → `Archive/`

⚠️ **OneDrive on-demand sync warning for next session:** This session initially saw `src/screens/admin/` as empty because OneDrive hadn't downloaded those files to the local device. After Cameron forced retain-on-device, the 5 admin Manage files appeared. The router imports from `screens/admin/` are CORRECT — do NOT change them. The root-level `screens/Manage*.tsx` (44 lines each) are dead stubs. **Next session should verify OneDrive has fully synced before making any file-existence assumptions.** Run `ls -la src/screens/admin/` to confirm 5 files are present before touching anything related to admin screens or router imports.

---

## ARCHITECTURAL DECISIONS — IMAGE PIPELINE (March 19, 2026)

These decisions were made during the late evening planning session and are **binding** for all subsequent sessions.

### Decision 1: Folder Naming Convention = Capsule Serial Number
The folder name in `podium-capsule-raw-images-test` bucket IS the capsule serial number (e.g., `SN-48291-A/`). This is the linkage key between the physical capsule and the ZoCW patient record. The capsule serial number is scanned at check-in (stored as `procedure.capsuleSerialNumber`) and used as the folder name at upload time.

### Decision 2: Data Access via Proxy Cloud Function (not second Firebase app)
The `capsule_images` Firestore collection lives in the **pipeline project** (`podium-capsule-ingest`), NOT in `cw-e7c19`. The ZoCW React app accesses it via a callable Cloud Function `getCapsuleFrames({ capsuleSerial })` deployed in `cw-e7c19` that reads from the pipeline Firestore server-side. No second Firebase app initialization in the frontend.

### Decision 3: `procedure_id` Field Rename to `capsule_serial`
The `log-capsule-image` Cloud Function currently stores the folder name as `procedure_id`. This should be renamed to `capsule_serial` for clarity since it actually contains the capsule serial number, NOT a ZoCW procedure ID. **This requires redeploying `log-capsule-image` in the pipeline project.**

### Decision 4: Static Data at Viewer Load Time
The Viewer does a single bulk fetch of all frames + AI analysis when it mounts. No `onSnapshot` real-time listeners for `capsule_images`. The data is fully processed before the clinician ever opens the Viewer.

### Decision 5: CEST Enums as String Literals
The CEST anatomical locations (14 values) and finding classifications (31 values) from the AI pipeline are stored as string literals, not TypeScript enums, because they come from AI output and may expand. The existing `AnatomicalRegion` enum stays for clinician-facing UI; CEST strings are for AI output display. A mapping function bridges the two.

---

## INITIALIZATION PROMPT (paste into new Cowork session)

> I'm continuing work on ZoCW (Zo Clinicians Workbench) — a clinical workflow app built in React + TypeScript + Vite + Firebase.
>
> **Repo:** https://github.com/ZoDiagnostics/2026-03-Clinicians-Workbench
> **Firebase Studio Workspace:** 2026-03-CW (at idx.google.com)
> **Firebase Project ID:** cw-e7c19
> **GitHub Account:** ZoDiagnostics
>
> Please pull the repo to get up to speed, then read these files in order:
> 1. `MASTER_RUNBOOK.md` — current project status and decision log
> 2. `NAMING_CONTRACT.md` — canonical hook/provider names (never rename these)
> 3. `HANDOFF.md` — work queue and session context
>
> **Build status:** All 7 phases complete. Production build passes (`npm run build`). App runs in Firebase Studio with demo data seeded. Documentation audit: all 18 active docs current.
>
> **Development workflow:** You write code directly in the local repo. I push from Mac Terminal, pull in Firebase Studio to test. Do NOT use Firebase Studio Gemini AI for code changes — only use it for terminal commands and previewing.
>
> **Key rules:**
> - Never rename useAuth, useStore, or StoreProvider
> - All enums use SCREAMING_SNAKE_CASE members
> - All screens must have Sidebar + Header layout wrapper
> - Never propose empty file updates
> - Patient names must display via usePatients hook (not raw UUIDs)
> - **Capsule serial number** is the linkage key between the physical capsule, the image pipeline, and the patient record. `procedure.capsuleSerialNumber` (ZoCW) = folder name in Storage bucket = `capsule_serial` field in `capsule_images` collection (pipeline Firestore).
> - **Image pipeline data is in a separate GCP project** (`podium-capsule-ingest`). Access via proxy Cloud Function, NOT a second Firebase app in the frontend. See ARCHITECTURAL DECISIONS section.
> - **IMPORTANT: When I say "wrap up", update HANDOFF.md with what we accomplished, update the work queue, and push to GitHub before ending.**

---

## WORK QUEUE (prioritized)

### Priority 1: Ready Now

#### 1A: Image Pipeline — ZoCW Frontend (BUILD_09)
- [x] **Architecture decisions documented** — ✅ Done Mar 19. See ARCHITECTURAL DECISIONS section above.
- [x] **Create `src/types/capsule-image.ts`** — ✅ Done Mar 19. `CapsuleImageDocument`, `AIAnalysisResult` interfaces, CEST string literal types (14 anatomical, 31 findings), `CEST_TO_ANATOMICAL_REGION` mapping, `cestToAnatomicalRegion()` helper. Exported from `src/types/index.ts`. Data model version bumped to 3.2.0.
- [x] **Create `docs/IMAGE_PIPELINE_INTEGRATION.md`** — ✅ Done Mar 19. Full architecture doc: two-project model, data linkage via capsule serial, proxy Cloud Function pattern, CORS config, security/IAM requirements, comparison table vs. original Gemini spec. Supersedes old `.docx`.
- [x] **Create `docs/build-packets/BUILD_09_Image_Pipeline_Integration.md`** — ✅ Done Mar 19. 5-step build: getCapsuleFrames callable, useCapsuleFrames hook, wire Viewer to real frames + AI findings, wire CapsuleUpload to confirmation flow. Includes prerequisites, acceptance criteria, testing checklist.
- [ ] **Implement `getCapsuleFrames` callable** — Cloud Function in `cw-e7c19` that reads from pipeline project Firestore. Input: `{ capsuleSerial }`. Output: full frame list + AI analysis. Server-side cross-project auth via service account.
- [ ] **Implement `useCapsuleFrames` hook** — Calls `getCapsuleFrames` on mount, caches result. Used by Viewer screen.
- [ ] **Wire Viewer.tsx to real frames** — Replace `const frames: string[] = []` with data from `useCapsuleFrames`. Show AI analysis results in findings panel with provenance badge `AI_DETECTED`.
- [ ] **Wire CapsuleUpload.tsx to real upload** — Replace simulated upload with actual upload to `podium-capsule-raw-images-test` bucket using capsule serial number as folder name.

#### ⚠️ IMMEDIATE NEXT STEP: Enable Gemini API billing
- [ ] **Link billing account to cw-e7c19** — Go to https://console.cloud.google.com/billing?project=cw-e7c19 → Link a billing account. The free tier won't charge you but needs an active billing account to enable quotas. After linking, wait 2-3 minutes, then test Copilot Auto-Draft in the app at https://cw-e7c19.web.app (navigate to a Report screen → click "Generate Clinical Impression").
- [ ] **Set budget alert** — After linking billing, go to Billing → Budgets & Alerts → Create Budget → $10/month on cw-e7c19.

#### ⚠️ PRE-REQUISITE: Push latest changes to GitHub
- [ ] **Git push pending** — All changes from the Mar 20 office session (UX fixes, Copilot, tech debt, lessons learned) need to be pushed. Run from Mac Terminal:
  ```
  cd /Users/cameronplummer/Library/CloudStorage/OneDrive-SharedLibraries-ZoDiagnostics/SW\ -\ Software\ Dev\ and\ AI-ML\ -\ General/40-Clinician-Workbench/10-Human-Read-Review/90-Demos-Pitches/Claude\ Demo/zocw-firebase-repo
  git add -A && git commit -m "Phase 9 planning: image pipeline integration architecture, types, BUILD_09, doc audit, cleanup" && git push origin main
  ```

#### 1B: Image Pipeline — Backend (separate Cowork session / pipeline project)
⚠️ **This work is in the pipeline GCP project (`podium-capsule-ingest`), NOT in the ZoCW repo.**
- [ ] **Rename `procedure_id` → `capsule_serial`** in `log-capsule-image` Cloud Function. Update the field name in the Firestore doc it creates. Redeploy function.
- [ ] **Rename `procedure_id` → `capsule_serial`** in `analyze-capsule-image` Cloud Function if it reads that field. Redeploy.
- [ ] **Reprocess existing test data** if any — existing `capsule_images` docs have `procedure_id` field, need migration to `capsule_serial`.
- [ ] **CORS configuration** — Apply `cors.json` to `podium-capsule-raw-images-test` bucket. Origins: `http://localhost:3000`, `https://cw-e7c19.web.app`, Firebase Studio preview domain.
- [ ] **Cross-project service account** — Grant the `cw-e7c19` Cloud Functions service account `roles/datastore.user` on `podium-capsule-ingest` project so `getCapsuleFrames` can read from pipeline Firestore.
- [ ] **Composite index** — Ensure Firestore index on `capsule_images` collection: `capsule_serial` (asc) + `filename` (asc).

#### 1C: Other Priority 1
- [ ] **Deploy to Firebase Hosting** — Gives real URL (cw-e7c19.web.app), fixes Google sign-in. Requires Firebase CLI setup in Firebase Studio.
- [ ] **Build richer drill-down demo data** — Procedures need findings with more detail for Viewer drill-down. Reports need full section content for Report screen. Viewer checklist/video player need procedure-specific test data.

### Priority 2: Feature Refinement
- [x] **Wire Operations dashboard to real data** — ✅ Done Mar 19.
- [x] **Wire Analytics screen to real data** — ✅ Done Mar 19.
- [x] **Wire ActivityLog to Firestore audit log** — ✅ Done Mar 19.
- [x] **Fix Viewer screen** — ✅ Done Mar 19. Pre-Review checklist functional, FrameViewer built.
- [x] **Sidebar navigation** — ✅ Done Mar 19. Role-based, 5 sections, active state.
- [x] **Replace all stub screens** — ✅ Done Mar 19. Procedures, ReportsHub, Summary.
- [x] **Admin back buttons** — ✅ Done Mar 19. All 5 admin sub-screens.
- [x] **Add Sidebar/Header to all screens** — ✅ Done Mar 19. 28 screens consistent.
- [ ] **Implement Sidebar collapse toggle** — Allow users to collapse sidebar for more screen space.
- [ ] **Google sign-in** — Works after Firebase Hosting deploy. Currently blocked by unauthorized-domain in dev environment.

### Priority 3: Infrastructure
- [ ] **Deploy Cloud Functions** — Requires Blaze (pay-as-you-go) plan. Functions: onProcedureWrite, validateCapsule, createUser, updateUser, generateAutoDraft, suggestCodes, generateReportPdf, signReport.
- [ ] **Firebase Studio sunset migration** — Plan migration to Google AI Studio or Antigravity before March 2027.
- [x] **Move Firebase_Studio_Build_Inputs/ to Archive/** — ✅ Done Mar 19. Moved to Archive/Firebase_Studio_Build_Inputs/.
- [ ] **Clean up root-level Manage*.tsx stubs** — 5 files (44 lines each) in `src/screens/` are original stubs. The real implementations are in `src/screens/admin/` (imported by router). Root stubs can be deleted. Was misdiagnosed as empty admin/ dir due to OneDrive on-demand sync.

### Priority 4: Polish
- [ ] **Error handling** — Add user-facing error states to screens when Firestore queries fail.
- [ ] **Loading states** — Add skeleton loaders to Dashboard, Worklist, Patients screens.
- [ ] **Mobile responsiveness** — Test and fix layout on smaller screens.
- [ ] **Delete old seed data** — Remove duplicate patients/procedures from early seed runs.

---

## ENVIRONMENT DETAILS

### Projects & Credentials

**ZoCW App (cw-e7c19):**
- **Email/password:** clinician@zocw.com / password (role: clinician_auth)
- **Email/password:** cameron.plummer@gmail.com / [your password] (role: clinician_admin)
- **Google sign-in:** Blocked in Firebase Studio dev environment. Works after Firebase Hosting deploy.

**Image Pipeline (podium-capsule-ingest):**
- **GCP Project:** `podium-capsule-ingest` (us-west2)
- **Storage bucket:** `podium-capsule-raw-images-test`
- **Firestore collection:** `capsule_images` (frame metadata + AI analysis results)
- **Cloud Functions:** `log-capsule-image` (Storage trigger), `analyze-capsule-image` (Firestore trigger)
- **AI Model:** Gemini 2.5 Flash (us-central1, temperature 0.0)
- **Status:** ✅ Deployed and tested successfully with ~50K frames
- **Folder convention:** Capsule serial number (e.g., `SN-48291-A/`) — see ARCHITECTURAL DECISIONS above

### Key File Locations
- **Local repo (Mac):** /Users/cameronplummer/Library/CloudStorage/OneDrive-SharedLibraries-ZoDiagnostics/SW - Software Dev and AI-ML - General/40-Clinician-Workbench/10-Human-Read-Review/90-Demos-Pitches/Claude Demo/zocw-firebase-repo
- **Firebase Studio workspace:** 2026-03-CW at idx.google.com
- **Project docs:** /Claude Demo/ (root level — BRD, RTM, Screen Registry, etc.)
- **Archived docs:** /Claude Demo/Archive/
- **Image pipeline architecture (NEW):** /Claude Demo/zocw-firebase-repo/docs/IMAGE_PIPELINE_INTEGRATION.md
- **Image pipeline architecture (OLD, archived):** /Claude Demo/Archive/Firebase_Image_Pipeline_Architecture.docx
- **Gemini pipeline specs (source material):** /Claude Demo/image pipeline from gemini/ (two RTF files, identical content — PODIUM spec v4.0.0)

### Git Workflow
1. Claude edits files in local repo
2. Cameron pushes from Mac Terminal: `git add -A && git commit -m "message" && git push origin main`
3. Cameron pulls in Firebase Studio: `git pull origin main`
4. Test in Firebase Studio preview

### Seed Scripts
- `seed.ts` — Basic seed (3 patients, 5 procedures with full fields)
- `seed-demo.ts` — Comprehensive demo seed (10 patients, 15 procedures, reports, findings, notifications, audit log, staff, clinics, practice settings)
- Run with: `npx tsx seed-demo.ts` in Firebase Studio terminal

---

*This file is committed to the repo and stays in sync via git.*
