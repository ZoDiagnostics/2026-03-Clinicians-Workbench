# Session 8 Prompt — BUILD_09 Phase 0 + Git Recovery + Deploy + E2E Test
**Model:** Sonnet
**Location:** Office (Mac Studio, git works)

---

Read `HANDOFF.md` first.

Git is corrupted on the laptop. 13 uncommitted files synced via OneDrive. Do these steps in order:

1. **Git recovery** — Follow the recovery procedure in HANDOFF.md § "GIT / DEPLOY" section. Back up 13 files → rename repo → fresh clone → copy files back → commit → push.

2. **Phase 0 infra** — Run `bash scripts/phase0-infra-setup.sh`. Wait ~2 min for the composite index.

3. **Build + deploy** — `npm run build && cd functions && npm run build && cd .. && npx firebase-tools@latest deploy --only functions,hosting`

4. **Re-seed** — `npx tsx seed-demo.ts`

5. **Phase 5 E2E testing** — Follow `docs/BUILD_09_IMPLEMENTATION_PLAN.md` §5. Key tests:
   - Clinician opens procedure with `capsuleSerialNumber` → frames load → AI findings seeded → capsule metadata in info bar → click finding jumps to frame → findings carry to Report
   - Procedure without `capsuleSerialNumber` → "No frames" empty state (no regression)
   - If `getSignedUrl` fails → grant `roles/iam.serviceAccountTokenCreator` per script output

6. **Update HANDOFF.md** with results.
