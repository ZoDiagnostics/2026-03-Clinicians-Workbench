# BUILD_09 Prerequisite Audit
**Audited:** March 24, 2026
**Model:** Opus 4.6 (Cowork)
**Scope:** Step 1 of `docs/OPUS_BUILD09_PLANNING_PROMPT.md` — prerequisite status check before implementation planning.
**Sources examined:** HANDOFF.md, `docs/IMAGE_PIPELINE_INTEGRATION.md`, `docs/build-packets/BUILD_09_Image_Pipeline_Integration.md`, `src/types/capsule-image.ts`, `functions/src/` directory listing, `functions/src/index.ts`

---

## Pipeline Backend Prerequisites

| # | Prerequisite | Status | Evidence | Action Required | Owner | Blocks |
|---|---|---|---|---|---|---|
| PB-1 | `procedure_id` → `capsule_serial` field rename in `log-capsule-image` | **NOT DONE** | HANDOFF.md 1B — all 3 sub-items unchecked. `capsule-image.ts` L170 notes field "currently named `procedure_id`". | Rename field in `log-capsule-image`, redeploy. Also rename in `analyze-capsule-image` if it reads the field. Migrate existing test docs. | Cameron (pipeline project) | **Workaround exists** — BUILD_09 Step 1 includes temporary compatibility shim: query `procedure_id` instead of `capsule_serial`. Tech debt until resolved. |
| PB-2 | CORS on `podium-capsule-raw-images-test` bucket | **NOT DONE** | HANDOFF.md 1B — unchecked. IMAGE_PIPELINE §6 has exact `cors.json` and `gcloud` command ready to run. | Run `gcloud storage buckets update` per IMAGE_PIPELINE §6.2. Origins: `localhost:3000`, `localhost:5173`, `cw-e7c19.web.app`, `cw-e7c19.firebaseapp.com`. | Cameron (pipeline project) | **Blocks Phase C** (Viewer integration). Not needed for Phases A–B (Cloud Function + hook development). Browser cannot load signed image URLs without CORS. |
| PB-3 | Cross-project service account IAM grants | **NOT DONE** | HANDOFF.md 1B — unchecked. IMAGE_PIPELINE §8.3 specifies two roles: `roles/datastore.user` (read `capsule_images`) + `roles/storage.objectViewer` (generate signed URLs). | Grant both roles to `cw-e7c19` Cloud Functions service account on `podium-capsule-ingest` project. | Cameron (pipeline project) | **HARD BLOCKER for Phase A** — `getCapsuleFrames` cannot read pipeline Firestore or sign Storage URLs without these grants. Code can be *written* but not *tested*. |
| PB-4 | Composite Firestore index on `capsule_images` | **NOT DONE** | HANDOFF.md 1B — unchecked. IMAGE_PIPELINE §5.3 has exact `gcloud firestore indexes composite create` command. | Create composite index: `capsule_serial` (asc) + `filename` (asc) on `capsule_images` collection in `podium-capsule-ingest`. | Cameron (pipeline project) | **HARD BLOCKER for Phase A** — query with `where` + `orderBy` on different fields requires a composite index. Will throw a Firestore error at runtime without it. |

## ZoCW Prerequisites

| # | Prerequisite | Status | Evidence | Action Required | Owner | Blocks |
|---|---|---|---|---|---|---|
| ZP-1 | Cloud Functions deployable (Blaze plan) | **DONE** | HANDOFF.md confirms 14 functions deployed. `functions/src/callable/` contains 12 callable files. `functions/src/triggers/` contains 2 trigger files. `functions/src/index.ts` exports types. | None | — | — |
| ZP-2 | `capsule-image.ts` types exist and complete | **DONE** | File at `src/types/capsule-image.ts` — 248 lines. All required interfaces present: `CapsuleImageDocument`, `AIAnalysisResult`, `GetCapsuleFramesResponse`. CEST enums: 14 anatomical locations, 31 finding classifications. Mapping: `CEST_TO_ANATOMICAL_REGION` record + `cestToAnatomicalRegion()` helper. Imports `AnatomicalRegion` from `./enums`. | None | — | — |
| ZP-3 | Test data in pipeline Firestore | **UNKNOWN** | HANDOFF.md states pipeline is "deployed and tested with ~50K frames" but does not confirm a specific capsule serial number that matches any ZoCW procedure's `capsuleSerialNumber` field. | Cameron must verify: (a) at least one ZoCW procedure has a `capsuleSerialNumber` value, (b) a folder with that exact serial exists in `podium-capsule-raw-images-test`, (c) `capsule_images` docs exist with matching `procedure_id` (pre-rename) or `capsule_serial`. | Cameron (manual check) | **Blocks Phase E** (end-to-end testing). Does not block code implementation (Phases A–D). |

---

## Blocker Summary

### Must be resolved before code can be TESTED (Phases A–D write, Phase E test)

| Priority | Item | Phase Blocked | Workaround? |
|---|---|---|---|
| **P0** | PB-3: IAM grants | Phase A (getCapsuleFrames) testing | None — function will throw permission error |
| **P0** | PB-4: Composite index | Phase A (getCapsuleFrames) testing | None — Firestore will reject the query |
| **P1** | PB-2: CORS | Phase C (Viewer frame rendering) | Frames won't display in browser; function still returns URLs |
| **P2** | PB-1: Field rename | All phases (query correctness) | BUILD_09 compatibility shim queries `procedure_id` temporarily |
| **P2** | ZP-3: Test data linkage | Phase E (end-to-end) | Can unit-test with mock data |

### Cameron's Action Checklist (pre-implementation testing)

```bash
# 1. IAM grants (P0) — run from any gcloud-authed terminal
gcloud projects add-iam-policy-binding podium-capsule-ingest \
  --member="serviceAccount:cw-e7c19@appspot.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding podium-capsule-ingest \
  --member="serviceAccount:cw-e7c19@appspot.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

# 2. Composite index (P0) — run from any gcloud-authed terminal
gcloud firestore indexes composite create \
  --project=podium-capsule-ingest \
  --collection-group=capsule_images \
  --field-config field-path=capsule_serial,order=ascending \
  --field-config field-path=filename,order=ascending

# 3. CORS (P1) — save cors.json first, then run
gcloud storage buckets update gs://podium-capsule-raw-images-test \
  --project=podium-capsule-ingest \
  --cors-file=cors.json

# 4. Verify test data linkage (P2)
# Check: which capsule serial was used for the ~50K test frames?
# Ensure a ZoCW procedure has that value in capsuleSerialNumber field.
```

---

## Existing Assets Inventory (BUILD_09)

| Asset | Status | Location |
|---|---|---|
| Architecture decisions | Done (Mar 19) | HANDOFF.md ARCHITECTURAL DECISIONS section |
| Type definitions | Done (Mar 19) | `src/types/capsule-image.ts` |
| Integration architecture doc | Done (Mar 19) | `docs/IMAGE_PIPELINE_INTEGRATION.md` |
| Build packet | Done (Mar 19) | `docs/build-packets/BUILD_09_Image_Pipeline_Integration.md` |
| Prerequisite audit | **Done (Mar 24)** | **`docs/BUILD_09_PREREQUISITE_AUDIT.md` (this document)** |
| Implementation plan | Not started | `docs/BUILD_09_IMPLEMENTATION_PLAN.md` (Step 4 of planning prompt) |
| `getCapsuleFrames` callable | Not started | `functions/src/callable/getCapsuleFrames.ts` |
| `useCapsuleFrames` hook | Not started | `src/lib/hooks.tsx` (addition) |
| Viewer.tsx integration | Not started | `src/screens/Viewer.tsx` (modification) |
| CapsuleUpload.tsx integration | Not started | `src/screens/CapsuleUpload.tsx` (modification) |

---

## Observations for Step 2 (Gap Analysis)

These items surfaced during the audit and should be investigated in the gap analysis:

1. **`functions/src/index.ts` is a type-export barrel** — it does NOT export callable functions. The actual callable entrypoints must be exported elsewhere (likely a separate `index.ts` at `functions/src/` root or via `functions/index.ts`). Need to check how existing callables like `suggestCodes` are wired.

2. **No `getCapsuleFrames.ts` exists yet** in `functions/src/callable/` — confirmed by directory listing. 12 other callables exist and can be used as a pattern reference.

3. **`GetCapsuleFramesResponse.frames` returns `CapsuleImageDocument[]`** — each doc has a `url` field (gs:// URL). The Cloud Function must transform these to signed HTTPS URLs before returning. The response type expects `url` to already be the signed URL. This is implicit in the type but not explicitly documented.

4. **Field rename compatibility** — the composite index command in IMAGE_PIPELINE §5.3 uses `capsule_serial` as the field path, but if the rename hasn't happened, the index needs to be on `procedure_id` instead. This is a subtle gotcha.

---

*Next step: Step 2 (Gap Analysis) — review BUILD_09 implementation steps against actual source code.*
