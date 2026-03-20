# ZoCW Image Pipeline Integration Architecture
**Version:** 1.0.0
**Status:** Approved — Architectural decisions binding (see HANDOFF.md)
**Last Updated:** March 19, 2026
**Supersedes:** `docs/Firebase_Image_Pipeline_Architecture.docx`
**Source Material:** `image pipeline from gemini/Gemini Image Pipeline Architecture v4.rtf` (PODIUM spec v4.0.0)

---

## 1. OVERVIEW

This document describes how the ZoCW Clinicians Workbench (React + TypeScript + Firebase, project `cw-e7c19`) integrates with the capsule endoscopy image pipeline (Python + GCP, project `podium-capsule-ingest`).

The pipeline is **fully built, deployed, and tested** with ~50K frames. This document covers the integration architecture — how ZoCW reads from and interacts with the pipeline's data.

### 1.1 Two-Project Architecture

| Concern | GCP Project | Region |
|---------|-------------|--------|
| ZoCW web app, clinical data, auth, Cloud Functions | `cw-e7c19` | us-west2 |
| Image storage, frame indexing, AI analysis | `podium-capsule-ingest` | us-west2 |

The projects are intentionally separate. The image pipeline is a shared service that could serve multiple frontends (web, iOS). ZoCW reads from it; it never writes to it.

### 1.2 Key Infrastructure (Pipeline Project)

| Resource | Details |
|----------|---------|
| **Storage bucket** | `podium-capsule-raw-images-test` |
| **Firestore collection** | `capsule_images` |
| **Cloud Function: Ingest** | `log-capsule-image` — triggered by Storage upload, indexes frame metadata to Firestore |
| **Cloud Function: AI** | `analyze-capsule-image` — triggered by Firestore doc creation, runs Gemini 2.5 Flash per frame |
| **AI Model** | Gemini 2.5 Flash, `us-central1`, temperature 0.0 |

---

## 2. REAL-WORLD CAPSULE WORKFLOW

This is the end-to-end flow for a capsule endoscopy study, from physical capsule to clinician review.

### Step 1: Check-In (ZoCW — SCR-08)
- Clinical staff creates a procedure record for the patient
- Capsule serial number is scanned (barcode/QR/manual) and saved as `procedure.capsuleSerialNumber`
- Procedure status: `capsule_return_pending`

### Step 2: Capsule Return
- Patient returns the capsule after the study period
- Procedure status → `capsule_received`

### Step 3: Dock & Upload (Human Operator)
- Engineer docks capsule on proprietary reader hardware
- Reader software exports ~50K individual JPG/PNG frames
- Engineer uploads frames to `podium-capsule-raw-images-test` bucket
- **Folder name = capsule serial number** (e.g., `SN-48291-A/`)
- This is the critical linkage point — the folder name MUST match `procedure.capsuleSerialNumber`

### Step 4: Pipeline Processing (Automatic)
- `log-capsule-image` fires on each frame upload → creates a `capsule_images` doc with `capsule_serial`, `filename`, `url`, `status: "pending"`
- `analyze-capsule-image` fires on each new `capsule_images` doc → runs Gemini 2.5 Flash → updates doc with `analysis` object and `status: "processed"`
- Processing is massively parallel — one function invocation per frame
- **All processing completes before the clinician ever opens the Viewer**

### Step 5: Ready for Review (ZoCW)
- Once upload + processing complete, procedure status → `ready_for_review`
- Clinician opens Viewer (SCR-10) for the procedure

### Step 6: Viewer (ZoCW — SCR-10)
- Viewer calls `getCapsuleFrames({ capsuleSerial })` Cloud Function once on mount
- Returns complete frame set + AI analysis results in a single response
- FrameViewer component renders frames with playback controls
- AI findings displayed in the findings panel with `AI_DETECTED` provenance

---

## 3. DATA LINKAGE MODEL

The capsule serial number is the single key that connects the physical capsule, the image pipeline, and the patient record.

```
Physical Capsule
    ↓ (scanned at check-in)
procedure.capsuleSerialNumber (ZoCW Firestore, cw-e7c19)
    ↓ (used as folder name at upload)
gs://podium-capsule-raw-images-test/{capsuleSerial}/*.jpg
    ↓ (extracted by log-capsule-image from folder path)
capsule_images.capsule_serial (Pipeline Firestore, podium-capsule-ingest)
    ↓ (queried by getCapsuleFrames callable)
Viewer screen (ZoCW React app)
```

### 3.1 Field Rename: `procedure_id` → `capsule_serial`

The deployed `log-capsule-image` function currently stores the folder name in a field called `procedure_id`. This is misleading because it contains the capsule serial number, not a ZoCW procedure ID.

**Action required (pipeline project):** Rename the field to `capsule_serial` in the Cloud Function code and redeploy. Migrate any existing test data. See HANDOFF.md Priority 1B.

Until the rename is complete, the `getCapsuleFrames` callable must query on `procedure_id` and map it to `capsule_serial` in the response.

---

## 4. DATA ACCESS PATTERN

### 4.1 Why Proxy Cloud Function (not Second Firebase App)

The `capsule_images` collection lives in the pipeline project's Firestore, not in `cw-e7c19`. Three options were evaluated:

| Approach | Real-time? | Frontend complexity | Infra complexity | Chosen? |
|----------|-----------|--------------------|-----------------|---------|
| Second Firebase app in frontend | Yes (onSnapshot) | High — two Firebase configs, two Firestore instances | Low | No |
| Mirror/sync to cw-e7c19 | Yes (onSnapshot on copy) | Low — single Firestore | High — sync function, double storage | No |
| **Proxy Cloud Function** | **No (single fetch)** | **Low — one callable** | **Low — one function, service account** | **Yes** |

**Rationale:** By the time a clinician opens the Viewer, all frames are indexed and all AI analysis is complete. The data is static at read time. A single bulk fetch is the right pattern — no real-time listeners needed.

### 4.2 `getCapsuleFrames` Cloud Function

**Deployed in:** `cw-e7c19` (ZoCW project)
**Type:** HTTPS Callable (Firebase Functions v2)
**Input:** `{ capsuleSerial: string }`
**Output:** `GetCapsuleFramesResponse` (see `src/types/capsule-image.ts`)

The function:
1. Authenticates the caller (must be logged in)
2. Validates the caller's role and practice scope
3. Initializes a Firestore client for the pipeline project using a service account
4. Queries `capsule_images` where `capsule_serial == input.capsuleSerial`, ordered by `filename` asc
5. Converts `gs://` URLs to signed HTTPS download URLs
6. Returns the complete frame set with AI analysis

### 4.3 Cross-Project Authentication

The `getCapsuleFrames` function in `cw-e7c19` needs to read from `podium-capsule-ingest` Firestore. This requires:

1. **Service account:** The `cw-e7c19` Cloud Functions service account must be granted `roles/datastore.user` on the `podium-capsule-ingest` project
2. **Firestore client initialization:** Use `initializeApp` with the pipeline project config and get a separate Firestore instance:
   ```typescript
   import { initializeApp, cert } from 'firebase-admin/app';
   import { getFirestore } from 'firebase-admin/firestore';

   const pipelineApp = initializeApp({
     projectId: 'podium-capsule-ingest',
   }, 'pipeline');

   const pipelineDb = getFirestore(pipelineApp);
   ```

### 4.4 URL Resolution

Frame images are stored in `podium-capsule-raw-images-test` bucket with `gs://` URLs. Browsers cannot load `gs://` URLs directly. The `getCapsuleFrames` function converts them to signed HTTPS URLs using the Cloud Storage SDK:

```typescript
import { getStorage } from 'firebase-admin/storage';

const bucket = getStorage(pipelineApp).bucket('podium-capsule-raw-images-test');

async function getSignedUrl(gsUrl: string): Promise<string> {
  const filePath = gsUrl.replace(`gs://podium-capsule-raw-images-test/`, '');
  const [url] = await bucket.file(filePath).getSignedUrl({
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  });
  return url;
}
```

**Alternative:** If CORS is configured on the bucket, the frontend can use `getDownloadURL` from the Firebase Storage SDK with a second Storage instance. However, the proxy approach keeps all cross-project logic server-side.

---

## 5. FIRESTORE SCHEMA (Pipeline Project)

### 5.1 `capsule_images` Collection

Each document represents one frame from a capsule endoscopy study.

| Field | Type | Description |
|-------|------|-------------|
| `capsule_serial` | string | Capsule serial number (= folder name in bucket). Currently named `procedure_id` — see Section 3.1. |
| `filename` | string | Frame filename (e.g., `frame_00001.jpg`) |
| `bucket` | string | Storage bucket name |
| `url` | string | `gs://` URL to the frame image |
| `status` | string | `"pending"` \| `"processed"` \| `"error"` |
| `analysis` | map | AI analysis result (present when `status === "processed"`) |

### 5.2 `analysis` Sub-Object

| Field | Type | Description |
|-------|------|-------------|
| `anomaly_detected` | boolean | Whether any anomaly was found |
| `primary_finding` | string \| null | CEST finding classification (31 possible values) |
| `anatomical_location` | string | CEST anatomical location (14 possible values) |
| `mucosal_view_quality` | string | View quality assessment |
| `confidence_score` | number | 0.0 to 1.0 |
| `secondary_findings` | array\<string\> | Additional findings |
| `bounding_box_suggestion` | string | Suggested bounding box |
| `clinical_notes` | string | AI-generated clinical notes |

### 5.3 Required Firestore Index

```bash
gcloud firestore indexes composite create \
  --project=podium-capsule-ingest \
  --collection-group=capsule_images \
  --field-config field-path=capsule_serial,order=ascending \
  --field-config field-path=filename,order=ascending
```

---

## 6. CORS CONFIGURATION (Pipeline Bucket)

Browsers will block the web app from downloading images unless CORS is configured on the Storage bucket.

### 6.1 `cors.json`

```json
[
  {
    "origin": [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://cw-e7c19.web.app",
      "https://cw-e7c19.firebaseapp.com"
    ],
    "method": ["GET", "HEAD", "OPTIONS"],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
```

### 6.2 Apply Command

```bash
gcloud storage buckets update gs://podium-capsule-raw-images-test \
  --project=podium-capsule-ingest \
  --cors-file=cors.json
```

**Note:** Add Firebase Studio preview domains when testing in that environment.

---

## 7. STORAGE LIFECYCLE (Pipeline Bucket)

Capsule runs generate GBs of data. Raw images are deleted after 90 days; the AI analysis data remains in Firestore indefinitely.

### 7.1 `lifecycle.json`

```json
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {"age": 90}
    }
  ]
}
```

### 7.2 Apply Command

```bash
gcloud storage buckets update gs://podium-capsule-raw-images-test \
  --project=podium-capsule-ingest \
  --lifecycle-file=lifecycle.json
```

---

## 8. SECURITY

### 8.1 Firestore Rules (Pipeline Project)

The `capsule_images` collection should be read-only for authenticated users and write-only for Cloud Functions:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /capsule_images/{document} {
      allow read: if request.auth != null;
      allow write: if false; // Only Cloud Functions can write
    }
  }
}
```

### 8.2 ZoCW Firestore Rules Addition

Add to `cw-e7c19` `firestore.rules` — no new collection needed since `capsule_images` lives in the pipeline project. The `getCapsuleFrames` callable validates auth and practice scope before querying.

### 8.3 IAM Requirements

| Principal | Role | Project | Purpose |
|-----------|------|---------|---------|
| `cw-e7c19` Cloud Functions service account | `roles/datastore.user` | `podium-capsule-ingest` | Read `capsule_images` collection |
| `cw-e7c19` Cloud Functions service account | `roles/storage.objectViewer` | `podium-capsule-ingest` | Generate signed URLs for frame images |
| Pipeline compute service account | `roles/storage.objectViewer` | `podium-capsule-ingest` | Read frame images for AI analysis |
| Pipeline compute service account | `roles/datastore.user` | `podium-capsule-ingest` | Write to `capsule_images` collection |
| Pipeline compute service account | `roles/aiplatform.user` | `podium-capsule-ingest` | Call Gemini 2.5 Flash |
| Pipeline compute service account | `roles/eventarc.eventReceiver` | `podium-capsule-ingest` | Receive Storage and Firestore triggers |

---

## 9. GCP API REQUIREMENTS (Pipeline Project)

These APIs must be enabled in `podium-capsule-ingest`:

- `storage-component.googleapis.com`
- `firestore.googleapis.com`
- `cloudfunctions.googleapis.com`
- `run.googleapis.com`
- `eventarc.googleapis.com`
- `aiplatform.googleapis.com`

---

## 10. BACKEND PIPELINE FUNCTIONS (Reference)

These functions are **already deployed and tested** in `podium-capsule-ingest`. Included here for reference.

### 10.1 `log-capsule-image` (Ingest Logger)

- **Trigger:** Storage object finalized in `podium-capsule-raw-images-test`
- **Memory:** 256MB | **Timeout:** 60s
- **Behavior:** Extracts folder name (capsule serial) and filename from the upload path. Creates a `capsule_images` doc with `capsule_serial`, `filename`, `bucket`, `url`, `status: "pending"`.
- **Folder path convention:** `{capsuleSerial}/{filename}` (e.g., `SN-48291-A/frame_00001.jpg`)

### 10.2 `analyze-capsule-image` (Medical AI Engine)

- **Trigger:** Firestore document created in `capsule_images`
- **Memory:** 512MB | **Timeout:** 120s
- **AI Region:** `us-central1` | **Model:** Gemini 2.5 Flash | **Temperature:** 0.0
- **Behavior:** Reads the frame image from Storage, sends to Gemini with CEST classification prompt, writes `analysis` result and `status: "processed"` back to the same doc.
- **Output:** `AIAnalysisResult` object (see `src/types/capsule-image.ts`)

---

## 11. WHAT CHANGED FROM THE GEMINI SPEC

The original PODIUM spec (v4.0.0) was written as a standalone architecture document. This section documents where ZoCW's integration diverges.

| Topic | Gemini Spec (PODIUM v4.0.0) | ZoCW Integration |
|-------|---------------------------|------------------|
| Folder naming | `[ProcedureID]_[YYYY-MM-DD]` | Capsule serial number only (e.g., `SN-48291-A`) |
| Linkage field | `procedure_id` | `capsule_serial` (rename pending — HANDOFF.md 1B) |
| Frontend data access | Direct Firestore `onSnapshot` from frontend | Proxy Cloud Function `getCapsuleFrames` (single bulk fetch) |
| Real-time updates | Assumed (onSnapshot for pending → processed) | Not needed — all frames processed before Viewer opens |
| Firebase project | Single project assumed | Two projects: `cw-e7c19` (app) + `podium-capsule-ingest` (pipeline) |
| URL resolution | Frontend Firebase Storage SDK | Server-side signed URLs in `getCapsuleFrames` response |
| CEST enums | TypeScript interfaces | String literal union types (expandable without code changes) |
| iOS support | Included in spec | Out of scope for ZoCW web app (future phase) |
| Human operator workflow | Manual folder creation in GCS console | Same, but folder name convention updated |

---

*This document is committed to the ZoCW repo and stays in sync via git. The pipeline project has its own deployment docs.*
