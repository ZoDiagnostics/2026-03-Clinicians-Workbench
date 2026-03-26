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

## Lesson 10: Stale Compiled .js Files in src/ Shadow .ts Sources During Vite Build

**Date:** March 24, 2026
**Category:** Build Verification
**Severity:** Critical

**What happened:** After deploying Phases 2–6 feature builds, `npm run build` in Firebase Studio failed with `"UserRole" is not exported by "src/types/enums.js"`. The TypeScript source (`enums.ts`) correctly exported `UserRole`, but Rollup was picking up a stale compiled `enums.js` file sitting in the same directory instead of the `.ts` source.

**Root cause:** A previous `tsc` run in Firebase Studio (before `noEmit: true` was set in tsconfig, or from the functions build) had emitted compiled `.js`, `.d.ts`, `.js.map`, and `.d.ts.map` files alongside the `.ts` sources in `src/types/`. Rollup resolves `.js` files with higher priority than `.ts`, so it read the stale compiled output which didn't include the enum exports (esbuild strips enums during compilation).

**Files found:** `enums.js`, `enums.js.map`, `enums.d.ts`, `enums.d.ts.map` all sitting next to `enums.ts`.

**Fix applied:**
1. `rm -f src/types/enums.js src/types/enums.js.map src/types/enums.d.ts src/types/enums.d.ts.map` in Firebase Studio
2. `find src/types -name '*.js' -o -name '*.js.map' -o -name '*.d.ts' -o -name '*.d.ts.map' | xargs rm -f` to clean all stale compiled files

**Prevention for future projects:**
1. Always set `noEmit: true` in tsconfig.json for Vite projects — `tsc` should only type-check, never emit
2. Add `*.js` and `*.js.map` to `src/**/.gitignore` (or global .gitignore) to prevent accidental commits of compiled output in source directories
3. After ANY build failure, check for stale `.js` files alongside `.ts` sources: `find src -name '*.js' | head`
4. If switching between `tsc` with emit and `tsc --noEmit`, clean up leftover compiled files immediately

---

## Lesson 11: Firebase Studio Bundled CLI Overrides Global npm Installs

**Date:** March 24, 2026
**Category:** Environment/Tooling
**Severity:** High

**What happened:** After upgrading `firebase-functions` to v7, `firebase deploy --only functions` failed with "Unexpected key extensions." The fix was `npm install -g firebase-tools@15.11.0`, but deploying still used the bundled CLI (13.10.0) because Firebase Studio's PATH prioritizes its own binaries.

**Fix applied:** `npx firebase-tools@latest deploy --only functions` bypasses the bundled binary entirely and uses the latest CLI (15.11.0).

**Prevention for future projects:**
1. Always verify which binary is active: `which firebase && firebase --version`
2. Use `npx firebase-tools@latest` instead of bare `firebase` in Firebase Studio
3. Don't trust `npm install -g` in Firebase Studio — it installs but Studio's PATH wins

---

## Lesson 12: Firestore Security Rules Don't Support `let` Variable Bindings

**Date:** March 24, 2026
**Category:** Firebase/Deploy
**Severity:** Medium

**What happened:** `firestore.rules` used `let procedureData = resource.data;` and similar bindings to avoid repeating `resource.data` in rule expressions. The rules were never validated because previous deploys used `--only functions` or `--only functions,hosting`, which skip the Firestore rules compiler. When `firestore` was added to the deploy target for the first time, the compiler rejected all `let` statements: "Missing 'match' keyword before path" / "Unexpected 'let'".

**Root cause:** Firestore Security Rules (rules_version = '2') don't support `let` variable declarations. The syntax looks valid and agents may generate it, but the rules compiler rejects it. The error messages are misleading — they don't say "let is not supported," they report structural parse errors.

**Fix applied:** Replaced all `let` bindings with inline `resource.data` references. For subcollection rules that need parent document data, used `get(/databases/$(database)/documents/...)` path lookups.

**Prevention for future projects:**
1. Never use `let` in Firestore Security Rules — inline `resource.data` and `request.resource.data` directly
2. Always deploy with `firestore` included at least once early to validate rules: `--only functions,hosting,firestore`
3. Use `firebase deploy --only firestore:rules` as a standalone validation step after editing rules
4. Watch for misleading compiler errors — "Missing 'match' keyword" often means an unsupported statement type

---

## Lesson 13: Deploy Only the Targets You Need

**Date:** March 24, 2026
**Category:** Firebase/Deploy
**Severity:** Low

**What happened:** Running `firebase deploy` without `--only` tried to deploy all targets including `storage`, which failed with "Deploy target default not configured for project." The project doesn't use Firebase Storage hosting rules, but `firebase.json` includes a storage section.

**Fix applied:** Always specify explicit targets: `npx firebase-tools@latest deploy --only functions,hosting,firestore`

**Prevention for future projects:**
1. Never use bare `firebase deploy` — always specify `--only` with the targets you actually need
2. Remove unused service sections from `firebase.json` to avoid accidental deploy attempts
3. If adding a new service to the deploy target list, test it in isolation first: `--only firestore:rules`

---

## Lesson 14: OneDrive Corrupts Git Object Store — Requires Re-Clone

**Date:** March 25, 2026
**Category:** OneDrive/Git
**Severity:** Critical
**Environment:** Home laptop (CDP-MacBook-M1-Pro), OneDrive-synced repo folder

**What happened:** Attempting `git commit` from the laptop failed with cascading errors:
1. First: `error: invalid object 100644 9fa265... for 'functions/src/triggers/onProcedureWrite.ts'`
2. After fixing that blob with `git hash-object -w`: next file failed (`firebase.json`)
3. After bulk-rehashing all tracked blobs with `git ls-files | while read file; do git hash-object -w "$file"; done`: tree objects were still missing (`fatal: unable to read tree (1bddce...)`)
4. `git fetch --all` did NOT restore the missing objects

**Root cause:** OneDrive's on-demand file sync does not download `.git/objects/` pack files or loose objects unless they're explicitly accessed. When git tries to build a commit tree, it needs to read parent tree objects from the object store. These pack files were cloud-only placeholders, not real data. The corruption is at the tree/commit object level — not just blob level — so re-hashing file contents can't fix it.

**What was tried (in order):**
1. `git hash-object -w <file>` — fixed one blob, but revealed the next missing object
2. `git fetch --all` — did not restore objects (they may never have been in remote packs in the right form)
3. `git ls-files | while read file; do git hash-object -w "$file"; done` — rebuilt all blobs but tree objects still missing
4. None of these approaches can fix missing tree objects

**Fix procedure (for office session Mar 26):**

```bash
# === SAFE FIX: Re-clone alongside corrupt repo, migrate changes ===

# 1. Back up uncommitted work
cd ~/OneDrive/.../Claude\ Demo
mkdir zocw-backup-20260325
cp zocw-firebase-repo/HANDOFF.md zocw-backup-20260325/
cp zocw-firebase-repo/docs/OPUS_BUILD09_PLANNING_PROMPT.md zocw-backup-20260325/
cp zocw-firebase-repo/docs/BUILD_09_PREREQUISITE_AUDIT.md zocw-backup-20260325/
cp zocw-firebase-repo/docs/BUILD_09_GAP_ANALYSIS.md zocw-backup-20260325/

# 2. Rename the corrupt repo (don't delete yet)
mv zocw-firebase-repo zocw-firebase-repo-CORRUPT

# 3. Fresh clone into the original folder name
git clone https://github.com/ZoDiagnostics/2026-03-Clinicians-Workbench.git zocw-firebase-repo

# 4. Apply OneDrive-safe git config immediately
cd zocw-firebase-repo
git config core.fileMode false

# 5. Copy backed-up files into fresh clone
cp ../zocw-backup-20260325/HANDOFF.md .
cp ../zocw-backup-20260325/OPUS_BUILD09_PLANNING_PROMPT.md docs/
cp ../zocw-backup-20260325/BUILD_09_PREREQUISITE_AUDIT.md docs/
cp ../zocw-backup-20260325/BUILD_09_GAP_ANALYSIS.md docs/

# 6. Verify status looks right
git status
# Should show: 2 modified (HANDOFF.md, OPUS_BUILD09_PLANNING_PROMPT.md)
#              2 untracked (BUILD_09_PREREQUISITE_AUDIT.md, BUILD_09_GAP_ANALYSIS.md)

# 7. Commit and push
git add HANDOFF.md docs/OPUS_BUILD09_PLANNING_PROMPT.md docs/BUILD_09_PREREQUISITE_AUDIT.md docs/BUILD_09_GAP_ANALYSIS.md
git commit -m "docs: BUILD_09 gap analysis + prerequisite audit + work queue reorg"
git push origin main

# 8. Verify push succeeded
git log --oneline -3

# 9. Once confirmed, delete the corrupt copy
rm -rf ../zocw-firebase-repo-CORRUPT
rm -rf ../zocw-backup-20260325
```

**Prevention for future projects:**
1. **Never host a git repo inside an OneDrive-synced folder.** OneDrive's on-demand sync is fundamentally incompatible with git's object store. `.git/objects/` contains thousands of binary files that git expects to be available instantly — OneDrive may serve cloud-only stubs instead.
2. **If you must use OneDrive:** Add `.git` to OneDrive's "Always keep on this device" setting for the repo folder. On Mac: right-click the `.git` folder → "Always Keep on This Device." This forces all objects to be local.
3. **Better alternative:** Keep the git repo outside OneDrive (e.g., `~/dev/zocw-firebase-repo`) and use OneDrive only for non-git project files (specs, test docs, UX inputs). Or use GitHub as the sole sync mechanism between machines.
4. **The `preflight.sh` script** (Lesson 6) catches some OneDrive issues but cannot detect corrupted git tree objects — those only surface during `git commit`.

---

*Add new lessons as they arise. Review before starting new Firebase/React projects.*
