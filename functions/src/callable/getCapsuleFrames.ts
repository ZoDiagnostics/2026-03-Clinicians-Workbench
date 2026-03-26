/**
 * Get Capsule Frames Callable Function
 * HTTPS callable function that proxies cross-project Firestore reads
 * from the pipeline project (podium-capsule-ingest) into ZoCW.
 *
 * Returns all frame documents + AI analysis for a given capsule serial number,
 * with gs:// URLs converted to signed HTTPS URLs for browser rendering.
 *
 * Architecture: ZoCW (cw-e7c19) → getCapsuleFrames → podium-capsule-ingest Firestore
 *
 * @see docs/BUILD_09_GAP_ANALYSIS.md for field mapping
 * @see docs/BUILD_09_IMPLEMENTATION_PLAN.md Phase 2
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getCapsuleFramesInputSchema } from '../utils/validators';

// ============================================================================
// PIPELINE PROJECT CONFIGURATION
// ============================================================================

const PIPELINE_PROJECT_ID = 'podium-capsule-ingest';
const PIPELINE_BUCKET = 'podium-capsule-raw-images-test';

/** Signed URL expiry: 4 hours (long capsule reviews can take time) */
const SIGNED_URL_EXPIRY_MS = 4 * 60 * 60 * 1000;

/** Maximum frames to return in one call (safety limit) */
const MAX_FRAMES = 60000;

/** Batch size for parallel signed URL generation */
const SIGNED_URL_BATCH_SIZE = 50;

// ============================================================================
// PIPELINE FIRESTORE SINGLETON
// ============================================================================

/**
 * Get or create the secondary Firebase Admin app for the pipeline project.
 * Uses Application Default Credentials — requires IAM grants:
 *   - roles/datastore.user on podium-capsule-ingest (Firestore read)
 *   - roles/storage.objectViewer on podium-capsule-ingest (GCS signed URLs)
 */
function getPipelineApp() {
  const appName = 'pipeline';
  const existing = getApps().find(a => a.name === appName);
  if (existing) return existing;
  return initializeApp({ projectId: PIPELINE_PROJECT_ID }, appName);
}

function getPipelineDb() {
  return getFirestore(getPipelineApp());
}

function getPipelineBucket() {
  return getStorage(getPipelineApp()).bucket(PIPELINE_BUCKET);
}

// ============================================================================
// SIGNED URL GENERATION
// ============================================================================

/**
 * Convert a gs:// URL to a signed HTTPS URL for browser access.
 * Falls back to the original URL if signing fails (e.g., IAM not configured).
 */
async function toSignedUrl(
  bucket: ReturnType<typeof getPipelineBucket>,
  gsUrl: string
): Promise<string> {
  try {
    const filePath = gsUrl.replace(`gs://${PIPELINE_BUCKET}/`, '');
    const [url] = await bucket.file(filePath).getSignedUrl({
      action: 'read',
      expires: Date.now() + SIGNED_URL_EXPIRY_MS,
    });
    return url;
  } catch (err) {
    console.warn(`[getCapsuleFrames] Failed to sign URL: ${gsUrl}`, err);
    return gsUrl; // Return original gs:// URL as fallback
  }
}

/**
 * Generate signed URLs in parallel batches to avoid overwhelming the API.
 */
async function batchSignUrls(
  bucket: ReturnType<typeof getPipelineBucket>,
  frames: Array<{ url: string; [key: string]: any }>
): Promise<void> {
  for (let i = 0; i < frames.length; i += SIGNED_URL_BATCH_SIZE) {
    const batch = frames.slice(i, i + SIGNED_URL_BATCH_SIZE);
    const signedUrls = await Promise.all(
      batch.map(frame => toSignedUrl(bucket, frame.url))
    );
    batch.forEach((frame, idx) => {
      frame.url = signedUrls[idx];
    });
  }
}

// ============================================================================
// CALLABLE FUNCTION
// ============================================================================

/**
 * getCapsuleFrames — Fetch all frames + AI analysis for a capsule serial number.
 *
 * Input: { capsuleSerial: string }
 *   capsuleSerial = the capsule_id field in pipeline Firestore
 *                 = procedure.capsuleSerialNumber in ZoCW
 *
 * Returns: {
 *   totalFrames: number,
 *   analyzedFrames: number,
 *   anomalyFrames: number,
 *   capsuleSerial: string,
 *   frames: CapsuleImageDocument[]  (with signed HTTPS URLs)
 * }
 *
 * Auth: Requires authenticated user with a clinical or admin role.
 * Cross-project: Reads from podium-capsule-ingest Firestore using ADC.
 */
export const getCapsuleFrames = functions.https.onCall(async (data, context) => {
  try {
    // 1. Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to access capsule frames'
      );
    }

    // 2. Validate role (any clinical or admin role can view frames)
    const role = context.auth.token.role as string | undefined;
    const allowedRoles = [
      'clinician_auth',
      'clinician_noauth',
      'clinician_admin',
      'admin',
    ];
    if (!role || !allowedRoles.includes(role)) {
      throw new functions.https.HttpsError(
        'permission-denied',
        `Role '${role || 'none'}' is not authorized to view capsule frames`
      );
    }

    // 3. Validate input
    const parseResult = getCapsuleFramesInputSchema.safeParse(data);
    if (!parseResult.success) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Invalid input: ${parseResult.error.issues.map(i => i.message).join(', ')}`
      );
    }
    const { capsuleSerial } = parseResult.data;

    console.log(`[getCapsuleFrames] Fetching frames for capsule_id="${capsuleSerial}" by user=${context.auth.uid}`);

    // 4. Query pipeline Firestore for frames matching this capsule
    const pipelineDb = getPipelineDb();
    const snapshot = await pipelineDb
      .collection('capsule_images')
      .where('capsule_id', '==', capsuleSerial)
      .orderBy('filename', 'asc')
      .limit(MAX_FRAMES)
      .get();

    if (snapshot.empty) {
      console.log(`[getCapsuleFrames] No frames found for capsule_id="${capsuleSerial}"`);
      return {
        totalFrames: 0,
        analyzedFrames: 0,
        anomalyFrames: 0,
        capsuleSerial,
        frames: [],
      };
    }

    // 5. Extract frame data
    const frames = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        filename: d.filename || '',
        batch_id: d.batch_id || '',
        capsule_id: d.capsule_id || '',
        bucket: d.bucket || '',
        url: d.url || '',
        status: d.status || 'pending',
        created_at: d.created_at || null,
        analysis: d.analysis || null,
      };
    });

    // 6. Generate signed URLs for browser access
    const bucket = getPipelineBucket();
    await batchSignUrls(bucket, frames);

    // 7. Compute summary stats
    const analyzedFrames = frames.filter(f => f.status === 'processed').length;
    const anomalyFrames = frames.filter(f => f.analysis?.anomaly_detected === true).length;

    console.log(`[getCapsuleFrames] Returning ${frames.length} frames (${analyzedFrames} analyzed, ${anomalyFrames} anomalies)`);

    return {
      totalFrames: frames.length,
      analyzedFrames,
      anomalyFrames,
      capsuleSerial,
      frames,
    };

  } catch (error: any) {
    // Re-throw HttpsErrors as-is
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    // Wrap unexpected errors
    console.error('[getCapsuleFrames] Unexpected error:', error);
    throw new functions.https.HttpsError(
      'internal',
      'An unexpected error occurred while fetching capsule frames'
    );
  }
});
