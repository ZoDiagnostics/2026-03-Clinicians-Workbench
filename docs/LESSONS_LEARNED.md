# ZoCW Lessons Learned
**Purpose:** Capture operational lessons from the ZoCW build for future Firebase/React projects.
**Last Updated:** March 23, 2026

---

## Lesson 1: Run `npm run build` After Every Phase, Not Just `npm run dev`

**Date:** March 20, 2026
**Category:** Build Verification
**Severity:** High

**What happened:** Screens written by Gemini during Phases 1-7 used intuitive field names (`confidence`, `type`, `region`, `sections.findings`) that didn't match the strict TypeScript type definitions (`aiConfidence`, `classification`, `anatomicalRegion`, `sections: ReportSection[]`). The Vite dev server (`npm run dev`) doesn't perform full type checking — it only transpiles. The app appeared to work fine in development. When we finally ran `npm run build` (which invokes `tsc` first), 20 TypeScript errors surfaced across 4 files.

**Root cause:** Vite's dev server uses esbuild for fast transpilation, which intentionally skips type checking for speed. Full type checking only happens when `tsc` runs during the production build.

**Impact:** 20 type errors required fixing before deployment. We added 14 `as any` casts as temporary patches, creating technical debt.

**Prevention for future projects:**
1. Run `npm run build` after every phase or significant code change — not just `npm run dev`
2. Consider adding a `typecheck` script: `"typecheck": "tsc --noEmit"` and run it frequently
3. When AI writes code, verify it reads the actual type definitions before writing screens
4. Include "production build passes" as an explicit acceptance criterion for every phase

---

## Lesson 2: AI-Generated Code May Use Intuitive Names Instead of Defined Names

**Date:** March 20, 2026
**Category:** AI Code Quality
**Severity:** Medium

**What happened:** Gemini (Firebase Studio AI) wrote screens that accessed `finding.confidence` instead of `finding.aiConfidence`, `finding.type` instead of `finding.classification`, and `report.sections.findings` (object property) instead of `report.sections[0].content` (array element). The AI used "what the field should be called" rather than "what the type definition says it's called."

**Root cause:** AI models generate code based on patterns and intuition. They don't always cross-reference the exact type definitions in the project, especially when the type file wasn't included in the prompt context.

**Prevention for future projects:**
1. Include relevant type definitions in every AI prompt: "Read src/types/finding.ts before writing screen code"
2. After AI generates code, grep for field accesses and cross-reference against the type file
3. Consider keeping a FIELD_MAPPING.md that maps common intuitive names to canonical type field names
4. When types and data diverge (as they often do with Firestore), decide early: update the types to match reality, or enforce types strictly in code

---

## Lesson 3: Seed Data and Type Definitions Must Be Written Together

**Date:** March 20, 2026
**Category:** Data Model Consistency
**Severity:** Medium

**What happened:** The seed script (`seed-demo.ts`) created Firestore documents with a flat `sections: { findings, impression, recommendations }` object, but the TypeScript `Report` type defined `sections: ReportSection[]` (an array of section objects). Similarly, seed findings used `confidence` and `description` fields that don't exist on the `Finding` type.

**Root cause:** The seed script was written to produce human-readable demo data without consulting the TypeScript type definitions. The types were designed for a more structured data model than what the seed created.

**Prevention for future projects:**
1. Write seed scripts that import and use the actual TypeScript types with `satisfies` checks
2. Create seed data factories that construct type-safe objects: `const makeReport = (overrides: Partial<Report>): Report => ({...defaults, ...overrides})`
3. Run `tsc --noEmit` after writing seed scripts to catch mismatches early
4. Document the "source of truth" for data shape: is it the TypeScript types or the Firestore documents?

---

## Lesson 4: `npm run dev` vs `npm run build` Have Different Error Surfaces

**Date:** March 20, 2026
**Category:** Tooling Knowledge
**Severity:** High

**What `npm run dev` catches:**
- Syntax errors
- Missing imports (modules not found)
- Runtime errors (shows in browser console)

**What `npm run dev` does NOT catch:**
- TypeScript type mismatches
- Unused variable/parameter errors (depending on tsconfig)
- Property access errors on typed objects
- Enum value assignment mismatches

**What `npm run build` catches (in addition):**
- All TypeScript type errors via `tsc`
- Module resolution issues at build time
- Tree-shaking failures

**Rule:** Always validate with `npm run build` before considering any phase "complete."

---

## Lesson 5: Gemini in Firebase Studio Needs Guardrails for File Modifications

**Date:** March 19, 2026
**Category:** AI Tooling Safety
**Severity:** Critical

**What happened:** During Phase 7, Gemini repeatedly proposed empty file updates (blank code blocks) that would have wiped out entire files. It also attempted to rewrite the `useAuth` hook, removing the custom claims retry logic. On another occasion, it converted `ProcedureStatus` enum members from `SCREAMING_SNAKE_CASE` to `PascalCase`, which would have broken all existing code.

**Prevention for future projects:**
1. Always click "Review Changes" before accepting any Gemini update
2. Never accept an update with an empty code block
3. Establish naming conventions in a NAMING_CONTRACT.md and reference it in every prompt
4. Have a separate reviewer (Claude, human, or CI) validate changes before committing
5. Commit frequently so destructive changes can be reverted easily
6. Consider disabling Gemini for code changes entirely and only using it for terminal/preview

---

## Lesson 6: OneDrive On-Demand Sync Can Hide Git-Tracked Files

**Date:** March 19, 2026
**Category:** Environment/Tooling
**Severity:** High

**What happened:** During a home Cowork session, `src/screens/admin/` appeared empty because OneDrive hadn't downloaded those files to the local device (on-demand sync). The AI initially diagnosed this as missing files and attempted to change router imports. After Cameron forced "retain on device," the 5 admin files appeared.

**Prevention for future projects:**
1. Keep active development repos in a normal local directory, not a cloud-synced folder
2. Run `ls -la` to verify file presence before making assumptions about missing files
3. Force "always keep on this device" for the entire repo folder in OneDrive/Dropbox/iCloud
4. Use `git status` as the source of truth for file existence, not the file explorer

---

## Lesson 7: Cross-Session Handoff Requires Explicit Documentation

**Date:** March 19, 2026
**Category:** Workflow
**Severity:** Medium

**What happened:** Successfully used HANDOFF.md to transfer context between office and home Cowork sessions. The home session was able to pick up work immediately by reading HANDOFF.md, MASTER_RUNBOOK.md, and NAMING_CONTRACT.md.

**What works:**
1. Maintain a HANDOFF.md with current state, work queue, and initialization prompt
2. Always commit and push before ending a session
3. Include "wrap up" as a trigger word for updating handoff docs
4. Schedule automated reminders (5pm weekday) to update handoff before leaving

---

## Lesson 8: OneDrive Flips File Permissions — Use `git config core.fileMode false`

**Date:** March 23, 2026
**Category:** Environment/Tooling
**Severity:** Medium

**What happened:** From the home Mac, the Cowork VM mounted the OneDrive-synced repo folder. Several recently-modified files were unreadable from the VM — returning "Resource deadlock avoided" errors (OneDrive holding sync locks). Separately, on the home Mac terminal, `git status` showed **every file in the repo as modified** (~120 files). Investigation with `git diff src/main.tsx` revealed no content changes — only permission changes: `old mode 100644` → `new mode 100755`. OneDrive was flipping all files to executable during sync.

**Root cause:** OneDrive sync on macOS does not preserve Unix file permission bits. When syncing between cloud/Windows and macOS, it resets permissions, making git see every file as changed. Additionally, OneDrive holds file-level locks during sync that prevent the Cowork VM (which mounts the same folder) from reading those files.

**Additional issue:** A stale `.git/index.lock` file blocked `git commit` on the Mac. Likely left by the Cowork VM's earlier git operations or by OneDrive interfering with the `.git` directory.

**Fixes applied (home Mac terminal):**
1. `git config core.fileMode false` — tells git to ignore permission changes for this repo. After this, `git status` correctly showed only 6 real changes + 1 new file.
2. `rm -f .git/index.lock` — removes stale lock file so `git commit` works.

**Prevention for future projects:**
1. Run `git config core.fileMode false` immediately after cloning any repo into an OneDrive-synced folder — on EVERY machine (home Mac, office Mac)
2. If `git commit` fails with "index.lock exists", remove it with `rm -f .git/index.lock` (or `del .git\index.lock` on Windows)
3. If the Cowork VM can't read a file ("Resource deadlock avoided"), wait for OneDrive sync to complete or close the file in other editors
4. Consider Lesson 6 advice: keep active dev repos in a normal local directory, not a cloud-synced folder

---

## Lesson 9: GitHub CLI Setup for Push Access

**Date:** March 23, 2026
**Category:** Environment/Tooling
**Severity:** Low

**What happened:** Git push was blocked because HTTPS authentication wasn't configured on the home Mac. The repo remote was correct (`origin → https://github.com/ZoDiagnostics/2026-03-Clinicians-Workbench.git`) but no credential helper was in place.

**Fix applied (home Mac terminal):**
1. `brew install gh` — installs GitHub CLI v2.88.1
2. `gh auth login` → GitHub.com → HTTPS → Yes (authenticate Git) → Login with a web browser
3. Authenticated as `ZoDiagnostics`. Git push now works from home Mac.

**For office Mac — same setup needed if not already done:**
1. `brew install gh` (if not installed)
2. `gh auth login` — same flow
3. Also run `git config core.fileMode false` on office Mac (see Lesson 8)

---

*Add new lessons as they arise. Review before starting new Firebase/React projects.*
