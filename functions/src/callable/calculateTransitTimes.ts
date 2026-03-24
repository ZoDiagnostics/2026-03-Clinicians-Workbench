/**
 * Calculate Transit Times Callable Function
 * HTTPS callable function for calculating anatomical landmark transit times.
 *
 * Analyzes findings to identify landmark frames and calculates transit times
 * between anatomical regions (GEJ, duodenum, jejunum, ileum, cecum, rectum).
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { calculateTransitTimesInputSchema } from '../utils/validators';
import { Finding } from '../finding';
import { TransitTimes } from '../procedure';

/**
 * Calculate transit times from findings
 *
 * Reads findings to identify landmark frames and calculates transit times
 * between key anatomical regions.
 *
 * Input: { procedureId: string }
 * Output: TransitTimes object with calculated times
 *
 * @callable
 * @auth requires clinician role
 *
 * @example
 * ```typescript
 * const result = await functions.httpsCallable('calculateTransitTimes')({
 *   procedureId: 'proc-123'
 * });
 * // Returns transit time measurements between landmarks
 * ```
 */
export const calculateTransitTimes = functions.https.onCall(async (data, context) => {
  const db = admin.firestore();

  try {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userRole = context.auth.token.role as string;

    // Validate authorization
    if (!userRole?.includes('clinician') && userRole !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only clinicians can calculate transit times'
      );
    }

    // Validate input
    const validInput = calculateTransitTimesInputSchema.parse(data);
    const { procedureId } = validInput;

    // Extract practice ID
    const practiceId = context.auth.token.practiceId as string;
    if (!practiceId) {
      throw new functions.https.HttpsError('permission-denied', 'User not associated with a practice');
    }

    // Fetch procedure
    const procedureDoc = await db
      .collection('practices')
      .doc(practiceId)
      .collection('procedures')
      .doc(procedureId)
      .get();

    if (!procedureDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Procedure not found');
    }

    // Fetch all findings
    const findingsSnapshot = await db
      .collection('practices')
      .doc(practiceId)
      .collection('procedures')
      .doc(procedureId)
      .collection('findings')
      .get();

    const findings: Finding[] = [];
    findingsSnapshot.forEach(doc => {
      findings.push(doc.data() as Finding);
    });

    // Calculate transit times
    const transitTimes = calculateTransitTimesFromFindings(findings);

    return {
      success: true,
      transitTimes,
      landmarksFound: countLandmarks(transitTimes),
    };
  } catch (error) {
    console.error('[TRANSIT] Error calculating transit times:', error);

    if (error instanceof Error && error.message.includes('Zod')) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid input parameters');
    }

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'Failed to calculate transit times');
  }
});

/**
 * Calculate transit times from findings
 *
 * Identifies anatomical landmark findings and extracts frame numbers/timestamps
 * to calculate transit times.
 *
 * @param findings - Array of findings
 * @returns TransitTimes object
 */
function calculateTransitTimesFromFindings(findings: Finding[]): TransitTimes {
  const transitTimes: TransitTimes = {};

  // Find landmark findings by classification
  const landmarkFindings = {
    esophagus: findings.filter(f => f.anatomicalRegion === 'esophagus'),
    stomach: findings.filter(f => f.anatomicalRegion === 'stomach'),
    duodenum: findings.filter(f => f.anatomicalRegion === 'duodenum'),
    jejunum: findings.filter(f => f.anatomicalRegion === 'jejunum'),
    ileum: findings.filter(f => f.anatomicalRegion === 'ileum'),
    cecum: findings.filter(f => f.anatomicalRegion === 'cecum'),
    colon: findings.filter(f => f.anatomicalRegion === 'colon'),
    rectum: findings.filter(f => f.anatomicalRegion === 'rectum'),
  };

  // Extract earliest frame for each landmark
  if (landmarkFindings.esophagus.length > 0) {
    const earliest = getEarliestFinding(landmarkFindings.esophagus);
    if (earliest) {
      transitTimes.esophagealEntryFrame = earliest.primaryFrameNumber;
      transitTimes.esophagealEntryTime = earliest.primaryFrameTimestamp;
    }
  }

  if (landmarkFindings.stomach.length > 0) {
    const earliest = getEarliestFinding(landmarkFindings.stomach);
    if (earliest) {
      transitTimes.gastricEntryFrame = earliest.primaryFrameNumber;
      transitTimes.gastricEntryTime = earliest.primaryFrameTimestamp;
    }
  }

  if (landmarkFindings.duodenum.length > 0) {
    const earliest = getEarliestFinding(landmarkFindings.duodenum);
    if (earliest) {
      transitTimes.duodenalEntryFrame = earliest.primaryFrameNumber;
      transitTimes.duodenalEntryTime = earliest.primaryFrameTimestamp;
    }
  }

  if (landmarkFindings.jejunum.length > 0) {
    const earliest = getEarliestFinding(landmarkFindings.jejunum);
    if (earliest) {
      transitTimes.jejunalEntryFrame = earliest.primaryFrameNumber;
      transitTimes.jejunalEntryTime = earliest.primaryFrameTimestamp;
    }
  }

  if (landmarkFindings.ileum.length > 0) {
    const earliest = getEarliestFinding(landmarkFindings.ileum);
    if (earliest) {
      transitTimes.ilealEntryFrame = earliest.primaryFrameNumber;
      transitTimes.ilealEntryTime = earliest.primaryFrameTimestamp;
    }
  }

  if (landmarkFindings.cecum.length > 0) {
    const earliest = getEarliestFinding(landmarkFindings.cecum);
    if (earliest) {
      transitTimes.cecalEntryFrame = earliest.primaryFrameNumber;
      transitTimes.cecalEntryTime = earliest.primaryFrameTimestamp;
    }
  }

  if (landmarkFindings.rectum.length > 0) {
    const earliest = getEarliestFinding(landmarkFindings.rectum);
    if (earliest) {
      transitTimes.rectalEntryFrame = earliest.primaryFrameNumber;
      transitTimes.rectalEntryTime = earliest.primaryFrameTimestamp;
    }
  }

  // Calculate small bowel transit time (jejunum to ileum entry)
  if (transitTimes.jejunalEntryTime !== undefined && transitTimes.ilealEntryTime !== undefined) {
    const transitSeconds = (transitTimes.ilealEntryTime - transitTimes.jejunalEntryTime) / 1000;
    transitTimes.smallBowelTransitSeconds = Math.max(0, transitSeconds);
  }

  return transitTimes;
}

/**
 * Get earliest finding by frame number
 *
 * Returns the finding with the lowest frame number (earliest in video).
 *
 * @param findings - Array of findings
 * @returns Earliest finding or null
 */
function getEarliestFinding(findings: Finding[]): Finding | null {
  if (findings.length === 0) {
    return null;
  }

  return findings.reduce((earliest, current) =>
    current.primaryFrameNumber < earliest.primaryFrameNumber ? current : earliest
  );
}

/**
 * Count how many landmarks were identified
 *
 * @param transitTimes - TransitTimes object
 * @returns Number of landmarks found
 */
function countLandmarks(transitTimes: TransitTimes): number {
  let count = 0;

  if (transitTimes.esophagealEntryFrame !== undefined) count++;
  if (transitTimes.gastricEntryFrame !== undefined) count++;
  if (transitTimes.gejFrame !== undefined) count++;
  if (transitTimes.duodenalEntryFrame !== undefined) count++;
  if (transitTimes.jejunalEntryFrame !== undefined) count++;
  if (transitTimes.ilealEntryFrame !== undefined) count++;
  if (transitTimes.cecalEntryFrame !== undefined) count++;
  if (transitTimes.rectalEntryFrame !== undefined) count++;

  return count;
}
