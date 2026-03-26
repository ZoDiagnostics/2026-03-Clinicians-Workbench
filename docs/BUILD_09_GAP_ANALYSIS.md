# BUILD_09 Gap Analysis: Pipeline v7.0.0 vs ZoCW Integration Docs
**Date:** March 25, 2026 (updated with Cameron clarifications)
**Model:** Opus 4.6 (Cowork)
**Source Spec:** `2026-0325 Gemini Description of Image Pipeline Tech Setup.md` (PODIUM v7.0.0)
**ZoCW Docs Compared:** `IMAGE_PIPELINE_INTEGRATION.md` (v1.0.0), `capsule-image.ts`, `BUILD_09_PREREQUISITE_AUDIT.md`

---

## KEY FINDING: 3-Tier Folder Structure + Corrected Field Mapping

The original ZoCW integration docs assumed a 2-tier folder structure. The pipeline uses 3-tier.

### Upload path convention:
```
{BatchID}/{CapsuleID}/{FileName}
e.g., 20260325/SN-48291-A/frame_00001.jpg
```
- `batch_id` = YYYYMMDD date stamp for the upload session (irrelevant for ZoCW lookups)
- `capsule_id` = capsule serial number (**this is the ZoCW linkage key**)
- `filename` = sequential frame identifier (e.g., `frame_00001.jpg`)

### `log-capsule-image` 3-tier parsing with fallbacks:
- 3 parts → `batch_id = parts[0]`, `capsule_id = parts[1]`, `filename = parts[-1]`
- 2 parts → `batch_id = "MANUAL_UPLOAD"`, `capsule_id = parts[0]`, `filename = parts[-1]`
- 1 part → both set to `"UNASSIGNED"`

### Fields written to `capsule_images` docs:

| Field | Value | ZoCW relevance |
|-------|-------|----------------|
| `filename` | Frame filename (e.g., `frame_00001.jpg`) | Used for ordering |
| `batch_id` | YYYYMMDD date grouping | Not needed for lookups |
| `capsule_id` | Capsule serial number (e.g., `SN-48291-A`) | **PRIMARY LINKAGE KEY** |
| `procedure_id` | Legacy = `batch_id` | Ignore — do not query on this |
| `url` | gs:// URL to frame image | Converted to signed HTTPS URL |
| `status` | `"pending"` → `"processed"` after AI | Filter for completion |
| `created_at` | UTC timestamp | Optional metadata |

### Clarifications from Cameron (Mar 25):
- **Field rename already done in database** — the pipeline Firestore data is current
- **`batch_id` is operational only** — used when multiple capsules are uploaded in one session; ZoCW does not need to query or display it
- **`capsule_id` = capsule serial number** — confirmed as the linkage to `procedure.capsuleSerialNumber`
- **The old "rename `procedure_id` → `capsule_serial`" task (PB-1) is CANCELLED** — `capsule_id` already holds the correct data

### ZoCW integration query:
```
capsule_images WHERE capsule_id == procedure.capsuleSerialNumber ORDER BY filename ASC
```

---

## FINDING 2: Document ID Convention

### Pipeline (v7.0.0):
```python
doc_id = f"{batch_id}_{capsule_id}_{filename}".replace("/", "_")
```
Deterministic, composite document IDs. Example: `BATCH_2026_03_25_SN-48291-A_frame_00001.jpg`

### ZoCW assumption:
`CapsuleImageDocument.id` is marked as `id?: string` (auto-generated). No awareness of the composite convention.

### Impact:
Low — the `getCapsuleFrames` callable queries by field values, not document IDs. But knowing the ID format is useful for debugging and direct lookups.

---

## FINDING 3: `procedure_id` Field — Legacy, Do Not Use

**RESOLVED (Mar 25).** The naming confusion that propagated through ZoCW docs since March 19 is now cleared up:

```
procedure_id = batch_id     ← YYYYMMDD date grouping (legacy v4.0 mapping, ignore)
capsule_id   = capsule serial  ← what ZoCW queries on (e.g., "SN-48291-A")
```

Cameron confirmed the database fields are already renamed/correct. The old HANDOFF.md task "rename `procedure_id` → `capsule_serial`" (PB-1) is **CANCELLED**.

### Actions taken:
- Query on `capsule_id` directly — it holds the capsule serial number
- Composite index targets `capsule_id` + `filename`
- `CapsuleImageDocument` type updated to reflect actual schema

---

## FINDING 4: Frontend Example Uses `batch_id` Query (Not `capsule_id`)

### Pipeline spec (v7.0.0 §4.1):
```javascript
const q = query(
  collection(db, "capsule_images"),
  where("batch_id", "==", batchId),
  orderBy("filename", "asc")
);
```
The spec's example frontend subscribes by `batch_id` — getting ALL capsules in a batch. This is a batch-monitoring view, not a per-procedure clinical review.

### ZoCW needs:
Query by `capsule_id` to get frames for ONE specific capsule/procedure. This is the correct approach for the Viewer screen.

---

## FINDING 5: Region Discrepancies

| Component | Pipeline spec says | ZoCW docs say |
|-----------|-------------------|---------------|
| Storage bucket | **us-west1** (Oregon) | us-west2 |
| Firestore | **nam5** (US multi-region) | Not specified |
| Functions deploy | **us-west2** (but also says us-central1) | us-west2 |
| AI compute | **us-central1** (Iowa) | us-central1 |

### Impact:
The `getCapsuleFrames` callable in `cw-e7c19` (us-west2) will be reading from Firestore in nam5 (multi-region) — this is fine, no cross-region penalty. But the bucket CORS and signed URL generation must target the correct bucket region.

---

## FINDING 6: Missing `analysis` Fields in Pipeline Spec

### Pipeline spec (v7.0.0 §2.3):
The `analyze-capsule-image` function details are abbreviated in the spec — just memory/timeout/model listed. No schema for the analysis output is given in the spec itself.

### ZoCW types (`capsule-image.ts`):
`AIAnalysisResult` has 8 fields (anomaly_detected, primary_finding, anatomical_location, etc.) based on the CEST dictionary. These were designed from the original PODIUM v4.0 spec.

### Impact:
Need to **verify the actual analysis output** from deployed `analyze-capsule-image` against the `AIAnalysisResult` interface. If the function was updated between v4.0 and v7.0.0, the output shape may differ. Cameron should check a processed document in Firestore console.

---

## FINDING 7: CEST Dictionary Drift

### Pipeline spec (v7.0.0 §3.1) pathologies list:
25 entries — notably missing several items from ZoCW's `CEST_FINDING_CLASSIFICATIONS`:
- Missing from v7.0.0: `Bubble Interference`, `Subepithelial Lesion`, `Phlebectasia`, `Foreign Body`
- Shortened names in v7.0.0: `Chyme` (ZoCW: `Chyme / Turbid Fluid`), `Fecal Loading` (ZoCW: `Food Residue / Fecal Loading`), `Mosaic Pattern` (ZoCW: `Mosaic / Cobblestone Pattern`), `Villous Atrophy` (ZoCW: `Villous Atrophy / Scalloping`)

### Impact:
Medium — the AI model might output either the short or long form. The `getCapsuleFrames` callable should pass through whatever string the AI wrote (don't validate against the enum). The ZoCW frontend should handle unknown classifications gracefully.

---

## FINDING 8: `functions/src/index.ts` Doesn't Export Callables

### Current state:
`functions/src/index.ts` only re-exports types. The 12 callable functions in `functions/src/callable/` and 2 triggers in `functions/src/triggers/` are NOT imported or exported from the entry point.

### How they got deployed:
Session 2 (Mar 24) records 14 functions successfully deployed. Firebase may have used directory-based auto-discovery, or there's a separate entry mechanism not visible in the source. However, any NEW callable like `getCapsuleFrames` must either:
1. Be exported from `index.ts`, or
2. Follow whatever pattern the existing callables use

### Action:
Before writing `getCapsuleFrames`, verify how existing callables are actually exported. Check if there's a separate functions entry file or if Firebase CLI discovers exports automatically from compiled JS files.

---

## FINDING 9: Seed Data Has No `capsuleSerialNumber`

### Current state:
`seed-demo.ts` does NOT set `capsuleSerialNumber` on any procedure documents. The serial numbers `SN-48291-A` and `SN-48292-B` only appear in audit log text strings, not as procedure fields.

### Impact:
The `useCapsuleFrames` hook in Viewer.tsx would receive `undefined` for `procedure?.capsuleSerialNumber`, causing it to skip the fetch entirely. No frames would ever load even if everything else is wired correctly.

### Action:
Add `capsuleSerialNumber` to at least 2 procedures in `seed-demo.ts` — ideally procedures with `ready_for_review` or `draft` status.

---

## FINDING 10: URL Resolution Approach Mismatch

### Pipeline spec (v7.0.0 §4.2):
Recommends `getDownloadURL()` from the Firebase Storage SDK on the frontend.

### ZoCW architecture decision (IMAGE_PIPELINE §4.1):
Uses server-side signed URLs generated in the `getCapsuleFrames` callable. This is the correct approach for the two-project architecture because the frontend doesn't have a Firebase app instance for the pipeline project.

### Impact:
None — the ZoCW decision is sound. But it means signed URLs expire (1 hour default). For a 50K-frame capsule review that takes >1 hour, the Viewer would need to re-fetch or use longer expiry. Consider 4-hour expiry.

---

## CONFIRMED DATA LINKAGE MODEL

```
Physical Capsule (barcode scan at check-in)
    ↓
procedure.capsuleSerialNumber (ZoCW Firestore, cw-e7c19)
    ↓ (engineer uses serial as folder name at upload)
gs://podium-capsule-raw-images-test/{YYYYMMDD}/{capsuleSerial}/*.jpg
    ↓ (log-capsule-image 3-tier parser extracts capsule_id)
capsule_images.capsule_id (Pipeline Firestore, podium-capsule-ingest)
    ↓ (getCapsuleFrames callable queries capsule_id, returns signed URLs)
Viewer screen (ZoCW React app)
```

The `batch_id` (YYYYMMDD) is an operational grouping for upload sessions — ZoCW ignores it. The `capsule_id` is the sole linkage key between the pipeline and ZoCW procedures.

---

## CORRECTED ACTION ITEMS

### Cancelled:
1. ~~PB-1: Rename `procedure_id` → `capsule_serial`~~ → **CANCELLED.** Cameron confirmed `capsule_id` already holds the capsule serial. Database fields are current.

### Cameron Prerequisites (gcloud commands):
2. **PB-3: IAM grants** — still required
3. **PB-4: Composite index** — corrected to `capsule_id` + `filename`
4. **PB-2: CORS** — still required
5. **ZP-3: Test data linkage** — verify `capsule_id` values match a ZoCW procedure's `capsuleSerialNumber`

### Code Tasks (Sonnet-dispatchable):
6. **Update `CapsuleImageDocument` type** — add `batch_id`, `capsule_id`, `created_at`; remove `capsule_serial`
7. **Update seed-demo.ts** — add `capsuleSerialNumber` to procedure documents
8. **Wire callable exports in `functions/src/index.ts`** — existing callables + new `getCapsuleFrames`
9. **Write `getCapsuleFrames` callable** — query `capsule_id`, generate signed URLs
10. **Write `useCapsuleFrames` hook** — call the callable, manage loading/error state
11. **Wire hook into Viewer.tsx** — replace empty `frames` array with real pipeline data

### Cameron's gcloud Commands:

```bash
# 1. IAM grants
gcloud projects add-iam-policy-binding podium-capsule-ingest \
  --member="serviceAccount:cw-e7c19@appspot.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding podium-capsule-ingest \
  --member="serviceAccount:cw-e7c19@appspot.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

# 2. Composite index (capsule_id + filename)
gcloud firestore indexes composite create \
  --project=podium-capsule-ingest \
  --collection-group=capsule_images \
  --field-config field-path=capsule_id,order=ascending \
  --field-config field-path=filename,order=ascending

# 3. CORS
gcloud storage buckets update gs://podium-capsule-raw-images-test \
  --project=podium-capsule-ingest \
  --cors-file=cors.json

# 4. Verify test data linkage
# Open: https://console.firebase.google.com/project/podium-capsule-ingest/firestore
# Check capsule_images collection → note capsule_id values
# Ensure at least one ZoCW procedure has a matching capsuleSerialNumber
```

---

## TYPE CORRECTIONS NEEDED

### `src/types/capsule-image.ts` — CapsuleImageDocument

Current (wrong):
```typescript
export interface CapsuleImageDocument {
  id?: string;
  filename: string;
  capsule_serial: string;  // ← field doesn't exist in pipeline
  bucket: string;
  url: string;
  status: 'pending' | 'processed' | 'error';
  analysis?: AIAnalysisResult;
}
```

Corrected (matches pipeline v7.0.0):
```typescript
export interface CapsuleImageDocument {
  id?: string;
  filename: string;
  batch_id: string;           // Top-level folder grouping
  capsule_id: string;         // Capsule serial number (= folder name)
  procedure_id: string;       // Legacy = batch_id (do not use for lookups)
  bucket: string;
  url: string;
  status: 'pending' | 'processed' | 'error';
  created_at?: any;           // Firestore Timestamp
  analysis?: AIAnalysisResult;
}
```

### `GetCapsuleFramesResponse` — no changes needed
The response type is fine — it returns `capsuleSerial` to the frontend, which is correct terminology for the UI. The mapping from `capsule_id` (pipeline field) → `capsuleSerial` (response field) happens inside the callable.

---

## SUMMARY: Implementation Sequence

### Cameron Prerequisites (can run now, independent of code):
| # | Task | Blocks |
|---|------|--------|
| 1 | IAM grants — 2 `gcloud` commands | getCapsuleFrames testing |
| 2 | Composite index on `capsule_id` + `filename` | getCapsuleFrames testing |
| 3 | CORS on pipeline bucket | Viewer frame rendering |
| 4 | Verify `capsule_id` values match a ZoCW procedure | End-to-end test |

### Code Implementation (Sonnet-dispatchable, sequential):
| # | Task | File(s) | Blocks |
|---|------|---------|--------|
| 5 | Update `CapsuleImageDocument` type | `src/types/capsule-image.ts` | Step 8 |
| 6 | Add `capsuleSerialNumber` to seed procedures | `seed-demo.ts` | Viewer testing |
| 7 | Wire callable exports in index.ts | `functions/src/index.ts` | Function deploy |
| 8 | Write `getCapsuleFrames` callable | `functions/src/callable/getCapsuleFrames.ts` | Step 9 |
| 9 | Write `useCapsuleFrames` hook | `src/lib/hooks.tsx` | Step 10 |
| 10 | Wire hook + AI findings into Viewer.tsx | `src/screens/Viewer.tsx` | Feature complete |

Steps 1–4 (Cameron) and 5–7 (code) can run **in parallel**. Steps 8–10 are sequential.

---

*This document supersedes the field rename assumptions in IMAGE_PIPELINE_INTEGRATION.md §3.1 and BUILD_09_PREREQUISITE_AUDIT.md PB-1.*
