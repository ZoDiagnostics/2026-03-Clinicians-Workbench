/**
 * Transfer Review Callable Function
 * HTTPS callable function for clinician handoff and secure delegation.
 *
 * Defined in ZCW-BRD-0255, ZCW-BRD-0285.
 * Handles permanent transfer or temporary coverage assignment of procedures.
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { dispatchNotification } from '../utils/notificationDispatcher';
import { logAudit } from '../utils/auditLogger';
import { Procedure } from '../procedure';
import { NotificationType } from '../enums';

/**
 * Input schema for transfer review
 */
const transferReviewInputSchema = z.object({
  procedureId: z.string().min(1, 'Procedure ID is required'),
  targetClinicianId: z.string().min(1, 'Target clinician ID is required'),
  reason: z.string().min(1, 'Transfer reason is required').max(500, 'Reason too long'),
  transferType: z.enum(['permanent', 'coverage'], {
    errorMap: () => ({ message: 'Transfer type must be permanent or coverage' }),
  }),
});

type TransferReviewInput = z.infer<typeof transferReviewInputSchema>;

/**
 * Transfer procedure review to another clinician
 *
 * Validates requesting user is currently assigned or is admin. Updates the procedure's
 * assignedClinicianId (permanent) or coveringClinicianId (coverage). Creates audit log
 * entry and dispatches notification to target clinician.
 *
 * Input: { procedureId, targetClinicianId, reason, transferType: 'permanent' | 'coverage' }
 * Output: { success: boolean, procedure: Procedure, message: string }
 *
 * @callable
 * @auth requires clinician, clinician_admin, or admin role
 *
 * @example
 * ```typescript
 * const result = await functions.httpsCallable('transferReview')({
 *   procedureId: 'proc-123',
 *   targetClinicianId: 'clinician-456',
 *   reason: 'Handoff due to end of shift',
 *   transferType: 'coverage'
 * });
 * ```
 */
export const transferReview = functions.https.onCall(async (data, context) => {
  const db = admin.firestore();

  try {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const userRole = context.auth.token.role as string;

    // Validate authorization
    const clinicianRoles = ['clinician', 'clinician_admin', 'clinician_auth', 'clinician_noauth', 'admin'];
    if (!clinicianRoles.includes(userRole)) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only clinicians can transfer procedure reviews'
      );
    }

    // Validate input
    const validInput = transferReviewInputSchema.parse(data);
    const { procedureId, targetClinicianId, reason, transferType } = validInput;

    // Extract practice ID from user claims
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

    const procedure = procedureDoc.data() as Procedure;

    // Verify requesting user is assigned or admin
    if (userRole !== 'admin' && userRole !== 'clinician_admin') {
      if (userId !== procedure.assignedClinicianId && userId !== procedure.coveringClinicianId) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Only the assigned clinician can transfer this procedure'
        );
      }
    }

    // Verify target clinician exists in the same practice
    const targetClinicianDoc = await db.collection('users').doc(targetClinicianId).get();
    if (!targetClinicianDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Target clinician not found');
    }

    const targetClinicianData = targetClinicianDoc.data();
    if (targetClinicianData?.practiceId !== practiceId) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Target clinician must be in the same practice'
      );
    }

    // Update procedure with transfer
    const updateData: Record<string, any> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: userId,
    };

    if (transferType === 'permanent') {
      updateData.assignedClinicianId = targetClinicianId;
      // Clear any temporary covering clinician
      updateData.coveringClinicianId = null;
    } else {
      updateData.coveringClinicianId = targetClinicianId;
    }

    await db
      .collection('practices')
      .doc(practiceId)
      .collection('procedures')
      .doc(procedureId)
      .update(updateData);

    // Fetch updated procedure
    const updatedProcedureDoc = await db
      .collection('practices')
      .doc(practiceId)
      .collection('procedures')
      .doc(procedureId)
      .get();

    const updatedProcedure = updatedProcedureDoc.data() as Procedure;

    // Log audit entry
    await logAudit({
      practiceId,
      procedureId,
      userId,
      action: 'procedure_transfer',
      entityType: 'procedure',
      entityId: procedureId,
      details: {
        transferType,
        fromClinicianId: userId,
        toClinicianId: targetClinicianId,
        reason,
      },
      previousState: {
        assignedClinicianId: procedure.assignedClinicianId,
        coveringClinicianId: procedure.coveringClinicianId,
      },
      newState: {
        assignedClinicianId: updatedProcedure.assignedClinicianId,
        coveringClinicianId: updatedProcedure.coveringClinicianId,
      },
    });

    // Dispatch notification to target clinician
    const transferTypeLabel = transferType === 'permanent' ? 'Permanent' : 'Coverage';
    await dispatchNotification({
      practiceId,
      userId: targetClinicianId,
      type: NotificationType.TRANSFER_REQUEST,
      title: `${transferTypeLabel} Transfer Assigned`,
      body: `Procedure transferred: ${reason}`,
      routeTo: `/procedures/${procedureId}`,
      entityType: 'procedure',
      entityId: procedureId,
    });

    console.log(
      `[TRANSFER-REVIEW] ${transferTypeLabel} transfer of ${procedureId} to ${targetClinicianId}`
    );

    return {
      success: true,
      procedure: updatedProcedure,
      message: `Successfully transferred procedure to ${targetClinicianData.email || targetClinicianId}`,
    };
  } catch (error) {
    console.error('[TRANSFER-REVIEW] Error:', error);

    if (error instanceof z.ZodError) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid input parameters');
    }

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'Failed to transfer procedure review');
  }
});
