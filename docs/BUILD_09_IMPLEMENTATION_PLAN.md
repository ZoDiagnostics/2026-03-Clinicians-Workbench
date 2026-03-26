# BUILD_09 Implementation Plan: Image Pipeline → ZoCW Viewer
**Date:** March 25, 2026
**Model:** Opus 4.6 (Cowork)
**Based on:** `BUILD_09_GAP_ANALYSIS.md`, `IMAGE_PIPELINE_INTEGRATION.md`, PODIUM v7.0.0 spec
**Status:** Ready for execution

---

## Overview

Wire the deployed capsule endoscopy image pipeline (`podium-capsule-ingest`) into the ZoCW Viewer screen so clinicians can review AI-analyzed frames during procedure reading. The pipeline is fully built and processing frames. ZoCW needs to read from it.

**End state:** A clinician opens the Viewer for a procedure → the Viewer fetches all frames + AI analysis for that procedure's capsule → FrameViewer plays back images → AI-detected findings appear in the findings panel alongside clinician-marked findings.

---

## Phase 0: Infrastructure Prerequisites (Cameron, manual)

**When:** Before any code can be tested. Can run in parallel with Phases 1–2.
**Duration:** ~15 minutes
**No code changes.**

### 0A: Fix Git (re-clone)
Follow the procedure in `docs/LESSONS_LEARNED.md` Lesson 14. Back up 4 uncommitted doc files, re-clone, copy files back, commit and push.

### 0B: IAM Grants
Grant the ZoCW Cloud Functions service account cross-project read access:
```bash
gcloud projects add-iam-policy-binding podium-capsule-ingest \
  --member="serviceAccount:cw-e7c19@appspot.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding podium-capsule-ingest \
  --member="serviceAccount:cw-e7c19@appspot.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

### 0C: Composite Firestore Index
```bash
gcloud firestore indexes composite create \
  --project=podium-capsule-ingest \
  --collection-group=capsule_images \
  --field-config field-path=capsule_id,order=ascending \
  --field-config field-path=filename,order=ascending
```

### 0D: CORS on Pipeline Bucket
Save `cors.json` (see `IMAGE_PIPELINE_INTEGRATION.md` §6.1, update origins to include `cw-e7c19.web.app`, `cw-e7c19.firebaseapp.com`, `localhost:5173`), then:
```bash
gcloud storage buckets update gs://podium-capsule-raw-images-test \
  --project=podium-capsule-ingest \
  --cors-file=cors.json
```

### 0E: Verify Test Data Linkage
1. Open [Pipeline Firestore Console](https://console.firebase.google.com/project/podium-capsule-ingest/firestore)
2. Navigate to `capsule_images` collection
3. Note the `capsule_id` value(s) on existing processed documents
4. Confirm at least one matches (or will match) a ZoCW procedure's `capsuleSerialNumber`
5. Check the `analysis` field shape on a `status: "processed"` document — compare against `AIAnalysisResult` interface in `src/types/capsule-image.ts`

### Phase 0 Exit Criteria:
- [ ] Git repo is clean (fresh clone, all docs committed and pushed)
- [ ] IAM grants applied (2 roles)
- [ ] Composite index created (may take a few minutes to build)
- [ ] CORS applied to bucket
- [ ] At least one `capsule_id` value is known for testing
- [ ] `analysis` output shape verified or discrepancies noted

---

## Phase 1: Type Corrections + Seed Data (Sonnet, code)

**When:** Immediately — no dependencies.
**Duration:** ~20 minutes
**Files changed:** `src/types/capsule-image.ts`, `seed-demo.ts`
**Risk:** Low — type changes only, no runtime behavior change.

### 1A: Update `CapsuleImageDocument` type

**File:** `src/types/capsule-image.ts`

Replace the current `CapsuleImageDocument` interface to match the actual pipeline schema:

```typescript
export interface CapsuleImageDocument {
  /** Firestore document ID (deterministic: {batch_id}_{capsule_id}_{filename}) */
  id?: string;

  /** Frame filename (e.g., "frame_00001.jpg") — used for ordering */
  filename: string;

  /** Upload batch date grouping (YYYYMMDD) — not used for ZoCW queries */
  batch_id: string;

  /**
   * Capsule serial number — the linkage key to ZoCW procedures.
   * Matches procedure.capsuleSerialNumber in ZoCW Firestore.
   * Query: WHERE capsule_id == procedure.capsuleSerialNumber
   */
  capsule_id: string;

  /** Legacy field = batch_id. Do NOT use for queries. */
  procedure_id?: string;

  /** Storage bucket name */
  bucket: string;

  /** gs:// URL to the frame image (converted to signed HTTPS URL by getCapsuleFrames) */
  url: string;

  /** Processing status */
  status: 'pending' | 'processed' | 'error';

  /** Pipeline creation timestamp */
  created_at?: any;

  /** AI analysis result — present when status === 'processed' */
  analysis?: AIAnalysisResult;
}
```

Also update the doc comments on the file header and the `capsule_serial` references throughout. Remove the `capsule_serial` field entirely — it doesn't exist in the pipeline.

Update `CEST_TO_ANATOMICAL_REGION` and `cestToAnatomicalRegion()` — these are fine as-is but verify the mapping handles any shortened CEST terms from v7.0.0 gracefully (the fallback to `COLON` handles unknowns).

### 1B: Add `capsuleSerialNumber` to seed procedures

**File:** `seed-demo.ts`

Add `capsuleSerialNumber` to at least 3 procedure documents — ideally ones with `ready_for_review` or `draft` status so the Viewer can load frames for them:

```typescript
// On procedures that should have pipeline frames:
capsuleSerialNumber: "SN-48291-A",  // Must match a capsule_id in pipeline Firestore
```

Choose procedures already used for testing (Sarah Johnson's `sb_diagnostic`, Robert Brown's `colon_eval`, etc.). The serial numbers should match actual data in the pipeline — or use the value confirmed in Phase 0E.

### Phase 1 Exit Criteria:
- [ ] `CapsuleImageDocument` has `batch_id`, `capsule_id` fields (no `capsule_serial`)
- [ ] `GetCapsuleFramesResponse` unchanged (already correct)
- [ ] `AIAnalysisResult` unchanged (or updated if Phase 0E found discrepancies)
- [ ] At least 3 seed procedures have `capsuleSerialNumber` set
- [ ] `npm run build` passes (type-only changes, no runtime impact)

---

## Phase 2: Cloud Function — `getCapsuleFrames` (Sonnet, code)

**When:** After Phase 1 (needs updated types).
**Duration:** ~45 minutes
**Files changed:** `functions/src/callable/getCapsuleFrames.ts` (new), `functions/src/index.ts` (or wherever callables are exported), `functions/src/utils/validators.ts`
**Risk:** Medium — cross-project Firestore access, signed URL generation. Cannot be tested until Phase 0 IAM grants are done.

### 2A: Investigate callable export pattern

Before writing the function, determine how existing callables (e.g., `suggestCodes`, `validateCapsule`) are exported so Firebase discovers them at deploy time. Current `functions/src/index.ts` only exports types. Check:
- Is there a separate entry file?
- Does Firebase auto-discover from compiled JS?
- Are they exported from somewhere not yet identified?

If callables need explicit export, update `functions/src/index.ts` to re-export all callables + triggers. This unblocks deployment of the new function AND fixes any existing deployment issues.

### 2B: Add Zod input validator

**File:** `functions/src/utils/validators.ts`

```typescript
export const getCapsuleFramesInputSchema = z.object({
  capsuleSerial: z.string().min(1).max(50),
});
export type GetCapsuleFramesInput = z.infer<typeof getCapsuleFramesInputSchema>;
```

### 2C: Write `getCapsuleFrames` callable

**File:** `functions/src/callable/getCapsuleFrames.ts`

Pattern: Follow `suggestCodes.ts` structure (auth check, role validation, practice scope, Zod input, try/catch, HttpsError).

Key implementation details:

1. **Auth + role check:** Require authenticated user with clinician or admin role
2. **Initialize pipeline Firestore client:**
   ```typescript
   import { initializeApp, getApps } from 'firebase-admin/app';
   import { getFirestore } from 'firebase-admin/firestore';

   // Initialize pipeline app once (singleton)
   const PIPELINE_PROJECT_ID = 'podium-capsule-ingest';
   function getPipelineDb() {
     const appName = 'pipeline';
     const existing = getApps().find(a => a.name === appName);
     const app = existing || initializeApp({ projectId: PIPELINE_PROJECT_ID }, appName);
     return getFirestore(app);
   }
   ```
3. **Query `capsule_images`:**
   ```typescript
   const pipelineDb = getPipelineDb();
   const snapshot = await pipelineDb
     .collection('capsule_images')
     .where('capsule_id', '==', capsuleSerial)
     .orderBy('filename', 'asc')
     .get();
   ```
4. **Generate signed URLs** for each frame's `gs://` URL:
   ```typescript
   import { getStorage } from 'firebase-admin/storage';

   const PIPELINE_BUCKET = 'podium-capsule-raw-images-test';

   async function toSignedUrl(gsUrl: string): Promise<string> {
     const bucket = getStorage().bucket(PIPELINE_BUCKET);
     const filePath = gsUrl.replace(`gs://${PIPELINE_BUCKET}/`, '');
     const [url] = await bucket.file(filePath).getSignedUrl({
       action: 'read',
       expires: Date.now() + 4 * 60 * 60 * 1000, // 4 hours (long capsule reviews)
     });
     return url;
   }
   ```
5. **Build response** matching `GetCapsuleFramesResponse`:
   ```typescript
   const frames = await Promise.all(
     snapshot.docs.map(async (doc) => {
       const data = doc.data();
       return {
         ...data,
         id: doc.id,
         url: await toSignedUrl(data.url),  // gs:// → signed HTTPS
       } as CapsuleImageDocument;
     })
   );

   return {
     totalFrames: frames.length,
     analyzedFrames: frames.filter(f => f.status === 'processed').length,
     anomalyFrames: frames.filter(f => f.analysis?.anomaly_detected).length,
     capsuleSerial,
     frames,
   };
   ```

### 2D: Performance consideration — 50K frames

A capsule study can have ~50,000 frames. Returning all 50K docs with signed URLs in one call will be slow (each `getSignedUrl` is an API call). Mitigations:

- **Batch signed URL generation** — process in chunks of 100 with `Promise.all`
- **Pagination option** — add optional `limit` and `offset` params for phased loading
- **URL strategy alternative** — if all frames are in one bucket prefix, consider returning a single signed URL prefix + frame list (fewer API calls). Or use uniform bucket-level access with CORS instead of per-file signed URLs.

For the initial build, implement the straightforward approach (all frames, all signed URLs). Optimize in a follow-up if performance is unacceptable.

### Phase 2 Exit Criteria:
- [ ] `getCapsuleFrames.ts` written with auth, role check, cross-project query, signed URLs
- [ ] Zod validator added for input
- [ ] Callable exported from functions entry point
- [ ] `npm run build` passes in `functions/` directory
- [ ] Manual test: deploy function, call with a known `capsuleSerial`, verify response shape

---

## Phase 3: React Hook — `useCapsuleFrames` (Sonnet, code)

**When:** After Phase 2 (needs the callable to exist).
**Duration:** ~20 minutes
**Files changed:** `src/lib/hooks.tsx`
**Risk:** Low — React hook with no side effects beyond data fetching.

### 3A: Write `useCapsuleFrames` hook

**File:** `src/lib/hooks.tsx` (add to existing hooks file)

```typescript
import { GetCapsuleFramesResponse } from '../types/capsule-image';

export function useCapsuleFrames(capsuleSerial: string | undefined) {
  const [data, setData] = useState<GetCapsuleFramesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!capsuleSerial) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    const getCapsuleFrames = httpsCallable(functions, 'getCapsuleFrames');
    getCapsuleFrames({ capsuleSerial })
      .then((result) => {
        setData(result.data as GetCapsuleFramesResponse);
      })
      .catch((err: Error) => {
        console.error('[useCapsuleFrames] Error:', err);
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [capsuleSerial]);

  return { data, loading, error };
}
```

Key behaviors:
- **Skips fetch** when `capsuleSerial` is undefined (no pipeline data for this procedure)
- **Fetches once** per `capsuleSerial` value (no polling — data is static at read time)
- **Returns** `{ data, loading, error }` for the Viewer to consume
- **Uses existing** `functions` instance already initialized in `hooks.tsx` line 29

### Phase 3 Exit Criteria:
- [ ] Hook added to `src/lib/hooks.tsx`
- [ ] Imports `GetCapsuleFramesResponse` from capsule-image types
- [ ] `npm run build` passes
- [ ] Hook is exported and available for Viewer import

---

## Phase 4: Viewer Integration (Sonnet, code)

**When:** After Phase 3 (needs the hook).
**Duration:** ~60 minutes (largest phase — UI wiring + AI findings integration)
**Files changed:** `src/screens/Viewer.tsx`, `src/components/FrameViewer.tsx` (minor)
**Risk:** Medium — touches the most complex screen. Thorough testing needed.

### 4A: Wire `useCapsuleFrames` into Viewer.tsx

Replace the current placeholder:
```typescript
// TODO: Load actual frames from Firebase Storage via useCapsuleFrames hook
const frames: string[] = [];
```

With:
```typescript
import { useCapsuleFrames } from '../lib/hooks';
import { CapsuleImageDocument, cestToAnatomicalRegion } from '../types/capsule-image';

// Inside the component:
const { data: capsuleData, loading: framesLoading, error: framesError } =
  useCapsuleFrames(procedure?.capsuleSerialNumber);

// Extract frame URLs for FrameViewer
const frames = capsuleData?.frames.map(f => f.url) ?? [];

// Extract AI-detected findings for the findings panel
const aiFrames = capsuleData?.frames.filter(f =>
  f.analysis?.anomaly_detected && f.status === 'processed'
) ?? [];
```

### 4B: Add loading/error states for frame fetching

Show a loading indicator while frames are being fetched from the pipeline:
```typescript
{framesLoading && (
  <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-400">
    <div className="text-center">
      <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
      <p>Loading capsule frames...</p>
      <p className="text-xs mt-1 text-gray-600">
        {procedure?.capsuleSerialNumber}
      </p>
    </div>
  </div>
)}
```

Show an error state if the fetch fails:
```typescript
{framesError && (
  <div className="flex-1 flex items-center justify-center bg-gray-900 text-red-400">
    <div className="text-center">
      <p>Failed to load capsule frames</p>
      <p className="text-xs mt-1 text-gray-600">{framesError.message}</p>
    </div>
  </div>
)}
```

### 4C: Display capsule metadata in patient info bar

Add frame count and capsule serial to the patient info bar:
```typescript
{capsuleData && (
  <>
    <span className="text-xs text-gray-400">|</span>
    <span className="text-xs text-gray-400">
      Capsule: {capsuleData.capsuleSerial}
    </span>
    <span className="text-xs text-gray-400">
      {capsuleData.totalFrames.toLocaleString()} frames
      ({capsuleData.anomalyFrames} anomalies)
    </span>
  </>
)}
```

### 4D: Integrate AI-detected findings into findings panel

When the pipeline returns frames with `analysis.anomaly_detected === true`, create findings entries in the findings panel. Two approaches:

**Option A (display-only):** Show AI findings from the pipeline data alongside the existing Firestore findings, without writing them to the findings subcollection. Simpler but AI findings wouldn't persist across sessions or appear in reports.

**Option B (seed on first load):** On first Viewer load for a procedure, write AI-detected frames as `Finding` documents to the procedure's findings subcollection with `provenance: 'ai_detected'`. This is the correct approach — findings need to persist for the report workflow.

**Recommended: Option B.** Implement a one-time seeding step:
1. Check if AI findings already exist for this procedure (any finding with `provenance === 'ai_detected'`)
2. If none exist and `capsuleData` has anomaly frames, create findings from AI analysis
3. Map `analysis.primary_finding` → `finding.classification`
4. Map `analysis.anatomical_location` → `finding.anatomicalRegion` using `cestToAnatomicalRegion()`
5. Map `analysis.confidence_score` → `finding.aiConfidence`
6. Set `reviewStatus: 'pending'` — clinician must confirm or dismiss each AI finding

```typescript
// One-time AI finding seed (runs after capsuleData loads)
useEffect(() => {
  if (!capsuleData || !procedureId || !reviewUnlocked) return;

  // Check if AI findings already seeded
  const hasAiFindings = findings.some(f => f.provenance === FindingProvenance.AI_DETECTED);
  if (hasAiFindings) return;

  // Seed AI-detected anomalies as findings
  const anomalies = capsuleData.frames.filter(f =>
    f.analysis?.anomaly_detected && f.status === 'processed'
  );

  anomalies.forEach(async (frame) => {
    const analysis = frame.analysis!;
    await createFinding(procedureId, {
      procedureId,
      classification: analysis.primary_finding || 'Unknown',
      provenance: FindingProvenance.AI_DETECTED,
      reviewStatus: FindingReviewStatus.PENDING,
      isIncidental: false,
      anatomicalRegion: cestToAnatomicalRegion(analysis.anatomical_location),
      primaryFrameNumber: parseInt(frame.filename.replace(/\D/g, '')) || 0,
      primaryFrameTimestamp: 0,
      additionalFrames: [],
      modificationHistory: [],
      annotations: [],
      aiConfidence: Math.round(analysis.confidence_score * 100),
    });
  });
}, [capsuleData, procedureId, findings, reviewUnlocked]);
```

### 4E: Frame-finding linking

When a clinician clicks an AI finding in the findings panel, jump the FrameViewer to that finding's frame:
```typescript
const handleFindingClick = (finding: Finding) => {
  if (finding.primaryFrameNumber !== undefined) {
    setCurrentFrame(finding.primaryFrameNumber);
  }
};
```

Add `onClick` to the finding card in the findings list, wrapping the existing content.

### Phase 4 Exit Criteria:
- [ ] Viewer loads frames from pipeline when `capsuleSerialNumber` is set
- [ ] Loading spinner shown during fetch
- [ ] Error state shown on failure
- [ ] Capsule metadata (serial, frame count, anomaly count) in info bar
- [ ] AI findings seeded as Finding documents on first load
- [ ] Clicking a finding jumps to its frame
- [ ] Procedures without `capsuleSerialNumber` still work (empty frames, same as today)
- [ ] `npm run build` passes

---

## Phase 5: End-to-End Testing (Sonnet + Cameron)

**When:** After Phases 0–4 complete.
**Duration:** ~90 minutes
**No code changes (test-only).**

### 5A: Deploy
```bash
cd functions && npm run build
cd .. && npm run build
npx firebase-tools@latest deploy --only functions,hosting
```

### 5B: Seed + Verify Data
```bash
npx tsx seed-demo.ts  # Re-seed with capsuleSerialNumber on procedures
```
Verify in ZoCW Firestore that the seeded procedures have `capsuleSerialNumber` matching pipeline data.

### 5C: Happy Path Test
1. Log in as `clinician@zocw.com`
2. Navigate to a procedure with `capsuleSerialNumber` set
3. Open Viewer → verify frames load, FrameViewer plays back
4. Verify AI findings appear in findings panel with "AI" badge
5. Verify frame count and anomaly count in info bar
6. Click an AI finding → verify FrameViewer jumps to that frame
7. Confirm/dismiss an AI finding → verify status changes
8. Navigate to Report → verify AI findings carry through

### 5D: Edge Case Tests
1. **No pipeline data:** Open Viewer for a procedure WITHOUT `capsuleSerialNumber` → should show "No Capsule Frames Loaded" (existing empty state)
2. **Mismatched serial:** Procedure has a `capsuleSerialNumber` with no matching pipeline data → should show 0 frames gracefully
3. **All pending:** If pipeline frames exist but none are `status: "processed"` → frames load but no AI findings generated
4. **Large dataset:** If test data includes thousands of frames, verify performance is acceptable

### 5E: Role-Based Tests
1. **Admin:** Can view frames but cannot add/modify findings
2. **Clinical staff:** Cannot access Viewer (existing RBAC)
3. **Clinician_noauth:** Can view frames, cannot sign

### Phase 5 Exit Criteria:
- [ ] Happy path works end-to-end
- [ ] Edge cases handled gracefully
- [ ] No regressions on existing Viewer functionality
- [ ] Performance acceptable for test dataset size

---

## Phase 6: Performance Optimization (if needed)

**When:** Only if Phase 5 reveals performance issues with large frame sets.
**Duration:** TBD based on findings.

Potential optimizations (prioritized):
1. **Batch signed URL generation** — parallel chunks of 50–100
2. **Pagination** — load first 1000 frames, fetch more on scroll
3. **Thumbnail URLs** — if pipeline generates thumbnails, use those for the timeline and full-res only for the current frame
4. **Uniform bucket access** — switch from per-file signed URLs to bucket-level public access with CORS (eliminates URL generation entirely, but changes security model)

---

## Model Routing

| Phase | Task | Model | Rationale |
|-------|------|-------|-----------|
| 0 | Infrastructure + git fix | Cameron (manual) | gcloud CLI, console access |
| 1 | Type corrections + seed data | Sonnet | Bounded edits, clear targets |
| 2 | getCapsuleFrames callable | Sonnet | Pattern-follow from suggestCodes, cross-project init needs care |
| 3 | useCapsuleFrames hook | Sonnet | Straightforward React hook |
| 4 | Viewer integration | Sonnet (Opus review) | Largest change, AI finding seeding logic needs judgment |
| 5 | End-to-end testing | Sonnet (browser automation) | Systematic test execution |
| 6 | Performance optimization | Opus | Architectural decision on URL strategy |

---

## Files Changed Summary

| File | Phase | Change Type |
|------|-------|-------------|
| `src/types/capsule-image.ts` | 1 | Modify — update CapsuleImageDocument fields |
| `seed-demo.ts` | 1 | Modify — add capsuleSerialNumber to procedures |
| `functions/src/utils/validators.ts` | 2 | Modify — add getCapsuleFrames input schema |
| `functions/src/callable/getCapsuleFrames.ts` | 2 | **New** — cross-project proxy callable |
| `functions/src/index.ts` (or export file) | 2 | Modify — export callable functions |
| `src/lib/hooks.tsx` | 3 | Modify — add useCapsuleFrames hook |
| `src/screens/Viewer.tsx` | 4 | Modify — wire hook, loading states, AI findings |

**Total: 7 files (1 new, 6 modified)**

---

*This plan is ready for execution. Phase 0 (Cameron manual) and Phases 1–2 (code) can run in parallel. Phases 3–4 are sequential. Phase 5 requires all prior phases complete.*
