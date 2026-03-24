/**
 * Bulk Update Procedure Status Callable Function
 * HTTPS callable function for bulk updating procedure statuses with state machine validation.
 *
 * Defined in ZCW-BRD-0249.
 * Processes arrays of status updates with atomic batch writes and audit logging.
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { validateTransition, validateTransitionDetailed } from '../stateMachine';
import { logProcedureStatusChange } from '../utils/auditLogger';
import { Procedure } from '../procedure';
import { ProcedureStatus } from '../enums';

/**
 * Input schema for bulk status update
 */
const bulkUpdateStatusInputSchema = z.object({
  updates: z.array(
    z.object({
      procedureId: z.string().min(1, 'Procedure ID is required'),
      targetStatus: z.string().min(1, 'Target status is required'),
      reason: z.string().optional(),
    })
  ).min(1, 'At least one update is required'),
});

type BulkUpdateStatusInput = z.infer<typeof bulkUpdateStatusInputSchema>;

/**
 * Bulk update procedure statuses with state machine validation
 *
 * Accepts an array of procedure ID and target status pairs. Validates each
 * transition against the state machine. Uses Firestore batch writes for atomicity.
 * Logs audit entries for each successful transition.
 *
 * Input: { updates: Array<{ procedureId, targetStatus, reason? }> }
 * Output: { succeeded: number, failed: Array<{ procedureId, reason }> }
 *
 * @callable
 * @auth requires admin or clinician_admin role
 *
 * @example
 * ```typescript
 * const result = await functions.httpsCallable('bulkUpdateProcedureStatus')({
 *   updates: [
 *     { procedureId: 'proc-123', targetStatus: 'draft', reason: 'Video processing complete' },
 *     { procedureId: 'proc-456', targetStatus: 'completed', reason: 'Report signed' }
 *   ]
 * });
 * ```
 */
export const bulkUpdateProcedureStatus = functions.https.onCall(async (data, context) => {
  const db = admin.firestore();

  try {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const userRole = context.auth.token.role as string;

    // Validate authorization - requires admin or clinician_admin role
    if (userRole !== 'admin' && userRole !== 'clinician_admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins and clinician admins can bulk update procedure statuses'
      );
    }

    // Validate input
    const validInput = bulkUpdateStatusInputSchema.parse(data);
    const { updates } = validInput;

    // Extract practice ID from user claims
    const practiceId = context.auth.token.practiceId as string;
    if (!practiceId) {
      throw new functions.https.HttpsError('permission-denied', 'User not associated with a practice');
    }

    const succeeded: string[] = [];
    const failed: Array<{ procedureId: string; reason: string }> = [];

    // Prepare batch for atomic writes
    const batch = db.batch();
    const auditPromises: Promise<void>[] = [];

    // Validate all transitions first
    for (const update of updates) {
      try {
        // Fetch procedure to get current status
        const procedureDoc = await db
          .collection('practices')
          .doc(practiceId)
          .collection('procedures')
          .doc(update.procedureId)
          .get();

        if (!procedureDoc.exists) {
          failed.push({
            procedureId: update.procedureId,
            reason: 'Procedure not found',
          });
          continue;
        }

        const procedure = procedureDoc.data() as Procedure;
        const currentStatus = procedure.status as ProcedureStatus;
        const targetStatus = update.targetStatus as ProcedureStatus;

        // Validate state transition
        const transitionResult = validateTransitionDetailed(currentStatus, targetStatus);
        if (!transitionResult.valid) {
          failed.push({
            procedureId: update.procedureId,
            reason: transitionResult.error || 'Invalid state transition',
          });
          continue;
        }

        // Add to batch write
        const procedureRef = db
          .collection('practices')
          .doc(practiceId)
          .collection('procedures')
          .doc(update.procedureId);

        batch.update(procedureRef, {
          status: targetStatus,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: userId,
        });

        // Queue audit log
        auditPromises.push(
          logProcedureStatusChange(
            practiceId,
            update.procedureId,
            userId,
            currentStatus,
            targetStatus,
            update.reason
          )
        );

        succeeded.push(update.procedureId);
      } catch (error) {
        failed.push({
          procedureId: update.procedureId,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Commit batch
    if (succeeded.length > 0) {
      await batch.commit();
    }

    // Log all audit entries
    await Promise.all(auditPromises);

    console.log(`[BULK-STATUS-UPDATE] Succeeded: ${succeeded.length}, Failed: ${failed.length}`);

    return {
      success: true,
      succeeded: succeeded.length,
      failed,
      summary: `Successfully updated ${succeeded.length} procedure(s). ${failed.length} failed.`,
    };
  } catch (error) {
    console.error('[BULK-STATUS-UPDATE] Error:', error);

    if (error instanceof z.ZodError) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid input parameters');
    }

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'Failed to bulk update procedure statuses');
  }
});
