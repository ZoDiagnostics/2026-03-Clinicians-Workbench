# BUILD_09: Image Pipeline Integration
**Phase:** 9 — Capsule Image Pipeline
**Dependencies:** BUILD_01 (Auth), BUILD_02 (Clinical Workflow), BUILD_03 (Viewer), BUILD_07 (CapsuleUpload)
**Screens Modified:** SCR-09 (CapsuleUpload), SCR-10 (Viewer)
**New Cloud Function:** `getCapsuleFrames`
**New Hook:** `useCapsuleFrames`
**New Types:** `src/types/capsule-image.ts`
**Architecture Doc:** `docs/IMAGE_PIPELINE_INTEGRATION.md`

---

## PREREQUISITES

Before starting this build packet:

1. **Pipeline backend work must be complete** (HANDOFF.md Priority 1B):
   - `log-capsule-image` field renamed from `procedure_id` → `capsule_serial`
   - CORS configured on `podium-capsule-raw-images-test` bucket
   - Cross-project service account granted `roles/datastore.user` + `roles/storage.objectViewer` on `podium-capsule-ingest`
   - Composite Firestore index created on `capsule_images` (`capsule_serial` asc, `filename` asc)

2. **ZoCW Cloud Functions must be deployable** (requires Blaze plan):
   - The `getCapsuleFrames` callable needs to be deployed to `cw-e7c19`

3. **Test data must exist in pipeline Firestore:**
   - At least one folder of frames uploaded to `podium-capsule-raw-images-test` with a capsule serial number that matches a ZoCW procedure's `capsuleSerialNumber`

---

## CONTEXT

### What Already Exists
- `FrameViewer` component (`src/components/FrameViewer.tsx`) — fully built with play/pause, stepping, speed control, timeline scrubber, keyboard shortcuts. Currently receives an empty `frames` array.
- `Viewer` screen (`src/screens/Viewer.tsx`) — has patient info bar, pre-review banner, findings panel. Currently has `const frames: string[] = []` with a TODO comment.
- `CapsuleUpload` screen (`src/screens/CapsuleUpload.tsx`) — has status-gated routing and consent confirmation. Currently simulates upload with a timer.
- `Procedure` type (`src/types/procedure.ts`) — has `capsuleSerialNumber` field.
- `capsule-image.ts` types (`src/types/capsule-image.ts`) — `CapsuleImageDocument`, `AIAnalysisResult`, `GetCapsuleFramesResponse`, CEST enums and mapping functions.

### What This Packet Builds
1. `getCapsuleFrames` callable Cloud Function (server-side cross-project Firestore read)
2. `useCapsuleFrames` React hook (calls the callable, caches result)
3. Wire `Viewer.tsx` to real frame data from the pipeline
4. Wire `CapsuleUpload.tsx` to real upload flow
5. Display AI analysis results in the Viewer findings panel

---

## STEP 1: Create `getCapsuleFrames` Cloud Function

**File:** `functions/src/callable/getCapsuleFrames.ts`

This function lives in the `cw-e7c19` project and reads from the `podium-capsule-ingest` project's Firestore.

### Requirements
- **Input:** `{ capsuleSerial: string }` — validated with Zod
- **Auth:** Caller must be authenticated with a valid role (`clinician_auth`, `clinician_noauth`, `clinician_admin`)
- **Cross-project read:** Initialize a secondary Firebase Admin app pointing at `podium-capsule-ingest` and get its Firestore instance
- **Query:** `capsule_images` where `capsule_serial == capsuleSerial`, ordered by `filename` asc
- **URL conversion:** Convert each `gs://` URL to a signed HTTPS URL (1-hour expiry) using the Cloud Storage admin SDK
- **Response shape:** `GetCapsuleFramesResponse` from `src/types/capsule-image.ts`
- **Error handling:** Return appropriate error if no frames found, if capsule serial doesn't match any docs, or if cross-project auth fails

### Implementation Notes
```typescript
// Secondary app for pipeline project — initialize ONCE at module level
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const PIPELINE_PROJECT_ID = 'podium-capsule-ingest';
const PIPELINE_BUCKET = 'podium-capsule-raw-images-test';

// Avoid duplicate initialization
const pipelineApp = getApps().find(a => a.name === 'pipeline')
  ?? initializeApp({ projectId: PIPELINE_PROJECT_ID }, 'pipeline');

const pipelineDb = getFirestore(pipelineApp);
const pipelineBucket = getStorage(pipelineApp).bucket(PIPELINE_BUCKET);
```

### Temporary Compatibility
Until the pipeline field rename is complete (HANDOFF.md 1B), query on `procedure_id` instead of `capsule_serial`:
```typescript
// TODO: Change to 'capsule_serial' after pipeline field rename
const q = pipelineDb.collection('capsule_images')
  .where('procedure_id', '==', capsuleSerial)  // Will become 'capsule_serial'
  .orderBy('filename', 'asc');
```

### Export
Add to `functions/src/index.ts`:
```typescript
export { getCapsuleFrames } from './callable/getCapsuleFrames';
```

---

## STEP 2: Create `useCapsuleFrames` Hook

**File:** `src/lib/hooks.tsx` (add to existing file)

### Requirements
- Takes `capsuleSerial: string | undefined` as parameter
- Calls `getCapsuleFrames` callable on mount (when capsuleSerial is truthy)
- Returns `{ frames, totalFrames, anomalyFrames, loading, error }`
- Caches result — does NOT re-fetch on re-render
- Only fetches once per capsuleSerial value

### Implementation Pattern
```typescript
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
    const getCapsuleFrames = httpsCallable(functions, 'getCapsuleFrames');
    getCapsuleFrames({ capsuleSerial })
      .then(result => {
        setData(result.data as GetCapsuleFramesResponse);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [capsuleSerial]);

  return {
    frames: data?.frames ?? [],
    totalFrames: data?.totalFrames ?? 0,
    anomalyFrames: data?.anomalyFrames ?? 0,
    loading,
    error,
  };
}
```

### Import
Add to the imports at the top of `hooks.tsx`:
```typescript
import { GetCapsuleFramesResponse } from '../types/capsule-image';
```

---

## STEP 3: Wire Viewer.tsx to Real Frame Data

**File:** `src/screens/Viewer.tsx`

### Changes Required

1. **Import the hook:**
   ```typescript
   import { useCapsuleFrames } from '../lib/hooks';
   import { cestToAnatomicalRegion } from '../types/capsule-image';
   ```

2. **Replace the empty frames array:**
   ```typescript
   // REMOVE:
   // const frames: string[] = [];

   // ADD:
   const { frames: capsuleFrames, totalFrames, anomalyFrames, loading: framesLoading, error: framesError }
     = useCapsuleFrames(procedure?.capsuleSerialNumber);

   // Extract just the signed URLs for FrameViewer
   const frameUrls = capsuleFrames.map(f => f.url);
   ```

3. **Pass real URLs to FrameViewer:**
   ```typescript
   <FrameViewer
     frames={frameUrls}  // Was: frames (empty array)
     currentFrame={currentFrame}
     onFrameChange={setCurrentFrame}
     fps={4}
   />
   ```

4. **Show loading state while frames load:**
   Display a loading indicator in the FrameViewer area while `framesLoading` is true.

5. **Show AI findings in the findings panel:**
   When the current frame has `analysis.anomaly_detected === true`, display the AI finding in the findings list alongside clinician-marked findings. Use the `AI_DETECTED` provenance badge. Map `analysis.anatomical_location` to `AnatomicalRegion` using `cestToAnatomicalRegion()`.

6. **Show frame-level AI info:**
   When a frame is selected, display its `analysis` data (if present) in a panel or tooltip:
   - Anatomical location
   - Primary finding
   - Confidence score
   - Mucosal view quality
   - Clinical notes

### Current Frame AI Context
```typescript
const currentFrameData = capsuleFrames[currentFrame];
const currentAnalysis = currentFrameData?.analysis;
```

---

## STEP 4: Wire CapsuleUpload.tsx to Real Upload

**File:** `src/screens/CapsuleUpload.tsx`

### Changes Required

1. **Remove simulated upload** — Delete the `setTimeout` that fakes file readiness.

2. **Add Storage upload integration:**
   - Import Firebase Storage: `import { ref, uploadBytesResumable } from 'firebase/storage';`
   - The upload target is `podium-capsule-raw-images-test` bucket, but this requires cross-project Storage access from the frontend.
   - **Alternative (recommended for MVP):** Keep the upload as a manual step performed by the engineer in the GCS console. The CapsuleUpload screen instead becomes a "confirm upload complete" step where the clinician verifies the capsule serial number and confirms the data has been uploaded.

3. **Add capsule serial number verification:**
   - Display `procedure.capsuleSerialNumber` prominently
   - Show a confirmation: "Verify that capsule data for serial number {SN} has been uploaded to the image pipeline"
   - On confirmation, transition procedure status to `ready_for_review`

4. **Optional: Upload progress from pipeline:**
   - Query `capsule_images` count for this capsule serial to show how many frames have been indexed
   - This would require the `getCapsuleFrames` callable or a lighter `getCapsuleFrameCount` callable

---

## STEP 5: Firestore Security Rules

No changes needed to `cw-e7c19` Firestore rules — the `capsule_images` collection lives in the pipeline project, and access is through the `getCapsuleFrames` callable which handles auth checking.

Ensure the pipeline project's Firestore rules allow reads from the service account:
```javascript
match /capsule_images/{document} {
  allow read: if request.auth != null;
  allow write: if false;
}
```

---

## ACCEPTANCE CRITERIA

### Functional
- [ ] `getCapsuleFrames` callable returns frame data for a valid capsule serial number
- [ ] `getCapsuleFrames` returns an error for an invalid/unknown capsule serial
- [ ] `getCapsuleFrames` returns signed HTTPS URLs (not `gs://` URLs)
- [ ] Viewer loads and displays real capsule frames from the pipeline
- [ ] FrameViewer playback (play/pause/step/scrub) works with real frame URLs
- [ ] AI analysis results appear in the findings panel for frames with anomalies
- [ ] AI findings show `AI_DETECTED` provenance badge
- [ ] Anatomical locations from AI are mapped to ZoCW `AnatomicalRegion` enum correctly
- [ ] CapsuleUpload screen shows the procedure's capsule serial number
- [ ] CapsuleUpload transitions procedure to `ready_for_review` on confirmation

### Performance
- [ ] `getCapsuleFrames` returns within 10 seconds for a 50K-frame capsule
- [ ] Viewer renders first frame within 2 seconds of `getCapsuleFrames` response
- [ ] Frame stepping (arrow keys) loads next frame within 500ms

### Error Handling
- [ ] Viewer shows appropriate message if no frames found for capsule serial
- [ ] Viewer shows error state if `getCapsuleFrames` fails
- [ ] Viewer handles frames with `status: "error"` gracefully (skip or show warning)

### Security
- [ ] `getCapsuleFrames` rejects unauthenticated calls
- [ ] `getCapsuleFrames` validates caller role
- [ ] Signed URLs expire after 1 hour
- [ ] Cross-project service account has minimum required permissions

---

## TESTING CHECKLIST

### Pre-Test Setup
- [ ] At least one procedure in ZoCW has a `capsuleSerialNumber` value
- [ ] Frames exist in `podium-capsule-raw-images-test` bucket under a folder matching that serial number
- [ ] `capsule_images` docs exist in pipeline Firestore with matching `capsule_serial` (or `procedure_id` pre-rename)
- [ ] At least some frames have `status: "processed"` with `analysis` data

### Test Scenarios
1. **Happy path:** Open Viewer for a procedure with capsule data → frames load → playback works → AI findings visible
2. **No data:** Open Viewer for a procedure with no matching capsule data → appropriate "no frames" message
3. **Mixed status:** Ensure any `status: "error"` frames are handled (should be rare since pipeline processes before Viewer opens)
4. **Performance:** Load a 50K-frame capsule → verify response time and first-frame render time
5. **Auth:** Call `getCapsuleFrames` without auth → should reject
6. **CapsuleUpload flow:** Complete the upload confirmation → procedure transitions to `ready_for_review` → Viewer accessible

---

## FILES MODIFIED/CREATED

| File | Action | Description |
|------|--------|-------------|
| `functions/src/callable/getCapsuleFrames.ts` | **CREATE** | Cross-project proxy callable |
| `functions/src/index.ts` | **MODIFY** | Export `getCapsuleFrames` |
| `src/types/capsule-image.ts` | **EXISTS** | Already created — no changes needed |
| `src/types/index.ts` | **EXISTS** | Already updated — no changes needed |
| `src/lib/hooks.tsx` | **MODIFY** | Add `useCapsuleFrames` hook |
| `src/screens/Viewer.tsx` | **MODIFY** | Wire to real frame data and AI findings |
| `src/screens/CapsuleUpload.tsx` | **MODIFY** | Replace simulated upload with confirmation flow |

---

*This build packet follows the same structure as BUILD_01 through BUILD_08. Refer to ZOCW_REFERENCE.md for screen registry, routing table, and role matrix.*
