/**
 * Initiate Capsule Recall Callable Function
 * HTTPS callable function for managing capsule product recalls.
 *
 * Defined in ZCW-BRD-0292.
 * Queries procedures by capsule lot number, creates recall documents, and notifies clinicians.
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { dispatchRecallNoticeNotification } from '../utils/notificationDispatcher';
import { logAudit } from '../utils/auditLogger';
import { Procedure } from '../procedure';

/**
 * Input schema for capsule recall initiation
 */
const initiateCapsuleRecallInputSchema = z.object({
  lotNumber: z.string().min(6, 'Lot number too short').max(15, 'Lot number too long'),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500, 'Reason too long'),
  severity: z.enum(['urgent', 'routine'], {
    errorMap: () => ({ message: 'Severity must be urgent or routine' }),
  }),
});

type InitiateCapsuleRecallInput = z.infer<typeof initiateCapsuleRecallInputSchema>;

/**
 * Initiate a capsule product recall
 *
 * Queries all procedures with the matching capsule lot number. Creates a recall
 * document in practices/{practiceId}/capsuleRecalls/{recallId}. Updates affected
 * procedures with recall flag. Dispatches notifications to all affected clinicians.
 *
 * Input: { lotNumber, reason, severity: 'urgent' | 'routine' }
 * Output: { recallId, affectedProcedureCount, notifiedClinicians, message }
 *
 * @callable
 * @auth requires admin or clinician_admin role
 *
 * @example
 * ```typescript
 * const result = await functions.httpsCallable('initiateCapsuleRecall')({
 *   lotNumber: 'LOT2026001',
 *   reason: 'Defective battery detected in manufacturing batch',
 *   severity: 'urgent'
 * });
 * ```
 */
export const initiateCapsuleRecall = functions.https.onCall(async (data, context) => {
  const db = admin.firestore();

  try {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const userRole = context.auth.token.role as string;

    // Validate authorization
    if (userRole !== 'admin' && userRole !== 'clinician_admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins and clinician admins can initiate recalls'
      );
    }

    // Validate input
    const validInput = initiateCapsuleRecallInputSchema.parse(data);
    const { lotNumber, reason, severity } = validInput;

    // Extract practice ID from user claims
    const practiceId = context.auth.token.practiceId as string;
    if (!practiceId) {
      throw new functions.https.HttpsError('permission-denied', 'User not associated with a practice');
    }

    // Query all procedures with matching capsule lot number
    const proceduresSnapshot = await db
      .collection('practices')
      .doc(practiceId)
      .collection('procedures')
      .where('capsuleLotNumber', '==', lotNumber)
      .get();

    const affectedProcedures: Procedure[] = [];
    const affectedProcedureIds: string[] = [];
    const affectedClinicianIds = new Set<string>();

    proceduresSnapshot.forEach(doc => {
      const procedure = doc.data() as Procedure;
      affectedProcedures.push(procedure);
      affectedProcedureIds.push(doc.id);

      // Collect clinician IDs to notify
      if (procedure.assignedClinicianId) {
        affectedClinicianIds.add(procedure.assignedClinicianId);
      }
      if (procedure.coveringClinicianId) {
        affectedClinicianIds.add(procedure.coveringClinicianId);
      }
    });

    // Create recall document
    const recallId = randomUUID();
    const recallRef = db
      .collection('practices')
      .doc(practiceId)
      .collection('capsuleRecalls')
      .doc(recallId);

    const recallData = {
      id: recallId,
      practiceId,
      lotNumber,
      reason,
      severity,
      initiatedBy: userId,
      initiatedAt: admin.firestore.FieldValue.serverTimestamp(),
      affectedProcedureCount: affectedProcedureIds.length,
      affectedProcedureIds,
      notifiedClinicianIds: Array.from(affectedClinicianIds),
      status: 'active',
    };

    await recallRef.set(recallData);

    // Update all affected procedures with recall flag
    const batch = db.batch();
    affectedProcedureIds.forEach(procedureId => {
      const procedureRef = db
        .collection('practices')
        .doc(practiceId)
        .collection('procedures')
        .doc(procedureId);

      batch.update(procedureRef, {
        capsuleRecallId: recallId,
        isUnderRecall: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    // Dispatch notifications to all affected clinicians
    const notificationPromises: Promise<void>[] = [];
    affectedClinicianIds.forEach(clinicianId => {
      notificationPromises.push(
        dispatchRecallNoticeNotification(practiceId, clinicianId, lotNumber)
      );
    });

    await Promise.all(notificationPromises);

    // Log comprehensive audit entry
    await logAudit({
      practiceId,
      userId,
      action: 'capsule_recall_initiated',
      entityType: 'practice',
      entityId: practiceId,
      details: {
        recallId,
        lotNumber,
        reason,
        severity,
        affectedProcedureCount: affectedProcedureIds.length,
        affectedProcedureIds,
        notifiedClinicianCount: affectedClinicianIds.size,
      },
    });

    console.log(
      `[CAPSULE-RECALL] Recall initiated for lot ${lotNumber}. Affected: ${affectedProcedureIds.length} procedures, ${affectedClinicianIds.size} clinicians notified`
    );

    return {
      success: true,
      recallId,
      affectedProcedureCount: affectedProcedureIds.length,
      notifiedClinicians: Array.from(affectedClinicianIds),
      message: `Recall initiated for lot ${lotNumber}. ${affectedProcedureIds.length} procedure(s) marked under recall. ${affectedClinicianIds.size} clinician(s) notified.`,
    };
  } catch (error) {
    console.error('[CAPSULE-RECALL] Error:', error);

    if (error instanceof z.ZodError) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid input parameters');
    }

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'Failed to initiate capsule recall');
  }
});
