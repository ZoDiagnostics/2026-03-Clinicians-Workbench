# ZoCW Session Handoff & Work Queue
**Purpose:** Initialization context for a new Claude Cowork session + prioritized work queue.
**Last Updated:** March 19, 2026

## MANDATORY SESSION RULES
1. **At session start:** Read this file to understand current state and work queue.
2. **At session end:** When user says "wrap up" or indicates they're done, UPDATE this file with: what was accomplished, any new queue items, and update the "Last Updated" date. Then commit and push to GitHub.
3. **After every major milestone:** Update the WORK QUEUE section to reflect completed items.

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
> - **IMPORTANT: When I say "wrap up", update HANDOFF.md with what we accomplished, update the work queue, and push to GitHub before ending.**

---

## WORK QUEUE (prioritized)

### Priority 1: Ready Now
- [ ] **Deploy to Firebase Hosting** — Gives real URL (cw-e7c19.web.app), fixes Google sign-in. Requires Firebase CLI setup in Firebase Studio.
- [ ] **Build drill-down demo data** — Current seed provides list-level data. Need richer data for detail screens (findings with images, reports with full sections, audit log entries visible in ActivityLog).

### Priority 2: Feature Refinement
- [ ] **Wire Operations dashboard to real data** — Currently shows static 0s. Connect to useProcedures hook for real-time counts.
- [ ] **Wire Analytics screen to real data** — Add chart library (recharts) and display procedure/finding statistics.
- [ ] **Wire ActivityLog to Firestore audit log** — Fetch from practices/{practiceId}/auditLog collection.
- [ ] **Implement Sidebar collapse toggle** — Allow users to collapse sidebar for more screen space.
- [ ] **Google sign-in** — Works after Firebase Hosting deploy. Currently blocked by unauthorized-domain in dev environment.

### Priority 3: Infrastructure
- [ ] **Deploy Cloud Functions** — Requires Blaze (pay-as-you-go) plan. Functions: onProcedureWrite, validateCapsule, createUser, updateUser, generateAutoDraft, suggestCodes, generateReportPdf, signReport.
- [ ] **Firebase Studio sunset migration** — Plan migration to Google AI Studio or Antigravity before March 2027.
- [ ] **Move Firebase_Studio_Build_Inputs/ to Archive/** — Redundant folder superseded by repo.
- [ ] **Clean up root-level Manage*.tsx stubs** — 5 dead files in src/screens/ that duplicate admin/ versions.

### Priority 4: Polish
- [ ] **Error handling** — Add user-facing error states to screens when Firestore queries fail.
- [ ] **Loading states** — Add skeleton loaders to Dashboard, Worklist, Patients screens.
- [ ] **Mobile responsiveness** — Test and fix layout on smaller screens.
- [ ] **Delete old seed data** — Remove duplicate patients/procedures from early seed runs.

---

## ENVIRONMENT DETAILS

### Login Credentials
- **Email/password:** clinician@zocw.com / password (role: clinician_auth)
- **Email/password:** cameron.plummer@gmail.com / [your password] (role: clinician_admin)
- **Google sign-in:** Blocked in Firebase Studio dev environment. Works after Firebase Hosting deploy.

### Key File Locations
- **Local repo (Mac):** /Users/cameronplummer/Library/CloudStorage/OneDrive-SharedLibraries-ZoDiagnostics/SW - Software Dev and AI-ML - General/40-Clinician-Workbench/10-Human-Read-Review/90-Demos-Pitches/Claude Demo/zocw-firebase-repo
- **Firebase Studio workspace:** 2026-03-CW at idx.google.com
- **Project docs:** /Claude Demo/ (root level — BRD, RTM, Screen Registry, etc.)
- **Archived docs:** /Claude Demo/Archive/

### Git Workflow
1. Claude edits files in local repo
2. Cameron pushes from Mac Terminal: `git add -A && git commit -m "message" && git push origin main`
3. Cameron pulls in Firebase Studio: `git pull origin main`
4. Test in Firebase Studio preview

### Seed Scripts
- `seed.ts` — Basic seed (3 patients, 5 procedures)
- `seed-demo.ts` — Comprehensive demo seed (10 patients, 15 procedures, reports, findings, notifications, audit log)
- Run with: `npx tsx seed-demo.ts` in Firebase Studio terminal

---

*This file is committed to the repo and stays in sync via git.*
